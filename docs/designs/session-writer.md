# SessionWriter Design

SessionWriter is responsible for persisting session messages (logging + file). Session does not depend on it; SessionManager subscribes to Session events and delegates to writers.

---

## Dependencies

- `shared/messaging`: `Message`, `extractTextContent`, `isPureTextMessage`
- `shared/logging`: `createLogger`, `Logger`
- `shared/config/paths`: `resolveSessionFilePath`, `resolveDiaryFilePath`
- `node:fs`: `appendFile`, `existsSync`, `mkdirSync`, `writeFileSync`

---

## Architecture

- **Session**: Only emits `message` events. No logger, no writer.
- **SessionManager**: Creates Session, instantiates writers, subscribes `session.on("message", ...)`. Does not store Session; callback captures `sessionId` and writer, not Session — so Session can be GC'd when caller drops it. **Single** SessionDiaryFileWriter instance shared by all sessions.
- **SessionLogWriter**: Pino logging only.
- **SessionFileWriter**: Append messages to session `.jsonl` file (`sessions/{session_id}.jsonl`).
- **SessionDiaryFileWriter**: Append messages to daily diary `.md` file (`memory/diaries/{YYYY-MM-DD}.md`). Cross-session. Internal queue for sequential writes.

---

## SessionWriter Interface

```ts
export interface SessionWriter {
  readonly sessionId: string;
  write(message: AssistantMessage | SystemMessage | UserMessage): void;
}
```

---

## SessionLogWriter

Moves all logging logic from current Session (lines 49, 70–84).

- **Constructor**: `(readonly sessionId: string, options?: { logLevel?: string })`
- **logLevel**: Optional, default `"debug"`. Pino level.
- **write(message)**:
  - `user` (input): `USER: ${extractTextContent(message)}`
  - `assistant`: `ASSISTANT: ${extractTextContent(message, { includeToolUse: true, includeThinking: true })}`
  - `system`: `SYSTEM: ${message.subtype}`
  - `user` (tool result): `TOOL: ${extractTextContent(message, { includeToolUse: true })}`
  - else: `logger.info(message)`

---

## file-writer-utils

Shared logic for file-based writers. Export functions.

- `ensureFile(path)`, `append(path, content, onDone?)`, `formatFileLine(message)` — same format (`ROLE:\ntext`).
- Purpose: Reuse format + append logic for SessionFileWriter and SessionDiaryFileWriter.

---

## SessionFileWriter

Appends human-readable conversation to session `.md` file. Uses file-writer-utils.

- **Constructor**: `(readonly sessionId: string)`, creates the empty file immediately if it does not exist.
- **Path**: `config.paths.resolveSessionFilePath(sessionId)` — fixed per instance.
- **write(message)**: If `isPureTextMessage(message)`, append via file-writer-utils. Otherwise no-op.
- **Append**: Uses async `appendFile`. On failure: log error, continue (no throw). Separated by `\n\n`. Begins with `USER: ` or `ASSISTANT: `.

---

## SessionDiaryFileWriter

Writes to daily diary file. Cross-session. Does not implement SessionWriter (no `sessionId`).

- **Constructor**: `()`, no session binding.
- **Path**: `config.paths.resolveDiaryFilePath(date)` — `date` = server time when message arrives.
- **write(message)**: Accepts same message types. Enqueue `{ message, path }`; worker processes sequentially.
- **Queue**: Simple in-memory queue. One worker drains; ensures sequential append when multiple sessions write to the same day file.
- **Format**: Same as SessionFileWriter (formatFileLine). Optionally prefix with sessionId for traceability — TBD if needed.
- **Lifecycle**: Single instance in SessionManager. Created once, shared by all sessions.

---

## SessionManager Wiring

- **SessionDiaryFileWriter**: Single instance, created in constructor or lazily. Shared by all sessions.
- On `createSession` / `resumeSession`:

```ts
const session = new Session(sessionId, agentType, options);
...
this._attachWriter(session, sessionId); // log + file writer per session, + shared diary writer
...
return session;
```

- **Per-session**: SessionLogWriter, SessionFileWriter.
- **Shared**: SessionDiaryFileWriter — all sessions call `diaryWriter.write(message)`.
- Callback captures `writer` and `sessionId` (via writer), not `session`. SessionManager does not store `session` or `writer`.

---

## Error Handling

- **SessionLogWriter**: Pino rarely fails; no special handling.
- **SessionFileWriter** / **SessionDiaryFileWriter**: Append failure → log error, tolerate, continue. Queue continues processing.

---

## Concurrency / Constraints

- One SessionLogWriter + one SessionFileWriter per session, created at Session creation.
- One SessionDiaryFileWriter per SessionManager; shared by all sessions.
- SessionDiaryFileWriter: single-worker queue; sequential append to diary files.
- No caching. Single-writer append to file.
- SessionManager does not retain Session references; GC is safe.

---

## File Layout

```
src/kernel/sessioning/
├── session.ts
├── session-manager.ts
├── writers/
│   ├── session-writer.ts        # Interface
│   ├── file-writer-utils.ts  # ensureFile, append, formatFileLine
│   ├── session-log-writer.ts
│   ├── session-file-writer.ts
│   ├── session-diary-file-writer.ts
│   └── index.ts
```
