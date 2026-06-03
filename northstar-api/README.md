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

Total: **30 tests**

### Employees (`tests/employees.test.ts`) — 24 tests

#### GET /employees
- Unauthenticated → 401
- Invalid token → 401/403
- Admin → 200
- Non-admin → 403
- Manager → 200
- Manager create attempt → 403

#### POST /employees
- Unauthenticated → 401
- Non-admin → 403
- Invalid payload → 400
- Admin success → 201

#### GET /employees/:id
- Unauthenticated → 401
- Non-admin → 403
- Missing → 404
- Admin success → 200

#### PATCH /employees/:id
- Unauthenticated → 401
- Non-admin → 403
- Invalid payload → 400
- Missing → 404
- Admin success → 200

#### DELETE /employees/:id
- Unauthenticated → 401
- Non-admin → 403
- Missing → 404
- Admin success → 200
- Already deleted → 404

### Auth (`tests/auth.test.ts`) — 6 tests

#### POST /auth/register
- Success → 201
- Duplicate email → 400

#### POST /auth/login
- Success with token → 200
- Invalid credentials → 400

#### GET /auth/me
- Unauthenticated → 401
- Authenticated → 200

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
