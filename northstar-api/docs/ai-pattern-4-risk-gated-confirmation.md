# Pattern 4: Risk-Gated Confirmation — Design

> Companion to the Pattern 3 registry doc
> Status: Implemented
> Date: 2026-10-12 (implemented 2026-10-13)
> Prerequisite: Pattern 3 (Action Registry) — implemented. Pattern 4 is a
> one-entry addition *because* the registry exists.

---

## The Problem

The state machine protects against **invalid** operations. `backlog → ready`
is rejected; a full backlog rejects new cards. That covers a whole class of
mistakes.

It does not cover **destructive-but-valid** operations. Deleting the right
task at the wrong moment is a perfectly legal state transition. Nothing in the
current architecture stops it.

This is the first time the AI can do something irreversible. The failure mode
is different in kind:

| Class | Example | Current defense |
|---|---|---|
| Invalid | `backlog → ready` | State machine rejects it |
| Destructive | `delete "Q4 report"` | **None** |

An LLM is a plausible-but-wrong machine. It can correctly identify a task and
still delete it when the user only asked a question about it. The user needs
a chance to say no.

---

## What We're Building

A **confirmation gate** in front of actions marked as risky. Instead of
executing, the server returns a *pending* step; the client asks the user; the
action runs only on explicit approval.

```
User:   "delete the Q4 report task"
Agent:  search_tasks("Q4 report")        → found id 42
Agent:  delete_task(42)                  → PENDING (not executed)
Client: "Delete 'Q4 report'? [Confirm] [Cancel]"
User:   confirms
Server: delete_task(42)                  → executed
```

---

## Design Decisions

### Decision 1: The gate is a flag on the registry entry

**Chosen:** `requiresConfirmation: true` on the action entry.

```ts
delete_task: {
  name: "delete_task",
  description: "Delete a task permanently. Requires user confirmation.",
  requiresConfirmation: true,
  parameters: { ... },
  promptLabel: "Delete a task permanently",
  handler: async (args, ctx) => { ... },
}
```

**Why:** This is the entire payoff of Pattern 3. Adding a gated action is one
entry. The alternative — a hardcoded list of dangerous tool names in the
controller — reintroduces exactly the scattered-configuration problem the
registry eliminated.

**Generalization note:** a boolean is the right first step. If we later need
tiered risk (`low | medium | high`), the field becomes an enum without
changing call sites, because the controller reads it through one helper.

### Decision 2: Confirmation is a *state*, not a second endpoint

**Chosen:** the pending action carries an id; approval is a separate request
that references it.

**Why not a second AI turn:** the LLM should not be re-consulted to approve
its own action. That would let the model approve itself. The human confirms;
the server executes the *already-decided* action. The LLM is not in the
approval loop.

**Why not execute-then-offer-undo:** deletion is not always reversible, and
soft-delete adds a column plus a "when do we really delete" policy. A gate is
simpler and fails safe.

### Decision 3: The gate lives in the controller, not the handler

**Chosen:** the controller checks `requiresConfirmation` before calling
`handler`.

**Why:** if the gate lived inside each handler, every new risky action would
have to remember to check it. Putting it in the dispatch path means it cannot
be forgotten — the same reasoning as the `toolExecuted` double-mutation guard.

The handler for a gated action should be written as if it will always execute.
It is only ever called after approval.

### Decision 4: Persistence — **OPEN, needs a decision**

A pending action must survive between the request that creates it and the one
that approves it. Three options:

**Option A — new `ai_pending_actions` table**

```sql
id, project_id, actor_user_id, action_name, args (jsonb),
status ('pending'|'approved'|'rejected'|'expired'),
created_at, resolved_at, expires_at
```

- ✅ Survives restarts and works across instances
- ✅ Auditable — "what did the AI ask to do, and who approved it?"
- ✅ Sits naturally beside the existing `ai_actions` audit table
- ❌ Migration required
- ❌ Needs expiry/cleanup policy

**Option B — in-memory Map**

- ✅ Trivial to implement
- ❌ Lost on restart
- ❌ Breaks with more than one server instance
- ❌ **Will work locally and fail on Render** (free tier spins down)

**Option C — stateless signed token**

The client holds a signed payload describing the pending action; the server
verifies the signature on approval.

- ✅ No schema change, no server state
- ✅ Works across instances and restarts
- ❌ Replayable within the token's lifetime unless we track a nonce
- ❌ Larger client payload

**Recommendation: Option A.** The codebase already persists AI actions
(`ai_actions`), so a durable pending-action table matches existing
conventions. Option B is a trap — it passes local testing and breaks in
production. Option C is elegant but adds replay considerations we would
rather not reason about for a destructive operation.

**This decision blocks implementation** because it determines whether there is
a migration.

