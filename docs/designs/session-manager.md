# SessionManager Design

SessionManager creates or resumes `Session` instances and maintains session `.md` files. No concurrency. No caching.

## Dependencies

- `import { config } from "@/shared"`
- Session file path: `config.paths.resolveSessionFilePath(session_id)` → `$AGENTARA_HOME/sessions/{session_id}.md`

## API

### existsSession(sessionId: string): boolean

Returns whether a session with the given id exists (session file exists).

### resolveSession(sessionId: string, options?: SessionResolveOptions): Promise<Session>

Resolves session by file existence:

1. Path = `config.paths.resolveSessionFilePath(sessionId)`
2. If **file exists** → `resumeSession(sessionId, options?)`
3. If **file does not exist** → `createSession(sessionId?, options?)`

Returns a `Session` instance. Do not cache the session instance, since it is lite enough to be created on demand.

### createSession(sessionId?: string, options?: SessionResolveOptions): Promise<Session>

1. Path = `config.paths.resolveSessionFilePath(sessionId)`
2. If file **already exists** → throw `SessionAlreadyExistsError`
3. Create empty file at path
4. Return `Session` with `isNewSession: true`

### resumeSession(sessionId: string, options?: SessionResolveOptions): Promise<Session>

1. Path = `config.paths.resolveSessionFilePath(sessionId)`
2. If file **does not exist** → throw `SessionNotFoundError`
3. Return `Session` with `isNewSession: false`

## SessionResolveOptions

Supply `agentType` and `cwd` for Session construction. Defaults from config where applicable (`config.agents.default.type`, `config.paths.home`).

## Error Handling

- Strict: throw on invalid states. No graceful fallback.
- `createSession` on existing file → `SessionAlreadyExistsError`
- `resumeSession` on missing file → `SessionNotFoundError`

## Concurrency

**Must not** allow concurrent operations on the same session. Design requires single-writer / single-session lifecycle (callers must ensure).
