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
In progress (frontend owner-led, review by mentor).

### Deliverables
1. `northstar-web/src/features/employees/pages/employees-page.tsx`
2. `northstar-web/src/features/employees/pages/employee-form-page.tsx`
3. Delete confirmation UI
4. Error/loading UI and empty state
5. Protected route for `/employees`

### Route shape to match
```
/employees               (list / create)
/employees/:id           (view / edit)
```

### Existing frontend pieces to reuse
- `src/features/employees/api/employees.api.ts`
- `src/features/employees/hooks/use-employees.ts`
- `src/features/employees/types/employee.ts`

### shadcn components
| Component | Purpose | Install / Use |
|-----------|---------|---------------|
| `input` | Text inputs for employee form fields | `npx shadcn@latest add input` |
| `label` | Form field labels binding to inputs | `npx shadcn@latest add label` |
| `button` | Submit and cancel actions in forms | `npx shadcn@latest add button` |
| `card` | Page shell for create form | `npx shadcn@latest add card` |
| `dialog` | Delete confirmation modal | `npx shadcn@latest add dialog` |
| `toast` / `sonner` | Success/error feedback after create/update/delete | `npx shadcn@latest add toast sonner` |
| `skeleton` | Loading placeholders for list and form states | `npx shadcn@latest add skeleton` |
| `dropdown-menu` | Row actions for list items | `npx shadcn@latest add dropdown-menu` |
| `table` | Employee list rendering | `npx shadcn@latest add table` |

### Install order (create employee first)
- Install in this order for the create flow:
  1. `input`
  2. `label`
  3. `button`
  4. `card`
- Install `table` before building employee list pages
- Install `dialog`, `toast`, `skeleton` for delete/loading/error UX after list/create form is stable

### Recommended UI choices
- Loading UI: keep it Bulletproof-style; if missing, prefer a small utility component in `src/features/employees/components/` before adding a new dependency
- Skeleton loaders: build minimal wrappers around existing CSS tokens rather than adding a heavy library immediately
- Empty state: plain conditional render first; replace with a shared component after the shape is stable
- For delete confirmation: a small reusable confirm dialog in `src/lib/components/` if the component is generic enough

### Done checklist
- List renders seeded employees via existing API client
- Create form updates list on success
- Edit form pre-fills from fetched employee
- Delete asks for confirmation, then removes from list
- Route is protected for admin/manager per backend rules
- No new lint or type errors

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
1. ~~Gap 8~~ (done)
2. ~~Gap 5~~ (done)
3. Gap 6 — Web Employee Pages
4. Gap 7 — Error UX / Polish

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
  - Auth pages: login, register, protected/public route wrappers
  - Dashboard page + dashboard layout present
  - Employee pages: **in progress**
  - Employee API client, hooks, and types scaffolded

## Consolidated Current State
- Backend: employee CRUD + auth stable and tested
- Frontend: auth scaffold complete, employee UI being built next
- Frontend owner should prepare: route structure, reuse existing employee client/hooks/types, start minimal with conditional UI for empty/loading/error states

## Backend Notes
- `package.json` `test` script was changed from `vitest` to `SKIP_RATE_LIMIT=true vitest`
- This sets an env var so `rate-limit.middleware.ts` `skip()` can bypass rate limiting during tests
- Behavior split:
  - `npm test` or `npm run test` = `SKIP_RATE_LIMIT=true` = rate limiter disabled for test runs
  - `npm run dev` = no env var = rate limiter active in development

## Security Review — Helmet Baseline
- `contentSecurityPolicy` is disabled in `security.middleware.ts`
- This means there is **no CSP header** in responses right now
- Reasons paused for now:
  - Inline scripts/styles during active frontend work would be blocked by a strict policy
  - Easier to enable CSP once the frontend build is static and assets are fingerprinted
- Active protections from helmet that **are** in place (unless overridden elsewhere):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy` if specified
  - HSTS if specified
- Rate limiter:
  - 100 requests per 15 minutes per client IP
  - Skips when `SKIP_RATE_LIMIT=true`
  - Returns standard `RateLimit-*` headers
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
