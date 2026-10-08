# Northstar AI Docs — Index

> Last updated: 2026-10-08
> Purpose: which doc to read for what, and what's still true

Eight docs accumulated as the AI work progressed. Some overlap — this page
says which is authoritative so nobody reads a stale one.

---

## Start here

**New to the AI work?** Read in this order:

1. `ai-pattern-tool-calling.md` — what tool calling is and why we replaced
   JSON-in-prompt (concepts, study hints)
2. `ai-pattern-1-tool-calling-implementation.md` — the design decisions
   behind our implementation
3. `ai-agent-activity-streaming.md` — the response contract, SSE streaming,
   and the current state of the chat endpoint

**Want the architecture in one read?** `ai-agent-activity-streaming.md`
covers the live request flow end to end (turns, steps, streaming, errors).

**Debugging a failure?** Jump to `ai-harmony-fix-detail.md`.

---

## Where the code lives

| File | What's in it |
|---|---|
| `src/controllers/workspace.controller.ts` | `aiChatHandler` — the whole agent loop: Turn 1 → execute → Turn 2 → optional Turn 3, step emission, SSE frames, response assembly. Also `executeToolCall` (all 6 tools), `buildAiSystemPrompt`, `toolOk`/`toolErr` |
| `src/services/ai-provider.service.ts` | `GroqProvider.chat()`, `ChatResult` union, tool-call parsing, `parseResponse()` prose fallback, `getAiProvider()` + `__setTestProvider()` test seam |
| `src/services/workspace.service.ts` | The domain layer the tools call: `createTask`, `moveTask`, `assignTask`, `searchTasks`, `getTasksByProject`, `getAssignableUsers` |
| `src/routes/workspace.routes.ts` | `POST /workspace/projects/:id/ai/chat` (auth required) |
| `tests/ai-chat.test.ts` | 96 integration tests |
| `northstar-web/src/features/workspace/api/ai.api.ts` | `aiChatStream()` SSE client, `AgentStep`/`AiChatResponse` types |
| `northstar-web/src/features/workspace/components/ai-chat-panel.tsx` | Chat UI, live step rendering |

**Request flow, in one line:** route → `aiChatHandler` → `provider.chat()` returns
`{kind: "tool_call"}` or `{kind: "text"}` → `executeToolCall` runs the tool and
returns an envelope → the envelope goes back to the LLM as a `tool` message →
repeat until text → assemble `{content, steps, changed, ...}`.

---

## Doc map

| Doc | Covers | Status | Authoritative for |
|---|---|---|---|
| `ai-pattern-tool-calling.md` | Pattern 1 concepts, why it matters, study hints | ✅ current | Concept background |
| `ai-pattern-1-tool-calling-implementation.md` | Pattern 1 design decisions | ✅ current | **Pattern 1 design** |
| `ai-pattern-search-before-mutation.md` | Pattern 2 summary | ✅ current | Pattern 2 quick read |
| `ai-pattern-2-search-before-mutation-detail.md` | Pattern 2 end-to-end + industry validation | ✅ current | **Pattern 2 reference** |
| `ai-pattern-3-action-registry.md` | Pattern 3 design | ✅ current | **Pattern 3 design** (not yet built) |
| `ai-agent-activity-streaming.md` | Response contract + SSE streaming | ✅ current | **Chat architecture + current work** |
| `ai-harmony-fix-detail.md` | Harmony "Tools should have a name!" root cause + fix | ✅ current | **Harmony bug** |
| `ai-harmony-tools-error-investigation.md` | Same bug, pre-fix analysis | ⚠️ superseded | Historical only |

---

## Duplicate pairs

Three pairs cover the same ground. In each, one supersedes the other.

### 1. Tool calling — concept vs implementation

- `ai-pattern-tool-calling.md` (216 lines) — Pattern 1 explained, study hints
- `ai-pattern-1-tool-calling-implementation.md` (165 lines) — our decisions

**Keep both.** Genuinely different purposes: one teaches the concept, one
records our reasoning.

