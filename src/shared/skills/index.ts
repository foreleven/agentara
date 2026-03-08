import { z } from "zod";

/**
 * Represents a Claude Code skill installed under `~/.claude/skills/`.
 *
 * Each skill lives in its own subdirectory and declares its metadata
 * via a YAML frontmatter block at the top of `SKILL.md`.
 */
export const Skill = z.object({
  /** Directory name, used as the unique identifier (e.g. `"frontend-design"`). */
  slug: z.string(),
  /** Human-readable skill name from the frontmatter `name` field. */
  name: z.string(),
  /** Short description of what the skill does. */
  description: z.string(),
  /** Optional license string from the frontmatter `license` field. */
  license: z.string().optional(),
});
export interface Skill extends z.infer<typeof Skill> {}
