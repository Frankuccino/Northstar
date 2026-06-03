# Northstar API

A Node.js + Express + TypeScript backend.

## Scripts

- `npm run dev` — start API with tsx watch
- `npm test` — run Vitest
- `npm run db:push` — push schema to Postgres
- `npm run db:generate` — generate drizzle migrations
- `npm run db:seed` — seed users and employees
- `npm run db:studio` — drizzle studio UI

## Test Coverage

### Employees (`tests/employees.test.ts`)
- GET /employees (unauthenticated 401, invalid token 401/403, admin 200, non-admin 403)
- POST /employees (unauthenticated 401, non-admin 403, invalid payload 400, success 201)
- GET /employees/:id (unauthenticated 401, non-admin 403, missing 404, success 200)
- PATCH /employees/:id (unauthenticated 401, non-admin 403, invalid payload 400, missing 404, success 200)
- DELETE /employees/:id (unauthenticated 401, non-admin 403, missing 404, success 200, already deleted 404)

### Auth (`tests/auth.test.ts`)
- POST /auth/register (success 201, duplicate email 400)
- POST /auth/login (success 200 with token, invalid credentials 400)
- GET /auth/me (unauthenticated 401, authenticated 200)

### Not yet covered
- Manager read-only rules
- Users ↔ Employees relation assertions
- Password hashing edge cases

Run all with `npm test`.

## First run

1. Set `DATABASE_URL`.
2. Run `npm install`.
3. Run `npm run db:push`.
4. Run `npm run db:seed`.
5. Start API with `npm run dev`.

## Test accounts

- admin@example.com / password123
- manager@example.com / password123
