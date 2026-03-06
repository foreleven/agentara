// import { ClaudeAgentRunner } from "@/community/anthropic";
import { DummyAgentRunner, type AgentRunner } from "@/shared";

/**
 * Creates an agent runner based on the agent type.
 * @param agentType The type of the agent.
 * @returns The agent runner.
 */
export function createAgentRunner(agentType: string): AgentRunner {
  switch (agentType) {
    case "claude":
      return new DummyAgentRunner();
    // return new ClaudeAgentRunner();
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}
