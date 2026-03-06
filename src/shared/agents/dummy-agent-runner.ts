import {
  type AssistantMessage,
  type ToolMessage,
  type SystemMessage,
  type UserMessage,
  extractTextContent,
} from "../messaging";

import type { AgentRunner } from "./agent-runner";

/**
 * A dummy agent runner that do nothing but echo the user message.
 *
 * Used for testing purposes.
 */
export class DummyAgentRunner implements AgentRunner {
  readonly type = "dummy";

  async *stream(
    userMessage: UserMessage,
  ): AsyncIterableIterator<SystemMessage | AssistantMessage | ToolMessage> {
    await Bun.sleep(8500);
    yield {
      id: userMessage.id,
      session_id: userMessage.session_id,
      role: "assistant",
      content: [
        {
          type: "text",
          text: extractTextContent(userMessage),
        },
      ],
    };
  }
}
