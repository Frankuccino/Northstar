# Northstar — Hybrid AI Integration

_Status: Design / pre-implementation_
_Last updated: current session_

## One-liner
Northstar exposes a production-grade AI API layer for task CRUD and moves. The in-app chat is one client; external AIs are another. Both share the same permission model, audit log, and rate limits.

## Why hybrid, not just one interface
- External AI clients can automate workflows without human UI interaction.
- In-app chat gives humans a natural-language interface with full project context.
- Shared backend means behavior, permissions, and audit are identical no matter who calls it.
- Future clients (mobile, CLI, automation) reuse the same layer.

## User flows

### Flow A — In-app AI chat
1. User opens chat panel in project.
2. Types: “Move all my tasks in review to validated”
3. Frontend sends structured intent to `/ai/execute`.
4. Backend verifies user permissions, applies actions, returns summary.
5. UI updates board + shows chat result.

### Flow B — External AI API
1. External system authenticates with AI API key.
2. Calls `/ai/execute` with structured intent JSON.
3. Backend verifies AI client scope + project permissions.
4. Actions applied, attributed to AI client + linked human if any.
5. External system receives result, updates its own UI if desired.

### Flow C — Human approves AI suggestion
1. AI suggests: “Assign `new@person.com` to this task”
2. System checks: email not yet a project member.
3. Backend creates invitation + returns suggestion to caller.
4. Human approves in UI or external client confirms.
5. Invitation email sent; task optionally pre-assigned on acceptance.

## Components

### Backend
- `ai_clients` table: `id`, `name`, `apiKeyHash`, `scope` (`read`/`write`/`admin`), `rateLimit`, `createdAt`, `revokedAt`
- `ai_actions` audit table: `id`, `clientId`, `actorUserId`, `projectId`, `intent`, `result`, `ip`, `createdAt`
- Intent schema + parser: validated DTO for create/move/assign/comment tasks
- Action executor: applies intents through existing services, enforces state machine + ABAC
- Permission mapper: AI client scope → allowed actions; human permissions still enforced per-project
- Rate limiter: per-client + per-project sliding window
- Context provider: compact project/task summary for AI consumption

### Frontend
- Chat panel UI: message list + input + typing indicator
- Intent composer: natural language → structured intent (local or backend-assisted)
- Result renderer: shows what changed, errors, suggested follow-ups
- Settings: project AI toggle, allowed actions, external client management

### Infrastructure
- AI API key issuance + rotation UI
- Email provider for invitations (shared with formal invite flow)
- Background cleanup for expired AI keys / old audit rows
- Observability: AI action volume, error rates, token usage per client

## Security model
- AI cannot bypass human permissions: `actorUserId` still checked against project role when present.
- AI API keys are high-entropy, stored hashed, rotatable, revocable.
- No PII in AI context unless project explicitly opts in.
- Invitation creation via AI = always requires human approval; AI cannot send invites autonomously.
- All AI actions are auditable with client identity + linked human if applicable.

## Sequencing
1. DB schema: `ai_clients`, `ai_actions`
2. AI API key auth middleware
3. Intent schema + validator
4. Action executor (reuses existing task/project services)
5. Audit logging + rate limiting
6. In-app chat UI
7. External API key management UI
8. Observability + cleanup jobs

## Relation to other docs
- Builds on `docs/WORKSPACE_AI_KANBAN.md` (existing suggestion/validation model).
- Requires formal invitation flow before AI can assign unknown users.
- Depends on [Y] ABAC for clean permission enforcement across human + AI callers.
