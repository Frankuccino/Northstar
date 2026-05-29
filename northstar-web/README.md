# 📦 Northstar API

A Node.js + Express + TypeScript backend built with a feature-first architecture inspired by Bulletproof React principles (applied to backend structure).

## 🧠 Architecture Philosophy

This backend follows a modular, feature-based structure:

Each domain feature owns its routes, controllers, services, and types.

Instead of organizing by technical layers globally (controllers/services), logic is grouped by business feature.
```zsh
🏗️ Project Structure
src/
│
├── db/                  # Database connection + ORM setup
│   ├── index.ts
│   └── schema.ts
│
├── features/           # Feature modules (core architecture)
│   └── users/
│       ├── api/        # Request handlers / route definitions
│       ├── services/   # Business logic
│       ├── types/      # TypeScript types
│       └── validators/ # Request validation (Zod)
│
├── middleware/         # Global middleware (auth, error handling)
├── utils/              # Shared utilities
└── index.ts            # App entry point
```


## Feature-driven architecture
```zsh
.
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── public
│   ├── favicon.svg
│   └── icons.svg
├── README.md
├── src
│   ├── app
│   │   ├── index.tsx
│   │   ├── layouts
│   │   │   ├── auth-layout.tsx
│   │   │   └── dashboard-layout.tsx
│   │   ├── protected-route.tsx
│   │   ├── providers
│   │   │   ├── index.tsx
│   │   │   ├── query-provider.tsx
│   │   │   └── router-provider.tsx
│   │   ├── public-route.tsx
│   │   └── routes
│   ├── App.tsx
│   ├── components
│   │   └── ui
│   ├── features
│   │   ├── auth
│   │   │   ├── api
│   │   │   ├── components
│   │   │   ├── hooks
│   │   │   ├── index.ts
│   │   │   ├── pages
│   │   │   ├── schemas
│   │   │   ├── types
│   │   │   └── utils
│   │   │       └── token.ts
│   │   └── employees
│   │       ├── api
│   │       │   └── employee-query-keys.ts
│   │       ├── components
│   │       ├── hooks
│   │       ├── index.ts
│   │       ├── pages
│   │       ├── schemas
│   │       ├── types
│   │       └── utils
│   ├── index.css
│   ├── lib
│   │   ├── axios.ts
│   │   ├── cn.ts
│   │   ├── env.ts
│   │   ├── query-client.ts
│   │   └── utils.ts
│   ├── main.tsx
│   ├── pages
│   └── styles
│       └── global.css
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts

```


## 🧩 Core Design Principles
1. Feature-first organization

Each feature is self-contained:

```zsh
features/users/

```

A feature owns:

- routes / API layer
- business logic
- types
- validation rules

---

2. Separation of concerns

Instead of mixing everything in routes:

- api/ → request handling
- services/ → business logic
- db/ → database operations
- validators/ → input validation

---

3. Backend scalability mindset

This structure is designed for:

- easy feature expansion
- isolated logic changes
- team scalability
- clean API boundaries

---

## ⚙️ Tech Stack
- Node.js
- Express
- TypeScript
- PostgreSQL
- Drizzle ORM
- Zod (validation)

---

## 🔌 API Design (Example: Users Feature)
```zsh
GET    /users
POST   /users
GET    /users/:id
DELETE /users/:id
```
Each endpoint is implemented inside:

`features/users/`

---

## 🧱 Example Feature Structure (Users)
```zsh
features/users/
├── api/
│   └── users.routes.ts
├── services/
│   └── users.service.ts
├── types/
│   └── users.types.ts
├── validators/
│   └── users.schema.ts
```

## 🔄 Data Flow
Request → Route → Validator → Service → DB → Response

This keeps logic predictable and testable.

## 🧪 Current Focus
Building users feature end-to-end
Connecting Express → Drizzle → PostgreSQL
Establishing clean feature boundaries

## 🚀 Why this structure

This is inspired by Bulletproof React, adapted for backend:

avoids “god files” (big controllers/services)
scales per feature instead of per layer
improves maintainability
mirrors real production codebases


## 📌 Status
Phase: Initial architecture setup
Focus: Users feature (CRUD + DB integration)
