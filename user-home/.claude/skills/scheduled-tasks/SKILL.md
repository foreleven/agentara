---
name: scheduled-tasks
description: >
  Manage Agentara scheduled tasks (cronjobs). Use when the user wants to
  create, list, update, or delete recurring scheduled tasks — triggered by
  phrases like "add a cronjob", "schedule a task", "remind me to do something after 10 minutes", "list my scheduled tasks",
  "remove cronjob", "update the schedule", etc.

---

## Overview

This skill manages Agentara scheduled tasks via the REST API at `http://localhost:1984/api/cronjobs`.

A scheduled task has two parts:

- **What**: an `instruction` (natural language prompt sent to the agent)
- **When**: a `schedule` object with one of `at`/`delay` (one-shot) or `pattern`/`every` (recurring), plus optional `limit` and `immediately`

### session_id: contextual vs independent

- **Independent** (default): omit `session_id`. Each trigger creates a new session — the agent has no memory of previous runs. Suitable for most cronjobs.
- **Contextual**: pass a fixed `session_id` (generate one via `python3 -c "import uuid; print(uuid.uuid4())"`). All triggers share the same conversation session — the agent can reference previous runs. Use this only when continuity matters (e.g. daily standup that tracks progress over time).

---

## Workflow

### Step 1: Understand intent

Ask or infer what the user wants:

| Intent                                        | Action                      |
| --------------------------------------------- | --------------------------- |
| "list cronjobs" / "show scheduled tasks"      | **List**                    |
| "add a cronjob" / "schedule a task every ..." | **Create**                  |
| "update cronjob" / "change schedule to ..."   | **Update** (upsert by `id`) |
| "delete cronjob" / "remove scheduled task"    | **Delete**                  |

### Step 2: Determine whether session_id is needed

Ask yourself: does this task need to remember context across triggers?

- "Summarize today's news" → **No**. Each run is self-contained. Omit `session_id`.
- "Check project progress and compare with yesterday" → **Yes**. The agent needs prior context. Generate a fixed `session_id`.

If unsure, ask the user: "Should each trigger run independently, or do you need them to share conversation history?"

### Step 3: Execute

Use `Bash` to run `curl` commands against the API. All examples below use `localhost:1984`.

> **IMPORTANT**: Never pipe write operations (POST/PUT/DELETE) through `jq`. If `jq` fails to parse the response, the `curl` request has still been sent and executed server-side. Retrying the command will create duplicates or cause unintended side effects. Only use `| jq .` for read operations (GET). For write operations, output the raw response directly.

---

## API Reference

### List all scheduled tasks

```bash
curl -s http://localhost:1984/api/cronjobs | jq .
```

> `jq` is safe here because GET is read-only. Never use `| jq .` on POST/PUT/DELETE commands.

### Create — independent (no session_id)

Most common case. Each trigger starts a fresh session.

**Cron pattern** (every day at 9 AM):

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Summarize today'\''s top tech news",
    "schedule": { "pattern": "0 9 * * *" }
  }'
```

**Interval** (every 30 minutes):

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Check all services are healthy",
    "schedule": { "every": 1800000 }
  }'
```

**Cron + limit** (every Friday 6 PM, max 10 times):

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Generate weekly project report",
    "schedule": { "pattern": "0 18 * * 5", "limit": 10 }
  }'
```

**Interval + immediately** (every hour, first run right now):

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Sync upstream repository changes",
    "schedule": { "every": 3600000, "immediately": true }
  }'
```

**Delay** (one-shot after 10 minutes):

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Remind me to review the report",
    "schedule": { "delay": 600000 }
  }'
```

**All schedule options** (cron + interval + limit + immediately):

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Run full regression test suite",
    "schedule": {
      "pattern": "0 2 * * *",
      "every": 86400000,
      "limit": 30,
      "immediately": true
    }
  }'
```

### Create — contextual (with session_id)

First generate a UUID:

```bash
SESSION_ID=$(python3 -c "import uuid; print(uuid.uuid4())")
```

Then pass it. All triggers will share this session's conversation history:

```bash
curl -s -X POST http://localhost:1984/api/cronjobs \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"instruction\": \"Check project progress, compare with yesterday, and flag blockers\",
    \"schedule\": { \"pattern\": \"0 9 * * 1-5\" }
  }"
```

### Update a scheduled task

PUT with the scheduler ID in the path. Omit `session_id` to keep existing; pass `null` for independent mode or a UUID for contextual.

```bash
curl -s -X PUT http://localhost:1984/api/cronjobs/<scheduled-task-id> \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Updated instruction here",
    "schedule": { "pattern": "0 8 * * *" }
  }'
```

### Delete a scheduled task

```bash
curl -s -X DELETE http://localhost:1984/api/cronjobs/<scheduled-task-id>
```

---

## Schedule field reference

| Field         | Type    | Required                 | Description                                                  |
| ------------- | ------- | ------------------------ | ------------------------------------------------------------ |
| `at`          | number  | one of at/delay/pattern/every | Epoch ms for one-shot at a specific time                 |
| `delay`       | number  | one of at/delay/pattern/every | Delay in ms before one-shot (normalized to `at` on save) |
| `pattern`     | string  | one of at/delay/pattern/every | Cron expression (e.g. `"0 9 * * *"`)                    |
| `every`       | number  | one of at/delay/pattern/every | Interval in ms                                           |
| `limit`       | number  | no                       | Max execution count                                          |
| `immediately` | boolean | no                       | Run once immediately on registration                         |

> Note: for one-shot, use exactly one of `at` or `delay`; no other schedule fields are allowed. `delay` is normalized to `at` when stored.

---

## Guided interaction

When the user describes a task in natural language:

1. **Extract the instruction** — what the agent should do.
2. **Extract the schedule** — map natural language to schedule fields:
   - "Only once at 2026-03-11 09:00:00" → `{ "at": 1773190800000 }`, resolve timestamp by running Python code: `import datetime; print(int(datetime.datetime(2026, 3, 11, 9, 0, 0).timestamp() * 1000))`
   - "10 minutes later" / "in 10 minutes" → `{ "delay": 600000 }` (600000 ms = 10 min)
   - "every day at 9am" → `{ "pattern": "0 9 * * *" }`
   - "every 30 minutes" → `{ "every": 1800000 }`
   - "only 5 times" → add `"limit": 5`
   - "start now" / "run immediately" → add `"immediately": true`
3. **Decide session_id** — does the task need cross-trigger context? If yes, generate a UUID. If no (most cases), omit it.
4. **Confirm** the mapped parameters with the user before executing.
5. After execution, show the response (especially the `id` for future update/delete).

When modifying an existing task, **always use Update (PUT)** instead of delete + create. This preserves the task ID and is a single operation. Only use delete when the user explicitly wants to remove a task entirely.

When deleting or updating, first **list** existing tasks so the user can pick which one to modify.
