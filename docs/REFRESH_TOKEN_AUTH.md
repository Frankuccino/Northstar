# Refresh Token Auth (httpOnly Cookie) — Implementation Plan

_Status: Backend implemented (non-breaking). Frontend migration pending (user-led hands-on)._
_Last updated: current session_

## Goal
Replace the current `localStorage`-only access token with a secure two-token session:
- **Access token**: short-lived JWT (15 min), HS256, carries `id/email/role`. Sent in `Authorization: Bearer` header.
- **Refresh token**: opaque random string, stored server-side in `refresh_tokens`, delivered to the browser **only** via an `httpOnly`, `secure`, `sameSite=strict` cookie. Used to mint new access tokens at `/auth/refresh`.

This closes defect [A] (no revocation / non-functional logout) and [E] (no `iss`/`aud`) from the auth review.

## Design Decisions
- **Opaque refresh tokens, not JWTs.** Stored hashed (SHA-256) in Postgres. Server-side state enables revocation (single-device logout, "logout all", compromised-token kill). Rotation on every refresh with old-token invalidation limits replay.
- **Cookie attributes**: `httpOnly: true`, `secure: true`, `sameSite: "strict"`, `path: "/auth"`, `maxAge` matches refresh TTL (7d). Not readable by JS → XSS cannot exfiltrate it.
- **Backward compatible**: `/auth/login` STILL returns `token` in the JSON body so the existing frontend keeps working until migrated. Cookie is set in parallel.
- **Logout**: `/auth/logout` clears the DB row + expires the cookie.
- **Access token claims** now include `iss` (`northstar-api`) and `aud` (`northstar-web`); middleware validates both.

## Backend Changes (DONE this session)
| File | Change |
|------|--------|
| `src/db/schema/refresh-tokens.ts` | New `refresh_tokens` table (token hash, user FK, expiry, revoked). |
| `src/db/schema.ts` | Re-export new schema. |
| `src/lib/tokens.ts` | `signAccessToken`, `verifyAccessToken` (iss/aud), `generateRefreshToken`. |
| `src/lib/cookies.ts` | `REFRESH_COOKIE` name + `refreshCookieOptions(env)`. |
| `src/services/refresh-tokens.service.ts` | `issueRefreshToken`, `rotateRefreshToken`, `revokeRefreshToken`, `revokeAllForUser`. |
| `src/services/auth.service.ts` | `login` returns `{ user, accessToken }` + calls `issueRefreshToken`; added `getMe(id)`. |
| `src/controllers/auth.controller.ts` | `loginController` sets cookie; new `refreshController`, `logoutController`, `meController` fetches live user. |
| `src/middleware/auth.middleware.ts` | Renamed to `verifyAccessToken` (verifies iss/aud). |
| `src/routes/auth.routes.ts` | Added `/refresh` (public) and `/logout` (auth); `/me` now uses live user. |
| `src/app.ts` | Added `cookieParser()` before routes. |
| `tests/auth.test.ts` | +7 tests: refresh, rotation, revocation, logout, me live fetch. |
| `package.json` | Added `cookie` dependency (was transitive). |

Run: `cd northstar-api && npm install && npm run db:push && npm test`

## Frontend Migration (USER-LED — hands-on build, assistant review)
Follow Bulletproof React feature structure under `northstar-web/src/features/auth`.

1. **Token storage** (`features/auth/utils/token.ts`)
   - Remove `localStorage` access/refresh storage for the *refresh* token. The httpOnly cookie is now the refresh source — JS can't touch it.
   - Keep a short-lived **access token in memory only** (module-level `let accessToken` + `setAccessToken`/`getAccessToken`), optionally mirrored in `sessionStorage` if you need SPA reload survival. Do NOT use `localStorage` for tokens (XSS-exfiltratable).

2. **Axios interceptor** (`lib/axios.ts`)
   - On request: attach `Authorization: Bearer <accessToken>` from memory.
   - On `401`: call `POST /auth/refresh` (browser auto-sends the httpOnly cookie). On success, store new access token in memory and retry the original request once. On failure, clear in-memory token + redirect to `/login`.

