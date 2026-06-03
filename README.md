# Northstar

Full-stack TypeScript app: React frontend + Express API + PostgreSQL.

## Current Status

- Auth: register/login/profile with JWT and role middleware.
- Employees: API CRUD implemented with Zod validation and role checks.
- Tests: employee endpoint tests implemented with Vitest + Supertest.
- Database: seeded with 8 users and 20 employees.

## Repo Layout

Root: workspace scripts (`npm run dev`)
northstar-web: frontend app
northstar-api: backend app

## Project Structure

```
northstar/
├── package.json
├── northstar-web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layouts/
│   │   │   ├── providers/
│   │   │   └── routes/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   └── employees/
│   │   ├── lib/
│   │   └── main.tsx
│   └── package.json
└── northstar-api/
    ├── src/
    │   ├── app.ts
    │   ├── index.ts
    │   ├── controllers/
    │   ├── db/
    │   │   ├── index.ts
    │   │   ├── schema.ts
    │   │   ├── schema/users.ts
    │   │   ├── schema/employees.ts
    │   │   └── seed.ts
    │   ├── middleware/
    │   ├── routes/
    │   ├── schemas/
    │   ├── services/
    │   └── types/
    ├── drizzle/
    ├── tests/
    └── package.json
```

## Frontend

- React 19 + Vite + TypeScript
- Tailwind v4
- React Query
- React Hook Form + Zod
- Auth pages complete
- Employee pages/components pending

## Backend

- Node.js + Express + TypeScript
- Drizzle ORM + PostgreSQL
- Zod validation
- Feature-first structure under src/features
- Auth middleware + role middleware
- Employee service/controller/routes complete

## Database

- Schema push: drizzle-kit
- Generate migrations: drizzle-kit generate
- Seed: `npm run db:seed`
- Studio: drizzle-kit studio
- Seed produces: 8 users (admin, manager, C-level) + 20 employees

## Database Setup

1. Set `DATABASE_URL` in `.env`.
2. `npm install`
3. `npm run db:push` — apply schema to Postgres
4. `npm run db:seed` — load 8 users + 20 employees
5. `npm run dev` — start frontend and backend

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Test Accounts

admin@example.com / password123
manager@example.com / password123
