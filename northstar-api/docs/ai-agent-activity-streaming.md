# AI Chat: Response Contract + Agent Activity Streaming

> Status: Phase 1 + Phase 2 implemented — token streaming (Phase 3) remains
> Date: 2026-10-01 (updated 2026-10-08)
> Prerequisite: Pattern 1 (Tool Calling) — verified working, all 6 tools
> Related: `ai-pattern-3-action-registry.md`, `ai-harmony-fix-detail.md`

---

## Why This Doc

Pattern 1 works, but the *response contract* is still shaped by the old
JSON-in-prompt era. The frontend gets the final prose plus a couple of
loose flags — nothing about which tools ran, what they were called with,
or what they returned.

Two concrete problems this causes today:

1. **`executed` is wrong for tool calls.** When the tool path runs,
   `toolExecuted = true` short-circuits the legacy branch, so
   `executionResult` stays `null` and the response reports
   `executed: false` — even though a task was just created. The frontend
   then relies on `intent !== "unknown"` to decide whether to refresh the
   board, which is a heuristic, not a fact.

2. **The user sees a wall of text, not work.** "Move 'wow test' to ready"
   produces one paragraph. The actual sequence — searched, found 1 match,
   checked the transition, moved it — is invisible. When something fails,
   the user has no way to see *where* it failed.

The fix is two-part: a structured **response contract** that reports tool
calls as data, then **streaming** so those steps appear live instead of
arriving all at once at the end.

---

## Part A — Response Contract

### Current shape

`POST /workspace/projects/:id/ai/chat` returns
(`workspace.controller.ts:762`):

```ts
{
  content: string,          // final LLM prose
  message: string,          // alias of content (legacy)
  intent: string,           // keyword-guessed from prose via parseResponse()
  payload: {},              // legacy, usually empty on the tool path
  executed: boolean,        // WRONG on the tool path (see above)
  hadSearchStep: boolean,   // no detail
}
```

### Problems

| Problem | Detail |
|---|---|
| No tool-call record | The frontend cannot render "searched → found 1 → moved". |
| `intent` is guessed | `parseResponse()` keyword-matches the LLM's *confirmation prose*. This is the exact mechanism that caused the double-mutation bug (`5d6a4bc`). |
| `executed` unreliable | Always `false` when the tool path ran. |
| `hadSearchStep` detail-free | A boolean where the caller wants the query and the hits. |
| Inconsistent tool results | `search_tasks` returns `{count, tasks}`; `create_task` returns `{success, taskId}`; `help` returns `{message}`. No shared envelope. |
| Errors are bare strings | `JSON.stringify({ error: "..." })` — no code, no retryability. |

### Proposed shape

```ts
interface AiChatResponse {
  content: string;              // final prose (what the user reads)
  steps: AiStep[];              // ordered record of what actually happened
  status: "ok" | "partial" | "error";
  changed: boolean;             // did any mutation commit? → drives board refresh
}

interface AiStep {
  id: string;
  kind: "tool_call" | "text";
  tool?: string;                // "search_tasks"
  args?: Record<string, unknown>;
  result?: ToolResult;          // see below
  durationMs: number;
  at: string;                   // ISO timestamp
}

// One envelope for every tool, so the frontend has a single renderer.
interface ToolResult {
  ok: boolean;
  summary: string;              // short human line: "Found 1 task"
  data?: Record<string, unknown>;   // structured payload (tasks, taskId, ...)
  error?: { code: string; message: string };
}
```

Key decisions:

- **`changed` replaces `executed`.** It answers the only question the
  frontend actually asks: *should I refetch the board?* Derived from
  whether a mutation tool (`create_task`, `move_task`, `assign_task`)
  returned `ok: true`.
- **`steps` is the source of truth.** `intent` is dropped from the
  response entirely. Nothing downstream should guess intent from prose
  again — that bug is already fixed once; removing the field prevents
  it coming back.
- **Every tool returns the same envelope.** `executeToolCall` currently
  returns a hand-rolled `JSON.stringify({...})` per case. Normalizing it
  is a prerequisite for both the UI and Part B.

### Migration note

`executeToolCall` returns a **string** (fed to the LLM as the tool
message). The envelope should be built *alongside* that string, not
replace it — the LLM still needs a text payload, the client needs the
structured one:

```ts
const { llmText, result } = await runTool(tc, ctx);
steps.push({ kind: "tool_call", tool: tc.name, args: tc.arguments, result, ... });
previousMessages.push({ role: "tool", tool_call_id, content: llmText });
```

This is where Pattern 3 (`ai-pattern-3-action-registry.md`) pays off: a
registry handler can return `{ llmText, result }` in one shape, instead
of the controller unwrapping six different switch cases.

---

## Part B — Streaming Agent Activity

### Goal

The user should watch the agent work, the way a coding agent shows its
tool calls. Instead of a 3-second blank then a paragraph:

```
▸ Searching tasks for "wow test"          ✓ found 1
▸ Moving "wow test" → ready               ✓ done
  Moved "wow test" to Ready.
```

### Transport

**Server-Sent Events (SSE)** over the existing endpoint, via a `stream`
flag so the non-streaming path keeps working (and stays testable):

```
POST /workspace/projects/:id/ai/chat
{ "message": "...", "stream": true }

→ text/event-stream
```

Why SSE over WebSockets: the flow is strictly server→client, one request
per user message. SSE is plain HTTP, survives proxies, auto-reconnects,
and needs no new server infrastructure. WebSockets would add bidirectional
machinery we have no use for.

### Event types

