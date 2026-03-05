import {
  extractTextContent,
  logger,
  type InboundMessageTaskPayload,
} from "@/shared";

import { SessionManager } from "./sessioning";
import { TaskDispatcher } from "./tasking";

/**
 * The kernel is the main entry point for the agentara application.
 * Lazy-creation singleton: the instance is created on first `getInstance()`.
 */
export class Kernel {
  private static _instance: Kernel | null = null;

  private _sessionManager!: SessionManager;
  private _taskDispatcher!: TaskDispatcher;

  static __internalInitialize() {
    if (Kernel._instance === null) {
      Kernel._instance = new Kernel();
    } else {
      throw new Error("Kernel already initialized");
    }
  }

  static getInstance(): Kernel {
    if (Kernel._instance === null) {
      throw new Error("Kernel not initialized");
    }
    return Kernel._instance;
  }

  private constructor() {
    this._initSessionManager();
    this._initTaskDispatcher();
  }

  get sessionManager(): SessionManager {
    return this._sessionManager;
  }

  get taskDispatcher(): TaskDispatcher {
    return this._taskDispatcher;
  }

  private _initSessionManager(): void {
    this._sessionManager = new SessionManager();
  }

  private _initTaskDispatcher(): void {
    // TODO: Add task dispatcher configuration
    this._taskDispatcher = new TaskDispatcher();
    this._taskDispatcher.route("inbound_message", this._inboundMessageHandler);
  }

  /**
   * Start the kernel.
   */
  async start(): Promise<void> {
    this._taskDispatcher.start();
  }

  private _inboundMessageHandler = async (
    payload: InboundMessageTaskPayload,
  ) => {
    const sessionId = payload.session_id;
    const session = await this._sessionManager.resolveSession(sessionId);
    const inboundMessage = payload.message;
    logger.info(
      {
        session_id: sessionId,
        inbound_message: extractTextContent(inboundMessage),
      },
      "inbound_message handler executing",
    );
    const outboundMessage = await session.run(inboundMessage);
    logger.info(
      {
        session_id: sessionId,
        inbound_message: extractTextContent(inboundMessage),
        outbound_message: extractTextContent(outboundMessage),
      },
      "inbound_message handler executed",
    );
  };
}
