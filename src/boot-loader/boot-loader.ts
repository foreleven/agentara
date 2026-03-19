import { execSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { config, createLogger, reloadConfig } from "@/shared";

const logger = createLogger("boot-loader");

/**
 * The BootLoader is the main entry point for the agentara application
 */
class BootLoader {
  /**
   * Bootstraps the application by verifying the integrity and then igniting the kernel.
   */
  public async bootstrap(): Promise<void> {
    await this._verifyIntegrity();
    await this._igniteKernel();
  }

  private async _verifyIntegrity(): Promise<void> {
    if (!existsSync(config.paths.home)) {
      mkdirSync(config.paths.home, { recursive: true });
    }
    if (!existsSync(config.paths.workspace)) {
      mkdirSync(config.paths.workspace, { recursive: true });
    }
    if (!existsSync(config.paths.sessions)) {
      mkdirSync(config.paths.sessions, { recursive: true });
    }
    if (!existsSync(config.paths.data)) {
      mkdirSync(config.paths.data, { recursive: true });
    }
    if (!existsSync(config.paths.uploads)) {
      mkdirSync(config.paths.uploads, { recursive: true });
    }
    if (!existsSync(config.paths.outputs)) {
      mkdirSync(config.paths.outputs, { recursive: true });
    }

    if (!existsSync(config.paths.memory)) {
      mkdirSync(config.paths.memory, { recursive: true });
    }
    if (!existsSync(config.paths.claude_home)) {
      mkdirSync(config.paths.claude_home, { recursive: true });
    }
    if (!existsSync(join(config.paths.claude_home, "settings.json"))) {
      await downloadFile(
        "https://raw.githubusercontent.com/magiccube/agentara/main/user-home/.claude/settings.json",
        join(config.paths.claude_home, "settings.json"),
      );
    }
    if (!existsSync(join(config.paths.home, "CLAUDE.md"))) {
      await downloadFile(
        "https://raw.githubusercontent.com/magiccube/agentara/main/user-home/CLAUDE.md",
        join(config.paths.home, "CLAUDE.md"),
      );
    }
    if (!existsSync(config.paths.skills)) {
      await downloadSkills();
    }

    // Symlink .agents/skills → .claude/skills so the Codex CLI can also
    // read skills.  Only created once; subsequent boots see the existing link.
    this._ensureSkillsSymlink();

    const configPath = join(config.paths.home, "config.yaml");
    if (!existsSync(configPath)) {
      logger.info("config.yaml not found, generating default configuration...");
      const defaultTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
      const defaultConfig = `timezone: "${defaultTimezone}"

agents:
  default:
    type: claude
    model: claude-sonnet-4-6

tasking:
  max_retries: 1

messaging:
  default_channel_id: ""
  channels: []
`;
      writeFileSync(configPath, defaultConfig, "utf-8");
    }

    reloadConfig();

    if (!existsSync(config.paths.data)) {
      mkdirSync(config.paths.data, { recursive: true });
    }

    // Initialize isolated directories for every non-default agent defined in config.
    this._initAgentDirectories();
  }

  /**
   * Ensures isolated directories exist for all named agents that are not `"default"`.
   * For each such agent, creates `memory/`, `workspace/`, `.claude/skills` under
   * `$AGENTARA_HOME/agents/{name}/` and then symlinks
   * `agents/{name}/.agents/skills` → `agents/{name}/.claude/skills`
   * so the Codex CLI can discover skills via its native `.agents/skills` path.
   */
  private _initAgentDirectories(): void {
    for (const [agentName] of Object.entries(config.agents)) {
      if (agentName === "default") continue;
      const agentPaths = config.paths.resolveAgentPaths(agentName);
      const dirs = [
        agentPaths.base,
        agentPaths.memory,
        agentPaths.workspace,
        agentPaths.projects,
        agentPaths.uploads,
        agentPaths.outputs,
        agentPaths.claude_home,
        agentPaths.skills,
      ];
      for (const dir of dirs) {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }
      this._ensureAgentSkillsSymlink(agentPaths.base, agentPaths.skills);

      // Seed CLAUDE.md and .claude/settings.json via symlink from the global
      // home so runners can find instructions without the user having to
      // manually create per-agent files.  Users can replace the symlink with
      // their own file to customise per-agent behaviour.
      const globalClaudeMd = join(config.paths.home, "CLAUDE.md");
      const agentClaudeMd = join(agentPaths.base, "CLAUDE.md");
      if (!existsSync(agentClaudeMd) && existsSync(globalClaudeMd)) {
        symlinkSync(globalClaudeMd, agentClaudeMd);
      } else if (!existsSync(agentClaudeMd)) {
        logger.warn(
          `No CLAUDE.md found at ${globalClaudeMd}; agent "${agentName}" will run without instructions`,
        );
      }

      const globalSettings = join(config.paths.claude_home, "settings.json");
      const agentSettings = join(agentPaths.claude_home, "settings.json");
      if (!existsSync(agentSettings) && existsSync(globalSettings)) {
        symlinkSync(globalSettings, agentSettings);
      }

      logger.info(`Initialized directories for agent: ${agentName}`);
    }
  }

  /**
   * Creates `{agentBase}/.agents/skills` → `{skillsPath}` symlink so the
   * Codex CLI can discover per-agent skills via its native `.agents/skills`
   * directory.  The link is only created once; if it already exists no action
   * is taken.
   */
  private _ensureAgentSkillsSymlink(
    agentBase: string,
    skillsPath: string,
  ): void {
    const agentsDotDir = join(agentBase, ".agents");
    const linkPath = join(agentsDotDir, "skills");
    try {
      try {
        lstatSync(linkPath);
        return;
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") {
          throw e;
        }
        // Path truly does not exist; fall through to create it.
      }
      mkdirSync(agentsDotDir, { recursive: true });
      symlinkSync(skillsPath, linkPath, "dir");
      logger.info(
        `Created symlink ${agentBase}/.agents/skills → ${agentBase}/.claude/skills`,
      );
    } catch (err) {
      logger.warn({ err }, `Failed to create .agents/skills symlink for ${agentBase}`);
    }
  }

  /**
   * Creates a symlink at `.agents/skills` → `.claude/skills` so the Codex
   * CLI can discover skills via its native directory.  The link is only
   * created once; if it already exists no action is taken.
   */
  private _ensureSkillsSymlink(): void {
    const linkPath = join(config.paths.agents_home, "skills");
    try {
      try {
        lstatSync(linkPath);
        return;
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") {
          throw e;
        }
        // Path truly does not exist; fall through to create it.
      }
      mkdirSync(config.paths.agents_home, { recursive: true });
      symlinkSync(config.paths.skills, linkPath, "dir");
      logger.info("Created symlink .agents/skills → .claude/skills");
    } catch (err) {
      logger.warn({ err }, "Failed to create .agents/skills symlink");
    }
  }

  private async _igniteKernel(): Promise<void> {
    const { kernel } = await import("@/kernel");
    const logo = `\n▗▄▖  ▗▄▄▖▗▄▄▄▖▗▖  ▗▖▗▄▄▄▖▗▄▖ ▗▄▄▖  ▗▄▖
▐▌ ▐▌▐▌   ▐▌   ▐▛▚▖▐▌  █ ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌
▐▛▀▜▌▐▌▝▜▌▐▛▀▀▘▐▌ ▝▜▌  █ ▐▛▀▜▌▐▛▀▚▖▐▛▀▜▌
▐▌ ▐▌▝▚▄▞▘▐▙▄▄▖▐▌  ▐▌  █ ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌`;
    console.info(
      "\x1b[31m" +
        logo +
        "\x1b[0m" +
        "\n\nCopyright (c) 2026 Agentara. All rights reserved.\nVisit https://github.com/agentara/agentara for more information.\n\n",
    );
    await kernel.start();
    logger.info("🚀 Agentara is now running...");
  }
}

async function downloadFile(url: string, path: string): Promise<void> {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  writeFileSync(path, Buffer.from(data));
}

async function downloadSkills(): Promise<void> {
  mkdirSync(config.paths.skills, { recursive: true });
  const tempDir = mkdtempSync("agentara-github-repo-");
  execSync(
    `git clone --depth 1 --filter=blob:none --sparse https://github.com/magiccube/agentara.git ${tempDir}`,
  );
  execSync(`cd ${tempDir} && git sparse-checkout set user-home/.claude/skills`);
  execSync(`cp -r user-home/.claude/skills/* ~/.agentara/.claude/skills/`);
  execSync(`rm -rf ${tempDir}`);
}

export const bootLoader = new BootLoader();
