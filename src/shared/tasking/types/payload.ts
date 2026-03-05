import { z } from "zod";

import { UserMessage } from "../../messaging";

/**
 * Base fields shared by all task payloads.
 */
const BaseTaskPayload = z.object({
  /** The session this task belongs to. Used for per-session serial execution. */
  session_id: z.string(),
});

/**
 * Payload for an inbound user message task.
 */
export const InboundMessageTaskPayload = BaseTaskPayload.extend({
  type: z.literal("inbound_message"),
  message: UserMessage,
});
export interface InboundMessageTaskPayload extends z.infer<
  typeof InboundMessageTaskPayload
> {}

/**
 * Payload for a cron-scheduled instruction task.
 * The {@link session_id} doubles as the bunqueue scheduler ID for deduplication.
 */
export const CronjobTaskPayload = BaseTaskPayload.extend({
  type: z.literal("cronjob"),
  /** The instruction string sent to the agent. */
  instruction: z.string(),
  /** Cron expression, e.g. "0 3 * * *". */
  cron_pattern: z.string(),
});
export interface CronjobTaskPayload extends z.infer<
  typeof CronjobTaskPayload
> {}

/**
 * Discriminated union of all supported task payloads.
 */
export const TaskPayload = z.discriminatedUnion("type", [
  InboundMessageTaskPayload,
  CronjobTaskPayload,
]);
export type TaskPayload = InboundMessageTaskPayload | CronjobTaskPayload;