### Decision 5: Pending actions expire

**Chosen:** every pending action carries an `expires_at` (suggest 10 minutes).

**Why:** a confirmation prompt that stays valid forever is a standing
authorization to delete. If the user walks away, the gate should close itself.
Expired actions are rejected with a clear message, not silently executed.

---

## Response Contract Changes

The streaming contract gains a step status. Current statuses are
`running | done | error`; Pattern 4 adds `pending_confirmation`.

```json
{
  "tool": "delete_task",
  "args": { "taskId": 42 },
  "status": "pending_confirmation",
  "ok": null,
  "summary": "Delete \"Q4 report\"? This cannot be undone.",
  "pendingActionId": "pa_01H...",
  "expiresAt": "2026-10-12T21:50:00Z"
}
```

And the terminal `done` frame reports that the turn ended awaiting input:

```json
{
  "content": "I found \"Q4 report\" and I'm ready to delete it — please confirm.",
  "status": "awaiting_confirmation",
  "changed": false,
  "steps": [ ... ]
}
```

`changed` is **false** — nothing has been mutated yet. This is important: the
board must not refetch on a pending action.

### Approval endpoints

```
POST /workspace/projects/:id/ai/confirm
  { pendingActionId: "pa_01H...", decision: "approve" | "reject" }

→ 200 { executed: true, result: { ... } }
→ 409 { error: "This action has expired" }
→ 404 { error: "Unknown pending action" }
```

The approval response returns the tool envelope from the now-executed action,
so the client can render it as a completed step.

---

## Turn-Cap Interaction

The existing turn cap (3 LLM turns) interacts with confirmation in a way worth
naming: a confirmed action may need a *fresh* turn to let the LLM narrate the
result. The approval endpoint should execute the action and return the
envelope directly — the client can render "Deleted 'Q4 report'" without
another LLM call. Cheaper, faster, and avoids re-consulting the model about an
action the human already authorized.

---

## Files to Change

**New:**
- `src/db/schema/ai.ts` — `aiPendingActions` table (if Option A)
- `src/services/ai-pending-actions.ts` — create / resolve / expire
- `docs/ai-pattern-4-risk-gated-confirmation.md` — this doc

**Modified:**
- `src/services/ai-action-registry.ts` — add `requiresConfirmation` to
  `ActionEntry`; add the `delete_task` entry
- `src/controllers/workspace.controller.ts` — gate check in the dispatch path;
  pending step emission; new `aiConfirmHandler`
- `src/routes/workspace.routes.ts` — `POST .../ai/confirm`
- `northstar-web/src/features/workspace/api/ai.api.ts` — `confirmAction()`,
  `pending_confirmation` status in `AgentStep`
- `northstar-web/src/features/workspace/components/ai-chat-panel.tsx` —
  confirm/cancel UI on a pending step

**Not changed:**
- Provider layer
- State machine
- The existing `DELETE /workspace/tasks/:id` route (unchanged; the AI path
  gates before reaching it)

---

## Reused, Not Rebuilt

`deleteTask(actor, taskId)` already exists and enforces permissions via
`canDeleteTask` (admin/manager today, board-members later). The registry
handler calls it — **the AI gets no special privilege**. An employee asking
the AI to delete gets the same rejection as an employee calling the API
directly.

This matters: the confirmation gate is a *usability* safeguard (did you mean
this?), not an *authorization* one. Authorization stays where it already is.

---

## What We're NOT Doing

- **Not gating every action** — only genuinely destructive ones. Gating
  `search_tasks` would train users to click through prompts without reading.
- **Not adding undo** — a gate prevents the mistake; undo is a different
  feature with different storage costs.
- **Not letting the LLM approve** — the model is not in the approval loop.
- **Not adding bulk delete** — one action at a time; batch confirmation UX is
  a separate design problem.

---

## Testing

- `delete_task` returns `pending_confirmation` and **does not delete** — assert
  the row still exists (the critical regression)
- Approval executes and returns the envelope; row is gone
- Rejection leaves the row intact
- Expired pending action is rejected with 409
- Unknown `pendingActionId` returns 404
- An employee's approval attempt is still refused by `canDeleteTask`
- `changed` is false on the pending response, true after approval
- A non-gated action is unaffected (no behavior change)

The first test is the one that matters: **a pending action must never mutate.**

---

## Relationship to Other Patterns

- **Pattern 3 (Action Registry):** the enabler — this is one registry entry
- **Pattern 5 (Actor Abstraction):** the approval needs a real actor id to
  record *who* confirmed; the current `clientId: 0` placeholder is not
  sufficient for an audit trail of destructive actions
- **State machine:** unchanged — it still rejects invalid transitions; this
  layer sits in front of valid-but-destructive ones
