---
project: Agentara
---

> All documents should be written in simple and concise English.

@docs/overview.md

## Notes

- Use `bun check` to type-check and lint your code after you finish writing.
- Always use `logger` or `createLogger` from `@/shared` for logging. Never use `console.log`/`console.error` directly.
- Always import from `@/shared` directly, not from sub-paths like `@/shared/messaging` or `@/shared/utils`. The barrel export covers everything.
  - For example, instead of `import { logger } from "@/shared/logging"`, use `import { logger } from "@/shared"`.
- Use `context7` when you're working with `bunqueue`.
- IMPORTANT: No more Korean, I'm Chinese!
