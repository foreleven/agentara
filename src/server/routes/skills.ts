import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { Hono } from "hono";

import { config, createLogger, type Skill } from "@/shared";

const logger = createLogger("skills-route");

/**
 * Parses a YAML frontmatter block from a markdown file's content.
 *
 * Uses Bun's built-in YAML parser to support full YAML 1.2 syntax including
 * multi-line values with `>` (folded) or `|` (literal).
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  const block = match?.[1];
  if (!block) return {};
  try {
    const parsed = Bun.YAML.parse(block) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") result[key] = value;
      else if (value != null) result[key] = String(value);
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Reads all skills from `config.paths.skills` (`$AGENTARA_HOME/.claude/skills/`).
 *
 * Each skill lives in its own subdirectory and exposes metadata via
 * a YAML frontmatter block in `SKILL.md`. Skills that cannot be read
 * or are missing a `SKILL.md` are silently skipped.
 */
async function readSkills(): Promise<Skill[]> {
  let entries: string[];
  try {
    entries = readdirSync(config.paths.skills);
  } catch {
    logger.debug(
      "Skills directory not found or unreadable, returning empty list",
    );
    return [];
  }

  const skills: { skill: Skill; mtime: number }[] = [];

  for (const entry of entries) {
    const entryPath = join(config.paths.skills, entry);
    try {
      if (!statSync(entryPath).isDirectory()) continue;
      const skillMdPath = join(entryPath, "SKILL.md");
      const mtime = statSync(skillMdPath).mtimeMs;
      const content = await Bun.file(skillMdPath).text();
      const fm = parseFrontmatter(content);
      if (!fm.name || !fm.description) {
        logger.warn(
          { slug: entry },
          "SKILL.md is missing required frontmatter fields, skipping",
        );
        continue;
      }
      skills.push({
        skill: {
          slug: entry,
          name: fm.name,
          description: fm.description,
          license: fm.license,
        },
        mtime,
      });
    } catch {
      logger.debug({ slug: entry }, "Failed to read skill, skipping");
    }
  }

  skills.sort((a, b) => b.mtime - a.mtime);
  return skills.map(({ skill }) => skill);
}

/**
 * Skills route group. Returns all installed Claude Code skills under GET /.
 */
export const skillsRoutes = new Hono().get("/", async (c) => {
  const skills = await readSkills();
  return c.json(skills);
});
