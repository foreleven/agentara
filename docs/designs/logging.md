# Logging Design (Pino + pino-pretty)

## Overview

Use Pino as the sole logging library, with pino-pretty for human-readable output in development. Support both a default topic logger and custom topic loggers via child loggers.

## API

```ts
// Default logger with topic "agentara"
import { logger } from "@/shared/logging";
logger.info("hello");

// Custom topic via child logger
import { createLogger } from "@/shared/logging";
const logger = createLogger(`session-${sessionId}`);
logger.info("message received");
```

## Design

### Root Logger

- Single Pino instance, created at module load
- Level: from `AGENTARA_LOG_LEVEL` env (default: `"info"`). Valid: `trace` | `debug` | `info` | `warn` | `error`
- Destination: `process.stdout` (JSON in prod; pretty via transport in dev)

### Pretty Output (pino-pretty)

- Use `pino.transport({ target: "pino-pretty", options })` when `NODE_ENV !== "production"`
- Options: `colorize: true`, `translateTime: "SYS:HH:MM:ss"` (dev) / `"SYS:MM-DD HH:MM:ss"` (prod-style), `ignore: "hostname,pid,topic"`
- Output format:
  - `topic === "agentara"`: `[HH:MM:ss] INFO: ${content}`
  - Other topics: `[HH:MM:ss] INFO (${topic}): ${content}`
- Timezone: follows `TZ` env (e.g. `TZ=Asia/Shanghai` for UTC+8)
- Production: raw NDJSON to stdout (no pino-pretty)

### Topic Binding

- Binding key: `topic` (string)
- Default logger: `rootLogger.child({ topic: "agentara" })` — no topic shown in pretty output
- `createLogger(topic: string)`: returns `rootLogger.child({ topic, ...(topic !== "agentara" && { name: topic }) })` — `name` used by pino-pretty for `(${topic})` display
- Child loggers are cheap; create per-session without caching if needed

### File Layout

```
src/shared/logging/
├── index.ts     # exports: logger, createLogger
└── (internal)   # root logger creation, transport config
```

## Implementation Notes

1. **Single root**: One `pino()` call; all loggers are its children
2. **No logger instance caching**: `createLogger(sessionId)` creates a fresh child each call; pino child creation is fast
3. **Optional caching**: If many logs per session, callers may cache `createLogger(id)` themselves
4. **Type**: Export pino's `Logger` type for `createLogger` return type
