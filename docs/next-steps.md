# Northstar — Gaps + Actionable Next Steps

_Last updated: current session_

## Current Tooling/Ops
- Stack: Node/Express/TS API, React 19 + Vite + TS frontend
- API validation: Zod
- DB: Drizzle + Postgres
- Tests: Vitest + Supertest
- State/data: React Query

---

## Gap 1 — API Test Coverage (API)
### Status
Done — employee CRUD tests and auth route tests implemented.
Run `npm test` to verify.

---

## Gap 2 — DB Seed / Migration Flow
### Status
Done — seed script and docs in place.

---

## Gap 3 — Auth Route Tests Verification
### What's missing
Auth tests added but not yet verified by running.

### Actionable
1. `cd northstar-api && npm test`
2. Review auth test results
3. Fix any failing cases before moving on

---

## Gap 4 — Manager Read Access
### What's missing
Manager role read/write boundary is not explicitly validated.

### Actionable
1. Add manager-specific test for GET /employees
2. Add manager-specific test for POST/PATCH/DELETE /employees
3. Adjust role middleware if assertions fail

---

## Gap 5 — Users ↔ Employees Relation
### What's missing
Relation exists in schema but needs end-to-end verification.

### Actionable
1. Confirm schema foreign key on employees.user_id
2. Verify seeded employee in DB is linked to seeded user
3. Add API response assertion for relation if exposed
4. Add one integration test for relation behavior

---

## Gap 6 — Web Employee Pages
### What's missing
Employee list/create/edit/delete UI not built.

### Actionable
1. Create `features/employees/pages/employees-page.tsx`
2. Create `features/employees/pages/employee-form-page.tsx`
3. Add delete confirmation and error/loading UI
4. Wire protected route for `/employees`

---

## Gap 7 — Error UX / Polish
### What's missing
Error shape standardization and frontend feedback are incomplete.

### Actionable
1. Define shared API error shape in backend
2. Add shared toast/alert component in frontend
3. Apply to auth and employee flows
4. Add empty state + skeleton loaders

---

## Execution Order
1. Gap 3 — Auth Route Tests Verification
2. Gap 4 — Manager Read Access
3. Gap 5 — Users ↔ Employees Relation
4. Gap 6 — Web Employee Pages
5. Gap 7 — Error UX / Polish