```
event: step      → a tool call started
data: { "id": "s1", "kind": "tool_call", "tool": "search_tasks",
        "args": { "query": "wow test" }, "status": "running" }

event: step      → that tool call finished
data: { "id": "s1", "status": "done", "durationMs": 42,
        "result": { "ok": true, "summary": "Found 1 task",
                    "data": { "count": 1, "tasks": [...] } } }

event: delta     → streamed final prose (token chunks)
data: { "text": "Moved " }

event: done      → terminal event, mirrors AiChatResponse
data: { "content": "...", "steps": [...], "status": "ok", "changed": true }

event: error
data: { "code": "PROVIDER_ERROR", "message": "..." }
```

Rules:

- `step` events are emitted **before and after** each tool execution, so
  a slow tool shows as `running` rather than appearing to hang.
- `done` always fires on success and carries the same object the
  non-streaming path returns — one contract, two transports.
- Errors mid-stream emit `error` then close. Never leave the client
  waiting on a dead stream.

### Where events are emitted

The controller already has the exact seams. Each `provider.chat()` call
and each `executeToolCall()` call is a place to emit:

| Line (current) | Emit |
|---|---|
| `executeToolCall(tc, projectId)` (Turn 1) | `step` running → `step` done |
| `provider.chat({...})` (Turn 2) | `step` for the LLM turn |
| `searchTasks(...)` (search follow-up) | `step` running → `step` done |
| `executeToolCall(tc2, projectId)` (chained) | `step` running → `step` done |
| final `res.json(...)` | `done` |

Note the current code calls `provider.chat()` **up to three times** in one
request. Those are exactly the "thinking" beats the user should see.

### Frontend

`ai-chat-panel.tsx` currently does a single `await api.post(...)` and
appends one message (`ai-chat-panel.tsx:137`). Streaming requires:

1. `EventSource` cannot send a POST body — use `fetch` +
   `ReadableStream` and parse the SSE frames manually, or
   `@microsoft/fetch-event-source`.
2. Assistant messages become a **step list + prose**, not a single
   `content` string. `AiMessage` (`ai.api.ts:3`) grows a
   `steps?: AiStep[]` field.
3. Render steps with tight spacing to match the existing panel style —
   a one-line row per step, status icon, tool label, summary. Reuse the
   existing `CheckCircle2` / `XCircle` / `Loader2` imports already in the
   panel.
4. Board refresh keys off `done.changed` instead of the current
   `intent !== "unknown"` heuristic.

---

## Implementation Phases

**Phase 1 — Contract (no streaming). ✅ DONE (`06ccc86`)**
- ✅ Added `ToolResult` envelope; normalized all 6 tool cases.
- ✅ Accurate `changed` flag (mutation tools only).
- ⬜ Return `steps`, `status` from `aiChatHandler` — *still pending*.
- ⬜ Drop `intent`/`executed` from the response — *still pending*.
- ⬜ Update `ai.api.ts` types and the panel to render `steps` — *still pending*.

**Phase 2 — Streaming. ✅ DONE**
- ✅ `stream: true` branch emitting SSE (`step`, `done`, `error` frames).
- ✅ `step` events around each tool call (running → done/error).
- ✅ `fetch`-based SSE client (`aiChatStream`) in `ai.api.ts`.
- ✅ Panel renders steps live; non-streaming path untouched (all tests pass).

**Phase 3 — Polish.**
- Token streaming (`delta`) for the final prose.
- Collapse long step lists; expand on click.
- Surface `error.code` distinctly from `error.message`.

Phases 1 and 2 are independently shippable. Phase 1 alone fixes the
`executed`/`intent` lies and makes the work visible on refresh.

---

## Testing

This is the first feature where the missing test suite is a real blocker
rather than a nicety. Every bug fixed in `5d6a4bc` — double mutation,
lost tools on follow-up turns, unguarded `JSON.parse` — was a
contract/flow bug that a single integration test would have caught.

Minimum suite for this work:

- **Tool contract:** each of the 6 tools returns a valid `ToolResult`
  envelope (parametrized, one assertion per tool).
- **No double mutation:** `create_task` request produces exactly **one**
  row. Assert the count, not the response — this is the regression that
  matters.
- **Steps recorded:** a `search → move` request yields two `tool_call`
  steps in order, with `changed: true`.
- **Provider stub:** inject a fake `AiProvider` so tests never hit Groq
  and stay deterministic. This requires `getAiProvider()` to be
  injectable — worth doing now, before the test suite exists.

Run with the existing harness: `cd northstar-api && npm test`
(Vitest + Supertest, real Postgres, `SKIP_RATE_LIMIT=true`).

---

## Open Questions

1. **Step persistence.** Should `steps` be stored (an audit trail of AI
   actions, which would sit well next to the existing `ai_intents` table),
   or is it response-only? Persisting enables "what did the AI do last
   week" and pairs with the risk-gating pattern later.
2. **Cancellation.** SSE makes it possible to abort mid-flow. Does the
   UI need a stop button, and if so, what happens to a mutation already
   committed?
3. **Multi-tool turns.** The loop currently handles at most three LLM
   turns. Streaming will make that cap visible to users. Is three enough,
   or should the cap move to a registry-level budget?

---

## What This Unlocks

- **Pattern 3 (Action Registry)** becomes the natural home for the
  `ToolResult` envelope — one handler shape, one result shape.
- **Pattern 4 (Risk-Gated Confirmation)** needs exactly this plumbing:
  a `step` in `pending_confirmation` state, streamed to the client, then
  resumed on approval.
- **Observability.** Steps with `durationMs` per tool are the raw material
  for a latency breakdown of the agent loop.
