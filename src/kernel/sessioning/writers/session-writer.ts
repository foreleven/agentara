import type { Message } from "@/shared";

/**
 * Interface for writing session messages to a sink (e.g. log, file).
 */
export interface SessionWriter {
  readonly sessionId: string;
  write(
    // eslint-disable-next-line no-unused-vars
    message: Message,
  ): void;
}
