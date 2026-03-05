# Messages Design (shared/messaging)

## Overview

Message types, content blocks, roles, and tools live in `shared/messaging`. All layers (kernel, community) depend on these definitions. Schema-first: Zod schemas with derived TypeScript interfaces.

## Structure

```
src/shared/messaging/
├── types/
│   ├── message.ts   # Message, SystemMessage, UserMessage, AssistantMessage
│   ├── roles.ts     # MessageRole
│   ├── contents.ts  # Text, thinking, image_url, tool_use, tool_result
│   └── tools.ts     # Named tool schemas (Bash, Read, Write, etc.)
├── utils/
│   └── index.ts     # extractTextContent
└── index.ts
```

## Message Types

| Message        | role     | subtype | content                                                |
|----------------|----------|---------|--------------------------------------------------------|
| SystemMessage  | `system` | `init`  | —                                                      |
| UserMessage    | `user`   | —       | text, image_url, tool_result                           |
| AssistantMessage | `assistant` | — | text, thinking, image_url, tool_use                    |

All messages share `id` and `session_id`.

## Content Blocks

- **text**: `{ type: "text", text: string }`
- **thinking**: `{ type: "thinking", thinking: string, signature: string }`
- **image_url**: `{ type: "image_url", image_url: string }`
- **tool_use**: `{ type: "tool_use", name, id, input }`
- **tool_result**: `{ type: "tool_result", tool_use_id, content }`

## Tools (`types/tools.ts`)

Named tool schemas extend `ToolUseMessageContent` with typed `input`. Examples: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Skill, Task, ToolSearch.

MCP tools use naming `{server}__{tool}` and are matched via regex; unknown tools fall back to generic `ToolUseMessageContent`.

## Utils

- **extractTextContent(message, options?)**: Very useful when logging messages. Concatenates human-readable text from a message. Options: `includeToolUse`, `includeThinking`. Used for diary/log output.

## Conventions

- Zod-first, lowercase_with_underscore for fields
- Discriminated unions by `role` (message) and `type` (content)
- Exported schemas and interfaces for all public types
