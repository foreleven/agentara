import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { config } from "@/shared";

const { paths } = config;

describe("config.paths", () => {
  test("sessions directory is under home", () => {
    expect(paths.sessions).toBe(join(paths.home, "sessions"));
  });

  test("memory directory is under home", () => {
    expect(paths.memory).toBe(join(paths.home, "memory"));
  });

  test("logs directory is under memory", () => {
    expect(paths.logs).toBe(join(paths.memory, "logs"));
  });

  test("workspace directory is under home", () => {
    expect(paths.workspace).toBe(join(paths.home, "workspace"));
  });

  test("data directory is under home", () => {
    expect(paths.data).toBe(join(paths.home, "data"));
  });

  test("resolveSessionFilePath returns correct path", () => {
    const result = paths.resolveSessionFilePath("abc-123");
    expect(result).toBe(join(paths.sessions, "abc-123.jsonl"));
  });

  test("resolveDailyLogFilePath returns date-formatted path", () => {
    const date = new Date("2025-06-15T12:00:00Z");
    const result = paths.resolveDailyLogFilePath(date);
    expect(result).toMatch(/2025-06-15\.md$/);
    expect(result.startsWith(paths.logs)).toBe(true);
  });

  test("resolveDataFilePath returns correct path", () => {
    const result = paths.resolveDataFilePath("db.sqlite");
    expect(result).toBe(join(paths.data, "db.sqlite"));
  });
});

describe("config.paths.resolveAgentPaths", () => {
  test("default agent paths point to global home paths", () => {
    const agentPaths = paths.resolveAgentPaths("default");
    expect(agentPaths.base).toBe(paths.home);
    expect(agentPaths.memory).toBe(paths.memory);
    expect(agentPaths.workspace).toBe(paths.workspace);
    expect(agentPaths.projects).toBe(paths.projects);
    expect(agentPaths.uploads).toBe(paths.uploads);
    expect(agentPaths.outputs).toBe(paths.outputs);
    expect(agentPaths.claude_home).toBe(paths.claude_home);
    expect(agentPaths.skills).toBe(paths.skills);
  });

  test("named agent paths are isolated under agents/{name}/", () => {
    const agentPaths = paths.resolveAgentPaths("myagent");
    const expectedBase = join(paths.agents, "myagent");
    expect(agentPaths.base).toBe(expectedBase);
    expect(agentPaths.memory).toBe(join(expectedBase, "memory"));
    expect(agentPaths.workspace).toBe(join(expectedBase, "workspace"));
    expect(agentPaths.projects).toBe(
      join(expectedBase, "workspace", "projects"),
    );
    expect(agentPaths.uploads).toBe(
      join(expectedBase, "workspace", "uploads"),
    );
    expect(agentPaths.outputs).toBe(
      join(expectedBase, "workspace", "outputs"),
    );
    expect(agentPaths.claude_home).toBe(join(expectedBase, ".claude"));
    expect(agentPaths.skills).toBe(join(expectedBase, ".claude", "skills"));
  });

  test("different named agents have distinct paths", () => {
    const pathsA = paths.resolveAgentPaths("agent-a");
    const pathsB = paths.resolveAgentPaths("agent-b");
    expect(pathsA.base).not.toBe(pathsB.base);
    expect(pathsA.memory).not.toBe(pathsB.memory);
    expect(pathsA.workspace).not.toBe(pathsB.workspace);
    expect(pathsA.skills).not.toBe(pathsB.skills);
  });

  test("agents directory is under home", () => {
    expect(paths.agents).toBe(join(paths.home, "agents"));
  });

  test("rejects agent name with path separator", () => {
    expect(() => paths.resolveAgentPaths("../etc/passwd")).toThrow(
      /Invalid agent name/,
    );
    expect(() => paths.resolveAgentPaths("foo/bar")).toThrow(
      /Invalid agent name/,
    );
    expect(() => paths.resolveAgentPaths("foo\\bar")).toThrow(
      /Invalid agent name/,
    );
  });

  test("rejects agent name starting with special character", () => {
    expect(() => paths.resolveAgentPaths("-foo")).toThrow(/Invalid agent name/);
    expect(() => paths.resolveAgentPaths("_foo")).toThrow(/Invalid agent name/);
  });

  test("accepts valid agent names", () => {
    expect(() => paths.resolveAgentPaths("myagent")).not.toThrow();
    expect(() => paths.resolveAgentPaths("my-agent")).not.toThrow();
    expect(() => paths.resolveAgentPaths("my_agent")).not.toThrow();
    expect(() => paths.resolveAgentPaths("agent123")).not.toThrow();
    expect(() => paths.resolveAgentPaths("A1")).not.toThrow();
  });
});
