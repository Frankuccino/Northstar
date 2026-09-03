# Northstar Docs — Index & Glossary

This directory is the canonical design and planning surface for Northstar.
It does not contain generated or operational docs. It is meant to be read
before implementing or reviewing features.

## Reading order

1. `README.md` — this file: terminology, strategy, and navigation.
2. `KANBAN_STATUS.md` — what is implemented, missing, and intentionally deferred.
3. `REFRESH_TOKEN_AUTH.md` — auth model, defects, and hardening plan.
4. `BOARD_ACCESS_MODEL.md` — per-project permission strategy.
5. `WORKSPACE_AI_KANBAN.md` — AI trust-gate domain model and sequencing.
6. `WORKSPACE_INVITATIONS.md` — formal invite-by-email flow.
7. `WORKSPACE_AI_INTEGRATION.md` — hybrid AI API + in-app chat design.
8. `FRONTEND_IA_AND_UI.md` — page architecture, routes, and UI primitives.
9. `next-steps.md` — immediate backend/hardening roadmap.

## Domains

- **Auth** — identity, sessions, refresh tokens, rate limiting.
- **Access** — roles, project membership, invitation model, ABAC.
- **Workspace** — projects, tasks, state machine, WIP limits, board behavior.
- **AI** — suggestion pipeline, validation gate, hybrid API, intent execution.
- **Frontend** — page IA, routing, state management, UI component strategy.
- **Operations** — seeding, migrations, error handling, observability.

## Terminology

**Actor**
Any identity that performs an action. Today this is an authenticated human
user (`userId`). In the future it can be an AI client (`clientId`) or a
system job. Authorization decisions are actor-scoped, not user-scoped.

**Assignee**
The human responsible for a task. In production this MUST be a project
member obtained via a formal invitation, not an arbitrary user account.

**Invitation**
A time-bound, single-use grant to join a project. Contains a secure token
sent by email. Accepted invitations become immutable membership records.

**Project Member**
A user with a defined relationship to a project. Membership is created only
through invitation acceptance. Project membership is the source of truth for
“who can be assigned” and “who can act here.”

**ABAC**
Attribute-Based Access Control. Instead of hardcoding role checks in routes,
permissions are expressed as predicates over actor attributes, resource
attributes, and environmental attributes. `[Y]` in docs denotes ABAC work.

**State Machine**
The task lifecycle is enforced server-side as a state machine with explicit
legal transitions and WIP limits. The UI mirrors the machine; it does not
define it.

**Suggestion**
An AI-generated artifact attached to a task. Types include `context`,
`approach`, `checklist`, `draft`, and `commit_guidance`. Suggestions are
versioned; edits create new versions. The human validation step is the trust
boundary.

**AI Client**
A non-human caller authorized to invoke AI actions via API key. AI clients
have scoped permissions and rate limits. They do not bypass human ABAC; they
inherit it through the `actorUserId` linkage when a human is present.

**Intent**
A structured, validated representation of an action requested by an AI
client or chat user. Examples: create task, move task, assign task, add
comment. Intents are parsed, authorized, and executed through the same
service layer as direct API calls.

**Audit Log**
An append-only record of significant actions. For AI actions this includes
the client identity, linked human actor, project, intent, result, and
timestamp. Audit logs are never modified after creation.

## Development strategy

**Server-authoritative**
All business rules live in the backend service layer. The frontend mirrors
rules for UX (disabled states, validation) but never enforces them alone.

**Surgical increments**
Features are split into small, reviewable commits:
- schema/service (data + rules)
- controller/validation (API surface)
- frontend API/hook (data access)
- frontend UI (presentation)

This keeps diffs reviewable and rollbacks surgical.

**Tests as specification**
Backend tests are the authoritative proof of behavior. The test suite uses a
real Postgres database and exercises the full HTTP stack. Frontend changes
are eyeballed in the browser; there is no frontend test runner.

**Production-first decisions**
We build for production constraints from day one:
- real email provider abstraction, not console logs
- real API keys, not hardcoded secrets
- real rate limiting, not dev-only toggles
- real cleanup jobs, not ad-hoc scripts

Dev shortcuts are limited to local-only conveniences (stubbed LLM, console
email) that are explicitly gated behind env and never ship as defaults.

**Dependency ordering**
Some features are hard dependencies of others. We implement in dependency
order to avoid rework:
1. Auth hardening ([C] rate limiting)
2. Formal invitations (required before AI can assign unknown users)
3. Hybrid AI integration (reuses invitation + ABAC)
4. Card ordering, swimlanes, bulk actions (pure UI/data features)

## How to use these docs

- Before implementing: read the relevant domain section + status doc.
- After implementing: update the status doc and add any new design notes.
- Before reviewing: check the terminology above; it is the shared vocabulary.
- When in doubt: follow the server-authoritative + surgical increment rules.
