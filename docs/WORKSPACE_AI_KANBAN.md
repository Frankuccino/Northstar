# Northstar Workspace — AI-Assisted Kanban

_Status: Proposed / pre-implementation. Auth hardening (role union [B]) lands first._
_Last updated: current session_

## One-liner
A Kanban workspace where AI prefills task context, approach, and a success checklist; the human picks up the task, can let AI draft the work, then performs a guided validation that also produces a well-justified commit. The AI is a junior partner; the human is always accountable.

## Why this, not chat/dashboard
- Assistive, not surveillance — AI reduces friction, human stays accountable.
- Every AI output is evidence → auditable trail (suggestion version, prompt, human accept/reject/edit-with-reason).
- Exercises the whole roadmap from one feature: task queue (Ep14), FTS (Ep15 done), caching (Ep13), error handling (Ep16), config (Ep17), logging (Ep18), graceful shutdown (Ep19), security (Ep20).
- Interview-distinctive: human-in-the-loop LLM with an honest validation gate.

## Domain model (build this before the UI)
- **Task**
  - `id`, `projectId`, `title`, `description`
  - `status`: `backlog → ai_drafting → ready → in_progress → needs_revision → validated → done`
  - `assigneeId`, `createdAt`, `updatedAt`
  - Illegal transitions rejected at the service layer (state machine, not UI-only).
- **AiSuggestion** (versioned, never overwritten)
  - `id`, `taskId`, `version`, `type` (`context` | `approach` | `checklist` | `draft` | `commit_guidance`)
  - `content`, `promptSnapshot`, `model`, `createdAt`
  - One row per generation; edits create new versions.
- **TaskValidation** (human action, audited)
  - `id`, `taskId`, `suggestionId`, `decision` (`accept` | `reject` | `edit`)
  - `reason`, `actorId`, `createdAt`
- **CommitRecord** (AI-guided, human-approved)
  - `id`, `taskId`, `message` (conventional), `justification`, `approvedBy`
- **Project** / **Activity** (rollup for "who is active")
  - cached streak / score (invalidated on validation write).

## The pipeline (the actual product)
1. Human creates/picks a Task (backlog).
2. AI generates suggestions (async, via queue) → `ai_drafting → ready`.
3. Human picks up: `ready → in_progress`.
4. AI can draft the work/content + commit-guidance (`draft`, `commit_guidance` suggestions).
5. Human validates each suggestion (`TaskValidation`) → `needs_revision` or `validated`.
6. On `validated`, human approves the `CommitRecord` → `done`.

## Where the engineering grade is (not the board UI)
1. **Async AI generation via task queue (Ep14)** — generation never blocks HTTP. This is the real queue implementation.
2. **State-machine enforcement** — illegal transitions rejected in the service layer.
3. **Audit trail** — every suggestion + every human edit stored, never overwritten.
4. **Commit-guidance generator** — deterministic rules + LLM → message + justification (feeds assessment prep: "commits with justifications").
5. **Trust boundary** — AI output is NEVER trusted as fact; human validation is the gate.

## On "real-time"
Defer WebSocket/presence/multi-user CRDT sync. Build the REST board + AI loop first. Add live card-move later as a thin layer over the same Task model. Real-time sync is the costliest, lowest-learning part.

## Servers / cost
Runs locally now; docker-compose for parity; free tiers (Render/Railway/Fly + Supabase) later. LLM behind an interface — stub in tests, drop a real key in via env later. Never hardcode a provider.

## Sequencing (depends on auth)
1. Finish auth role union **[B]** (board needs roles: who can draft vs validate).
2. Model Workspace entities + state machine (migrations + services).
3. Async AI loop with a **stubbed** LLM interface (no provider key).
4. Commit-guidance generator (deterministic + stubbed LLM).
5. REST board + validation endpoints.
6. (Later) WebSocket live updates; (later) real LLM key via env.

## Open architectural question (resolve before coding)
If the AI both drafts task content AND authors commit-guidance, what single invariant must the human-validation step enforce so the system can't launder incorrect work into "validated"? And what does that force into the Task state machine + audit schema?

## Relation to other docs
- Supersedes the earlier "AI validator of user activity" idea — this is the concrete form.
- Complements `docs/REFRESH_TOKEN_AUTH.md` (the auth foundation this sits on).
- Frontend rendering plan: `docs/FRONTEND_IA_AND_UI.md` (page IA + UI primitives).
- Auth defects [C][F][G][H] from the review still apply and should land alongside/before the board's write paths.
