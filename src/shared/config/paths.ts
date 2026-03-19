import { homedir } from "node:os";
import { join } from "node:path";

import dayjs from "dayjs";

export const user_home = homedir();
export const home = Bun.env.AGENTARA_HOME || join(user_home, ".agentara");

export const sessions = join(home, "sessions");
export function resolveSessionFilePath(session_id: string) {
  return join(sessions, `${session_id}.jsonl`);
}

export const memory = join(home, "memory");
export const logs = join(memory, "logs");
export function resolveDailyLogFilePath(date: Date) {
  const dateString = dayjs(date).format("YYYY-MM-DD");
  return join(logs, `${dateString}.md`);
}

export const workspace = join(home, "workspace");
export const projects = join(workspace, "projects");
export const uploads = join(workspace, "uploads");
export const outputs = join(workspace, "outputs");

export const data = join(home, "data");
export function resolveDataFilePath(filename: string) {
  return join(data, filename);
}

export const claude_home = join(home, ".claude");
export const skills = join(claude_home, "skills");

export const agents_home = join(home, ".agents");

/** Root directory that holds isolated sub-directories for each named agent. */
export const agents = join(home, "agents");

/** Allowed characters for an agent name: alphanumeric, hyphens, underscores. */
const SAFE_AGENT_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

/**
 * Returns the set of isolated paths for a named agent.
 *
 * For the `"default"` agent the paths are identical to the top-level paths
 * (backward-compatible). For every other agent the paths are scoped under
 * `$AGENTARA_HOME/agents/{name}/`.
 *
 * @throws {Error} if `agentName` contains path separators or other unsafe
 *   characters that could escape the `$AGENTARA_HOME/agents/` sandbox.
 */
export function resolveAgentPaths(agentName: string) {
  if (agentName !== "default" && !SAFE_AGENT_NAME_RE.test(agentName)) {
    throw new Error(
      `Invalid agent name "${agentName}": must match /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/ and must not contain path separators.`,
    );
  }
  if (agentName === "default") {
    return {
      /** The agent's home / working directory (where CLAUDE.md lives). */
      base: home,
      memory,
      workspace,
      projects,
      uploads,
      outputs,
      claude_home,
      skills,
    };
  }
  const base = join(agents, agentName);
  const agentMemory = join(base, "memory");
  const agentWorkspace = join(base, "workspace");
  const agentClaudeHome = join(base, ".claude");
  return {
    base,
    memory: agentMemory,
    workspace: agentWorkspace,
    projects: join(agentWorkspace, "projects"),
    uploads: join(agentWorkspace, "uploads"),
    outputs: join(agentWorkspace, "outputs"),
    claude_home: agentClaudeHome,
    skills: join(agentClaudeHome, "skills"),
  };
}