✅ **Header corrected 2026-10-01** — it previously said *"Status: Planned"*
and listed streaming as not-yet-started, both of which had become false.

### 2. Search before mutation — summary vs detail

- `ai-pattern-search-before-mutation.md` (150 lines) — short version
- `ai-pattern-2-search-before-mutation-detail.md` (392 lines) — full version

**Keep both.** The short one is a fast read; the detail one is the reference
and includes the industry-standard validation and GitHub repos to study.

### 3. Harmony bug — investigation vs fix

- `ai-harmony-tools-error-investigation.md` (157 lines) — written *before*
  the fix, documents symptoms and hypotheses
- `ai-harmony-fix-detail.md` (119 lines) — written *after*, documents the
  actual root cause and fix

**Superseded.** The investigation's hypothesis (SDK mutating the tools array)
turned out to be **wrong** — the real cause was a missing assistant
`tool_call` message before the tool result. Its analysis is now misleading.

**Recommendation:** keep for history, but read the fix doc. If it causes
confusion, delete the investigation — the fix doc plus git history
(`b693750`) preserve everything needed.

---

## Status of each pattern

| Pattern | Status | Doc |
|---|---|---|
| 1. Tool Calling | ✅ Implemented, all 6 tools verified | `ai-pattern-1-tool-calling-implementation.md` |
| 2. Search Before Mutation | ✅ Implemented | `ai-pattern-2-search-before-mutation-detail.md` |
| 3. Action Registry | ⬜ Designed, not built | `ai-pattern-3-action-registry.md` |
| 4. Risk-Gated Confirmation | ⬜ Not started | — |
| 5. Actor Abstraction | ⬜ Not started | — |
| — Activity streaming | ✅ Phases 1–2 done (contract + SSE); Phase 3 polish left | `ai-agent-activity-streaming.md` |

---

## Bugs fixed (newest first)

| Commit | Bug | Doc |
|---|---|---|
| `677854a` | Rejected actions lost their reason; `changed`/`intent` reported wrongly | — (see commit) |
| `dfc1190` | WIP-limit rejection returned 500; `hadSearchStep` missed Turn-1 searches | — (see commit) |
| `06ccc86` | Tool results had six different shapes; `changed` flag lied | `ai-agent-activity-streaming.md` |
| `5d6a4bc` | Double mutation; lost tools on follow-up turns; unguarded `JSON.parse` | — (see commit) |
| `52af0d4` | `tool_choice` unset → "Tool choice is none" | `ai-harmony-fix-detail.md` |
| `b693750` | Harmony error — missing assistant `tool_call` message | `ai-harmony-fix-detail.md` |
| `f5b724c` | Tools resent on follow-up turns | `ai-harmony-fix-detail.md` |

---

## Testing

The AI chat flow has **96 integration tests** in `tests/ai-chat.test.ts`,
covering the tool envelope contract, error handling, agent steps, SSE
frames, and the double-mutation regression.

They run against a **stub provider** — `__setTestProvider()` in
`ai-provider.service.ts` injects a fake `AiProvider`, so tests never hit
Groq and stay deterministic.

Harness: `cd northstar-api && npm test` (Vitest + Supertest, real Postgres,
`SKIP_RATE_LIMIT=true`).

**What the tests do NOT catch:** behavioural gaps that only appear in real
use. The last three bugs (dropped explanation on a rejected action, wrong
`changed` on a failed mutation, prose-guessed `intent`) all passed a green
suite. Manual testing against the live API found them.

**Gotcha:** project ID 1 does not exist. Seeded projects start at 13. Use
project 46 or 97 in manual tests, or a FK violation surfaces as a confusing
"Failed query: insert into tasks" that looks like an AI bug.

---

## Conventions

- Docs live in `northstar-api/docs/`
- Commit them separately from code when they stand alone
- **Update the status header when you ship** — a doc that lies about state
  is worse than no doc (see the `ai-pattern-tool-calling.md` issue above)
