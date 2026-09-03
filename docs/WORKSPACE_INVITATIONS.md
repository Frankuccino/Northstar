# Northstar — Formal Invitation Model

_Status: Design / pre-implementation_
_Last updated: current session_

## One-liner
Project members invite collaborators by email. The recipient gets a secure,
single-use accept link; if they already have an account they join immediately,
otherwise they create one first. Invitations become immutable project membership.

## Why this over “all users”
- Prevents unauthorized assignment to arbitrary accounts.
- Gives projects controlled onboarding.
- Creates an auditable membership list.
- Enables per-project roles later without schema churn.

## User flow

1. Inviter enters email in task-detail assignee picker or project settings.
2. System checks:
   - already a member → assign immediately, no invite needed
   - pending invite exists → return existing invite, no duplicate
   - new email → create invitation + send email
3. Recipient clicks accept link.
4. If authenticated → accept + join project.
5. If unauthenticated → register/login → accept + join project.
6. Task optionally auto-assigned on acceptance.
7. Invitation record marked accepted and becomes immutable.

## Data model

### invitations
- `id` PK
- `email` not null
- `projectId` not null FK
- `invitedById` not null FK
- `token` not null unique, 128-bit random, stored hashed
- `status` not null default `pending` enum: `pending`, `accepted`, `expired`, `revoked`
- `expiresAt` not null default `now() + 7 days`
- `acceptedAt` nullable timestamp
- `createdAt` not null default `now()`

Indexes:
- unique partial index on `(email, projectId)` where `status = 'pending'`
- index on `token` for lookup
- index on `expiresAt` for cleanup

### project_members
- `projectId` not null FK
- `userId` not null FK
- `role` not null default `member` enum
- `joinedAt` not null default `now()`
- primary key `(projectId, userId)`

Indexes:
- index on `userId` for “my projects”

## Invitation rules
- One pending invite per email per project.
- Single-use token: invalidated on accept/revoke.
- TTL: 7 days; cleanup job expires stale rows.
- No email enumeration: 404 for unknown token, same response for valid/expired.
- Inviter must have invite permission today: `admin`/`manager`; signature future-proof for ABAC.
- AI clients cannot send invites autonomously; they can suggest invite actions for human approval.

## API surface

- `POST /workspace/projects/:id/invitations` — create invite (auth + invite permission required)
- `GET /workspace/projects/:id/invitations` — list pending/accepted invites (admin/manager)
- `POST /workspace/invitations/accept` — accept with token (public but token-gated)
- `DELETE /workspace/projects/:id/invitations/:invitationId` — revoke pending invite (admin/manager)

## Email
- Provider abstraction behind env config (`EMAIL_PROVIDER`, provider API key).
- Dev: console log the accept link; no email sent.
- Prod: SendGrid / Resend / SES.
- Accept link: `${CLIENT_URL}/invitations/accept?token=...`
- Template: project name, inviter name, accept button, expiry note.

## Frontend
- Task-detail assignee picker:
  - existing members in dropdown
  - “Invite by email” input at bottom
  - pending invites shown as disabled option with status
- Project settings:
  - pending invites list + revoke
  - accepted invites read-only history
- Accept page:
  - `/invitations/accept?token=...`
  - states: loading, success, expired/invalid, login-to-continue

## Sequencing
1. DB schema + migrations for `invitations` + `project_members`
2. Token generation + hashing + accept endpoint
3. Email service abstraction + provider config
4. Invite CRUD endpoints + permission checks
5. Frontend: invite input + accept page
6. Cleanup job / TTL enforcement
7. Replace current assignee picker source from all users → project members

## Security
- Tokens stored hashed; raw token shown once at creation.
- Accept endpoint public but useless without token.
- Invite creation rate-limited per inviter.
- No PII in logs beyond email + project/actor IDs.
- Revoked/expired invites cannot be accepted.

## Relation to other docs
- Required before hybrid AI integration can safely assign unknown users.
- Supersedes current unconstrained assignee picker.
- Depends on auth hardening ([C] rate limiting) for invite endpoint protection.
