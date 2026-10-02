# Northstar AI Docs — Index

> Last updated: 2026-10-01
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
3. `ai-agent-activity-streaming.md` — current state and next steps

**Debugging a failure?** Jump to `ai-harmony-fix-detail.md`.

---

## Doc map

| Doc | Covers | Status | Authoritative for |
|---|---|---|---|
| `ai-pattern-tool-calling.md` | Pattern 1 concepts, why it matters, study hints | ✅ current | Concept background |
| `ai-pattern-1-tool-calling-implementation.md` | Pattern 1 design decisions | ✅ current | **Pattern 1 design** |
| `ai-pattern-search-before-mutation.md` | Pattern 2 summary | ✅ current | Pattern 2 quick read |
| `ai-pattern-2-search-before-mutation-detail.md` | Pattern 2 end-to-end + industry validation | ✅ current | **Pattern 2 reference** |
| `ai-pattern-3-action-registry.md` | Pattern 3 design | ✅ current | **Pattern 3 design** (not yet built) |
| `ai-agent-activity-streaming.md` | Response contract + SSE streaming | ✅ current | **Current work** |
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
| — Activity streaming | 🟡 Phase 1 done, Phase 2 next | `ai-agent-activity-streaming.md` |

---

## Bugs fixed (newest first)

| Commit | Bug | Doc |
|---|---|---|
| `06ccc86` | Tool results had six different shapes; `changed` flag lied | `ai-agent-activity-streaming.md` |
| `5d6a4bc` | Double mutation; lost tools on follow-up turns; unguarded `JSON.parse` | — (see commit) |
| `52af0d4` | `tool_choice` unset → "Tool choice is none" | `ai-harmony-fix-detail.md` |
| `b693750` | Harmony error — missing assistant `tool_call` message | `ai-harmony-fix-detail.md` |
| `f5b724c` | Tools resent on follow-up turns | `ai-harmony-fix-detail.md` |

---

## Testing note

There is no test suite for the AI chat flow. Every bug above was a
contract or flow bug that an integration test would have caught — the
double mutation in particular (a request that inserts two rows).

Before Pattern 3 or Phase 2 streaming, add:

- **Tool contract tests** — each tool returns a valid envelope
- **No-double-mutation test** — `create_task` inserts exactly one row
- **Provider stub** — inject a fake `AiProvider` so tests never hit Groq.
  This needs `getAiProvider()` to be injectable, which is worth doing first.

Harness: `cd northstar-api && npm test` (Vitest + Supertest, real Postgres,
`SKIP_RATE_LIMIT=true`).

**Gotcha:** project ID 1 does not exist. Seeded projects start at 13. Use
project 46 or 97 in manual tests, or a FK violation surfaces as a confusing
"Failed query: insert into tasks" that looks like an AI bug.

---

## Conventions

- Docs live in `northstar-api/docs/`
- Commit them separately from code when they stand alone
- **Update the status header when you ship** — a doc that lies about state
  is worse than no doc (see the `ai-pattern-tool-calling.md` issue above)
