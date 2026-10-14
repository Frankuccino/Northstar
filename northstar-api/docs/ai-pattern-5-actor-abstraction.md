# Pattern 5: Actor Abstraction — Design

> Companion to the Pattern 4 doc
> Status: Implemented
> Date: 2026-10-14
> Prerequisite: Pattern 4 (Risk-Gated Confirmation) — implemented. Pattern 4
> created an audit trail; this pattern makes the identity behind it sound.

---

## The Problem

Pattern 4 records who proposed and who approved every destructive action
(`ai_pending_actions.actor_user_id`). But the actor flowing *into* the AI
paths is loose:

**1. An `as any` cast hides a real type mismatch**

```ts
// ai-action-registry.ts
const deleted = await deleteTask({ id: ctx.userId, role: ctx.userRole as any }, taskId);
```

`ctx.userRole` is `string`; `Actor.role` is the `Role` union
(`"admin" | "manager" | "employee"`). The cast silences the compiler instead of
fixing the type. A typo like `"Admin"` would compile and then silently fail the
permission check.

**2. A magic placeholder**

```ts
// workspace.controller.ts
executionResult = await executeAiIntent({
  clientId: 0,          // ← "0 means authenticated user via chat"
  actorUserId: userId,
  actorRole: userRole,
  ...
});
```

`clientId: 0` is a sentinel. `ai.service.ts` documents it in a comment
("Groq path: clientId === 0 means authenticated user acting via AI chat") and
branches on it. A magic number standing in for a concept is the kind of thing
that gets misread later — and it means "the AI acted on behalf of a user" and
"the AI acted as itself" are indistinguishable.

**3. `(req as any).user` in three places**

```ts
const userRole = (req as any).user?.role;
const userId = (req as any).user?.id;
```

These casts are **unnecessary**. `src/types/express.d.ts` already declares
`Request.user?: AuthPayload`, where `AuthPayload.role` is typed `Role`. The
casts discard that typing for no reason.

### Why this matters now

Before Pattern 4, a loose actor was cosmetic. Now it underpins an audit trail
for irreversible operations. "Who deleted this?" should be answerable without
caveats — and the answer should be type-checked, not cast.

---

## What We're Building

One explicit `Actor` concept, threaded consistently through the AI paths, with
the placeholders named rather than numeric.

### Decision 1: Reuse the existing `Actor` type

**Chosen:** `Actor` from `services/workspace/access.ts` — it already exists with
`{ id: number; role: Role }` and is already the parameter type for
`canDeleteTask`.

**Why not a new type:** two actor types would drift. The authorization layer
already has the right shape; the AI path should speak the same language.

### Decision 2: `ActionContext` carries an `Actor`

**Chosen:**

```ts
export interface ActionContext {
  actor: Actor;
  projectId: number;
}
```

**Was:** `{ projectId: number; userId: number; userRole: string }`

**Why:** the pair `userId` + `userRole` is an Actor with the type erased. Passing
the typed object means handlers cannot fabricate a role, and the `as any` cast
disappears because the types line up.

### Decision 3: Replace the `clientId: 0` sentinel with a discriminated caller

**Chosen:** make the distinction explicit instead of numeric.

```ts
type AiCaller =
  | { kind: "user"; actor: Actor }        // authenticated human via chat
  | { kind: "client"; clientId: number }; // registered API client
```

**Why:** `clientId: 0` currently means two different things depending on
context, and a reader has to know the convention. An explicit `kind` makes
"a user did this" vs "a registered client did this" visible in the type, and
the branch in `ai.service.ts` becomes a `switch` on `kind` rather than a
comparison against a magic zero.

**Trade-off:** touches `executeAiIntent`'s signature and its call sites. It's
the largest part of this pattern, and it is worth it — this is the field that
ends up in the audit table.

### Decision 4: Delete the `(req as any)` casts

**Chosen:** use `req.user` directly; it is already typed.

```ts
// before
const userRole = (req as any).user?.role;

// after
const actor: Actor | undefined = req.user
  ? { id: req.user.id, role: req.user.role }
  : undefined;
```

**Why:** the casts are strictly harmful — they discard a type that already
exists. Removing them means a role typo is caught at compile time.

**Note:** the auth middleware guarantees `req.user` on authenticated routes, so
a missing actor is a programming error, not a user error. Handlers should treat
`undefined` as a 500-class bug rather than silently proceeding with a null
actor.

### Decision 5: A system actor for genuinely unattributed work

**Chosen:** keep the possibility of a system actor, but make it explicit.

```ts
const SYSTEM_ACTOR: Actor = { id: 0, role: "admin" };
```

**Why:** some AI work is genuinely not on behalf of a user (a scheduled job, a
background summary). Rather than reusing `clientId: 0` for that, name it. If it
turns out nothing needs it, delete it — but do not leave the concept implicit.

---

## Files to Change

**Modified:**
- `src/services/ai-action-registry.ts` — `ActionContext` takes `actor`;
  `delete_task` drops the `as any`
- `src/controllers/workspace.controller.ts` — build the `Actor` once from
  `req.user`; remove three `(req as any)` casts; pass `actor` to
  `executeAction` / `dispatchAction`
- `src/services/ai.service.ts` — `executeAiIntent` takes `AiCaller` instead of
  `clientId: 0`; branch on `kind`
- `src/services/ai-pending-actions.service.ts` — `actorUserId` comes from
  `actor.id`

**Not changed:**
- `canDeleteTask` / `canDeleteProject` — already take `Actor`
- The `ai_pending_actions` schema — already stores `actor_user_id`
- Provider layer, state machine, registry contents

---

## What We're NOT Doing

- **Not implementing per-board authorization** — `canDeleteTask` still uses the
  app-global role. Its signature is already future-proof for the board-members
  model; that is a separate piece of work.
- **Not adding a users→AI relationship** — no new tables.
- **Not changing the tool surface** — this is an identity refactor, not a
  feature change.

---

## Testing

- `delete_task` via chat still works and still respects `canDeleteTask`
- An **employee** asking the AI to delete is refused — the actor's real role
  reaches the authorization check (this is the regression that matters: a
  mistyped role must not silently pass)
- Approval records the approving user's id
- `executeAiIntent` still works for a registered client (`kind: "client"`)
- No `as any` remains in the AI paths (grep-able assertion in review)

---

## Relationship to Other Patterns

- **Pattern 4:** this pattern makes its audit trail trustworthy
- **Pattern 3:** `ActionContext` is defined in the registry, so the change is
  localized to one type plus its consumers
- **Board access model:** `canDeleteTask(actor, projectId)` is already shaped
  for per-board rules; Pattern 5 makes the AI path pass a real actor to it
