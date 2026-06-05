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

## Current Application State (as of 2026-06-03)
- Backend API: `northstar-api`
  - Auth routes: register/login/me, 6 tests passing
  - Employee CRUD routes: admin-only create/update/delete, admin+manager read, 25 tests passing
  - DB: Drizzle + Postgres, seed fixes applied, cleanup order fixed
  - Tests: **31/31 passing**
- Frontend: `northstar-web`
  - Auth pages: login, register, protected/public route wrappers
  - Dashboard page + dashboard layout present
  - Employee pages: **in progress**
  - Employee API client, hooks, and types scaffolded

## Consolidated Current State
- Backend: employee CRUD + auth stable and tested
- Frontend: auth scaffold complete, employee UI being built next
- Frontend owner should prepare: route structure, reuse existing employee client/hooks/types, start minimal with conditional UI for empty/loading/error states
