import type EventEmitter from "eventemitter3";

import type { AssistantMessage, UserMessage } from "./types";

export interface MessageChannelEventTypes {
  // eslint-disable-next-line no-unused-vars
  "message:inbound": (message: UserMessage) => void;
}

export interface MessageChannel extends EventEmitter {
  start(): Promise<void>;

  // eslint-disable-next-line no-unused-vars
  postMessage(message: Omit<AssistantMessage, "id">): Promise<AssistantMessage>;

  replyMessage(
    // eslint-disable-next-line no-unused-vars
    messageId: string,
    // eslint-disable-next-line no-unused-vars
    message: Omit<AssistantMessage, "id">,
    // eslint-disable-next-line no-unused-vars
    options?: { streaming?: boolean },
  ): Promise<AssistantMessage>;

  updateMessageContent(
    // eslint-disable-next-line no-unused-vars
    messageId: string,
    // eslint-disable-next-line no-unused-vars
    content: AssistantMessage["content"],
    // eslint-disable-next-line no-unused-vars
    options?: { streaming?: boolean },
  ): Promise<void>;
}
