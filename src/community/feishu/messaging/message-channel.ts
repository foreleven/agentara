import { Client, EventDispatcher, WSClient } from "@larksuiteoapi/node-sdk";
import EventEmitter from "eventemitter3";

import type { Logger, TextMessageContent } from "@/shared";
import {
  createLogger,
  uuid,
  type AssistantMessage,
  type MessageChannel,
  type MessageChannelEventTypes,
  type UserMessage,
} from "@/shared";

import { renderMessageCard } from "./message-renderer";
import type { MessageReceiveEventData } from "./types";

export class FeishuMessageChannel
  extends EventEmitter<MessageChannelEventTypes>
  implements MessageChannel
{
  private _inboundClient: WSClient;
  private _outboundClient: Client;
  private _logger: Logger;

  constructor(
    readonly config = {
      feishuAppId: Bun.env.FEISHU_APP_ID!,
      feishuAppSecret: Bun.env.FEISHU_APP_SECRET!,
    },
  ) {
    super();
    if (!config.feishuAppId || !config.feishuAppSecret) {
      throw new Error("Feishu app ID and secret are required");
    }
    this._logger = createLogger("feishu-message-channel");
    this._inboundClient = new WSClient({
      appId: this.config.feishuAppId,
      appSecret: this.config.feishuAppSecret,
    });
    this._outboundClient = new Client({
      appId: this.config.feishuAppId,
      appSecret: this.config.feishuAppSecret,
    });
  }

  async start() {
    await this._inboundClient.start({
      eventDispatcher: new EventDispatcher({}).register({
        "im.message.receive_v1": this._handleMessageReceive,
      }),
    });
  }

  async replyMessage(
    messageId: string,
    message: Omit<AssistantMessage, "id">,
    { streaming = true }: { streaming?: boolean } = {},
  ): Promise<AssistantMessage> {
    const card = renderMessageCard(message.content, {
      streaming,
    });
    const { data: replyMessage } = await this._outboundClient.im.message.reply({
      path: {
        message_id: messageId,
      },
      data: {
        msg_type: "interactive",
        content: JSON.stringify(card),
      },
    });
    if (!replyMessage) {
      throw new Error("Failed to reply message");
    }
    const assistantMessage = message as AssistantMessage;
    assistantMessage.id = replyMessage.message_id!;
    return assistantMessage;
  }

  postMessage(
    // eslint-disable-next-line no-unused-vars
    message: Omit<AssistantMessage, "id">,
  ): Promise<AssistantMessage> {
    throw new Error("Not implemented");
  }

  async updateMessageContent(
    messageId: string,
    content: AssistantMessage["content"],
    { streaming = true }: { streaming?: boolean } = {},
  ): Promise<void> {
    const card = renderMessageCard(content, {
      streaming,
    });
    await this._outboundClient.im.message.patch({
      path: {
        message_id: messageId,
      },
      data: {
        content: JSON.stringify(card),
      },
    });
  }

  private _handleMessageReceive = async ({
    message: receivedMessage,
  }: MessageReceiveEventData) => {
    const {
      message_id: messageId,
      // chat_id: chatId,
      thread_id: threadId,
    } = receivedMessage;
    const session_id = this._resolveSessionIdFromThread(threadId);
    const userMessage: UserMessage = {
      id: messageId,
      session_id,
      role: "user",
      content: [
        this._parseMessageContent(
          receivedMessage.message_type,
          receivedMessage.content,
        ),
      ],
    };
    this.emit("message:inbound", userMessage);
  };

  private _threadIdToSessionId = new Map<string, string>();
  private _resolveSessionIdFromThread(threadId: string | undefined): string {
    if (threadId && this._threadIdToSessionId.has(threadId)) {
      return this._threadIdToSessionId.get(threadId)!;
    }
    // Distribute a new session_id
    return uuid();
  }

  private _parseMessageContent(
    type: string,
    content: string,
  ): TextMessageContent {
    const json = JSON.parse(content);
    if (type === "text") {
      return {
        type: "text",
        text: json.text,
      };
    } else {
      this._logger.error(`Unsupported message type: ${type}`);
      return { type: "text", text: "Unsupported message type" + type };
    }
  }
}
