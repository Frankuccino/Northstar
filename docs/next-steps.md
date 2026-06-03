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

**Totals: 30 tests**
- Employees: 24
- Auth: 6

Full breakdown in `northstar-api/README.md`.

---

## Gap 2 — DB Seed / Migration Flow
### Status
Done — seed script and docs in place.

---

## Gap 3 — Auth Route Tests Verification
### Status
Done — 28 tests reported passing; see README.

---

## Gap 4 — Manager Read Access
### Status
Done — manager read allowed, manager write blocked.

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
1. Gap 5 — Users ↔ Employees Relation
2. Gap 6 — Web Employee Pages
3. Gap 7 — Error UX / Polish
