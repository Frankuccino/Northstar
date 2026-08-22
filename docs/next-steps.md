# Northstar — Gaps + Actionable Next Steps

_Last updated: current session_

## Gap 1 — API Test Coverage (API)
### Status
Done.

**Totals: 31 tests**
- Employees: 25
- Auth: 6

Full breakdown in `northstar-api/README.md`.

## Gap 2 — DB Seed / Migration Flow
### Status
Done.

## Gap 3 — Auth Route Tests Verification
### Status
Done.

## Gap 4 — Manager Read Access
### Status
Done.

## Gap 5 — Users ↔ Employees Relation
### Status
Done.
- FK confirmed: `employees.user_id → users.id`
- Seed linkage verified and fixed
- Added relation response coverage in `tests/employees.test.ts`
- **31/31 tests passing**

## Gap 6 — Web Employee Pages
### Status
Done for dashboard CRUD. Route extraction to `/employees` deferred.

### Completed deliverables
- Shared `EmployeeForm` used by both create and edit flows
- `CreateEmployeeDialog` — self-contained dialog with Base UI trigger composition
- `EditEmployeeDialog` — controlled dialog driven by lifted state in `useEmployeeActions`
- `EmployeesTable` with `onEdit` and `onDelete` forwarding
- `EmployeeRowActions` dropdown menu (View / Edit / Delete)
- `ConfirmDeleteDialog` with React Query mutation and cache invalidation
- Delete flow wired: `useDeleteEmployee` + `employeeKeys.all` invalidation
- Build and type-check clean after fixing:
  - Base UI nested-button hydration errors in dialog and dropdown triggers (`render={...}` pattern)
  - TS 6.0 tsconfig issues (`baseUrl` deprecation silenced via `ignoreDeprecations: "6.0"`, invalid `exclude` removed from project references root config)

### Remaining / deferred
- Empty state when `data` is empty
- Loading skeleton while `isLoading` is true
- Protected route wrapper for `/employees` if that route is extracted later

## Gap 7 — Error UX / Polish
### Status
Pending.

### Intent
- Shared API error shape in backend
- Shared toast/alert component in frontend
- Apply to auth and employee flows
- Empty state + skeleton loaders

### Recommendation
Do not add a UI feedback library yet. Start with a small `src/lib/toast.tsx` wrapper using existing state/CSS. Promote to a library only once the component is used in 3+ places.

## Gap 8 — Seed Data / Users ↔ Employees Relation Integrity
### Status
Done.

## Execution Order
1. Register form confirm password validation
2. Toasts / shared error UX

## Current Application State (as of current session)
- Backend API: `northstar-api`
  - Auth routes: register/login/me, 6 tests passing
  - Employee CRUD routes: admin-only create/update/delete, admin+manager read, 25 tests passing
  - DB: Drizzle + Postgres, seed fixes applied, cleanup order fixed
  - Tests: **31/31 passing**
  - Security middleware added and wired:
    - `src/middleware/security.middleware.ts`: helmet wrapper with CSP disabled for now
    - `src/middleware/rate-limit.middleware.ts`: 100 req / 15 min, standard headers only
    - Both registered in `src/app.ts` after CORS, before routes
    - Rate-limit import aliased to avoid TS name collision (`rateLimit as rateLimiter`)
  - Test cleanup hardened: `cleanup()` now deletes test employees by constant email list (`VALID_EMPLOYEE.email`, `relation.employee@example.com`, `MANAGER_EMAIL`) instead of hardcoded strings, keeping test data fully driven by constants
- Frontend: `northstar-web`
  - Auth pages: login + register UI complete
    - Register now includes confirm password input and label
    - Confirm password validation pending in `RegisterForm`
  - Dashboard page + dashboard layout present
  - Employee pages: dashboard CRUD complete, route extraction deferred
  - Employee API client, hooks, and types in use

## Consolidated Current State
- Backend: employee CRUD + auth stable and tested
- Frontend: auth UI complete, dashboard employee CRUD complete
- Frontend next: confirm password validation in `RegisterForm`, then toast/error UX

## Backend Notes
- `package.json` `test` script was changed from `vitest` to `SKIP_RATE_LIMIT=true vitest`
- This sets an env var so `rate-limit.middleware.ts` `skip()` can bypass rate limiting during tests
- Behavior split:
  - `npm test` or `npm run test` = `SKIP_RATE_LIMIT=true` = rate limiter disabled for test runs
  - `npm run dev` = no env var = rate limiter active in development

## Security Review — Helmet Baseline
- `contentSecurityPolicy` is disabled in `security.middleware.ts`
- This is intentional; CSP is not planned for enablement at this stage
- Helmet is already providing hardened baseline security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy` if specified
  - HSTS if specified
- Rate limiter:
  - 100 requests per 15 minutes per client IP (global baseline, `rateLimiter`)
  - 10 requests per 15 minutes per client IP on `/register`, `/login`, `/refresh` (`authLimiter`, defect [C] — strict limiter for credential endpoints)
  - Skips when `SKIP_RATE_LIMIT=true`
  - Returns `429` + standard `RateLimit-*` headers
- Environment split:
  - Tests: rate limiter disabled via `SKIP_RATE_LIMIT=true`
  - Dev and above: rate limiter active, helmet active but CSP off

## Daily Time Tracking
- Backend today:
  - First principles build: 1h 30m
  - Additional backend session: 1h 20m
  - Additional backend session: 1h 30m
  - Total backend today: 4h 20m
- Added +1h 30m from Notion daily entry, update backend total accordingly