3. **Login form** (`features/auth/components/login-form.tsx`)
   - `onSuccess`: call `setAccessToken(res.accessToken)` instead of `setToken(res.token)`. The cookie arrives automatically via `Set-Cookie`. Navigate to `/dashboard`.

4. **Logout** (`features/auth/hooks/use-logout.ts` + button)
   - Call `POST /auth/logout` (cookie auto-sent). On resolve: clear in-memory access token, redirect to `/login`.

5. **ProtectedRoute** (`app/protected-route.tsx`)
   - Stop decoding the JWT from localStorage. Instead: check in-memory access token presence. If absent, trigger a refresh attempt; if that fails, redirect to `/login`. Keep token `exp` check optional (server is source of truth).

6. **Types** (`features/auth/types/auth.ts`)
   - `AuthResponse` → `{ accessToken: string; user: User }` (rename `token` → `accessToken`).

7. **Schemas** (`features/auth/schemas/register-schema.ts`): add confirm-password (already noted as pending in `next-steps.md`).
   - Also consider server-side validation of password strength on the backend `register` (defect [F]).

## Security Notes
- `secure: true` means cookies only send over HTTPS. Local dev over plain HTTP will NOT receive the cookie. For local testing set `NODE_ENV=development` so `cookies.ts` drops `secure` (already handled). Ensure API and web share an origin or configure CORS `credentials` + matching `sameSite` accordingly.
- Refresh endpoint must be **strictly rate-limited** (per-IP + per-fingerprint) — add a dedicated limiter (defect [C] follow-up).
- Refresh token row must be cleaned periodically (expired/revoked) — add a maintenance job or rely on `expiresAt` filter in lookups.

## Defect [D] — DONE (this session)
- `src/schemas/auth.schema.ts` (new) enforces server-side registration validation: `name` (1–120), `email` (valid + ≤254), `password` (8–128 chars, must contain a letter AND a digit — passwords are NOT trimmed, as whitespace is part of the secret).
- `src/routes/auth.routes.ts` applies `validate(registerSchema)` to `POST /register` (consistent with the workspace routes' validate convention). The controller is unchanged — it still reads `email/password/name` from the body; zod rejects malformed input before it reaches the service.
- `confirmPassword` is intentionally NOT required yet: the frontend `RegisterPayload` does not send it (the confirm-password field is still pending in `RegisterForm`). When that field lands, add `confirmPassword` + a superRefine equality check to `registerSchema`.
- Verified by `tests/auth.test.ts`: short password (400) and all-letter password (400) rejected with validation error; valid registration still 201.
- `tests/employees.test.ts` fixtures updated to compliant passwords (`123456` → `AdminPass1`/`UserPass1`/`Manager123`); `cleanup()` now also deletes the manager user so stale weak-password rows from prior runs can't poison re-registration.

## Defect [C] — DONE (this session)
- `src/middleware/rate-limit.middleware.ts` now exports `authLimiter` (10 req / 15 min per IP) in addition to the global `rateLimiter` (100/15min).
- `authLimiter` is applied to `POST /register`, `POST /login`, `POST /refresh` in `src/routes/auth.routes.ts` — layered on top of the global limiter (defense in depth).
- Returns `429` with `RateLimit-*` standard headers and a JSON `error` message. Honors `SKIP_RATE_LIMIT=true` so the test suite is unaffected.
- Verified by `tests/auth.test.ts` (13 tests): the 11th login in the window is blocked with 429.
- `createProjectSchema` / `createTaskSchema` / `validateSuggestionSchema` / `approveCommitSchema` hardened (trim, lengths, required reason/justification). `createTask` reads `projectId` from URL param.
- Backend: `npm test` (auth suite green, includes refresh/rotation/revocation).
- Manual: login → inspect `Set-Cookie` (httpOnly, secure, sameSite=strict) → call `/auth/refresh` without body → new access token → call `/auth/logout` → refresh with old token → 401.

## Out of Scope (follow-up)
- Defect [B] role union centralization (admin|manager|employee vs type says user) — see `docs/WORKSPACE_AI_KANBAN.md`; the board needs this first.
- Defect [G] structured logger (replaces console.error TODO in error.middleware.ts).
