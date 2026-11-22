# Inquiry Desk — Customer Inquiry Management System

A small full-stack app for a service team: a staff member **signs in**, **records a customer inquiry**, **finds it later**, and **moves it through its lifecycle** (New → In Progress → Resolved, with reopen).

| Part | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript, React Router, TanStack Query, Zod |
| Backend | Node.js + Express 5 + TypeScript, Zod, JWT in an httpOnly cookie |
| Database | PostgreSQL 17 (Docker) via Prisma 7 (schema + migrations) |
| Tests | Vitest + Supertest (API, real test DB) · Vitest + React Testing Library (UI) |

Design decisions and trade-offs: **[DECISIONS.md](DECISIONS.md)** · Tech-stack reasoning: [docs/TECH_STACK.md](docs/TECH_STACK.md)

---

## Prerequisites

- **Node.js 22.12+** (`node -v`)
- **Docker Desktop**, running (for PostgreSQL)

## Run it locally

From the repository root:

```bash
# 1. Start PostgreSQL (port 5434 on your machine; also creates a separate test database)
docker compose up -d

# 2. Backend: install, configure, create tables, add test data, start
cd server
npm install                 # also generates the Prisma client
cp .env.example .env        # defaults match docker-compose.yml
npx prisma migrate deploy   # create the tables
npm run db:seed             # test accounts + 4 sample inquiries
npm run dev                 # API on http://localhost:4000
```

In a **second terminal**:

```bash
# 3. Frontend
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

Open **http://localhost:5173** and sign in with a test account.

> The commands work in bash and in Windows PowerShell (run them one per line).
> The frontend dev server proxies `/api` to `localhost:4000`, so the browser only talks to one origin.

## Test accounts

All passwords: **`Password123!`** (local development only)

| Email | Role | Sees after seeding |
|---|---|---|
| `admin@example.com` | Admin | All inquiries; can assign them to anyone |
| `alice@example.com` | Staff | #1, #2 (created by / assigned to her) |
| `bob@example.com` | Staff | #3 |

Try: sign in as **Bob** and open `http://localhost:5173/inquiries/1` → *Inquiry not found* (the API refuses it, not just the UI).
Re-running `npm run db:seed` resets the sample data (ids start at #1 again).

## Run the tests

```bash
# API tests (38) — need the Docker database running; they use the separate inquiry_test database
cd server
npm test

# UI tests (7) — no backend needed (fetch is faked)
cd ../client
npm test
```

Other checks: `npm run typecheck` (server), `npm run build` and `npm run lint` (client).

## Rules the app enforces (in the API)

| Rule | Behaviour |
|---|---|
| **Sign-in** | Every `/api/inquiries` and `/api/users` route requires a valid login cookie → otherwise **401** |
| **Access** | Staff only reach inquiries they **created or are assigned to**; admins reach all. Anything else → **404** (same as "doesn't exist") |
| **Lifecycle** | `NEW → IN_PROGRESS → RESOLVED`, and `RESOLVED → IN_PROGRESS` (reopen). Anything else → **409** |
| **Stale data** | Updates must send the `version` they saw; if it changed meanwhile → **409** with the latest record |
| **Input** | Validated with Zod → **400** with a message per field; bad ids (`abc`, `0`, too large) → **400** |
| **Duplicates** | Same contact + subject within 10 minutes (that you can see) → **409** warning; resend with `confirmDuplicate: true` to save anyway |

Details and reasoning: [DECISIONS.md](DECISIONS.md).

## API

All responses are JSON. Errors always look like `{ "error": { "code", "message", "fields?", "details?" } }`.

| Method | Path | Body / query | Notes |
|---|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` | Sets httpOnly cookie |
| `POST` | `/api/auth/logout` | – | Clears cookie (204) |
| `GET` | `/api/auth/me` | – | Current user or 401 |
| `GET` | `/api/inquiries` | `?status=NEW&q=text&assigned=me&page=1&pageSize=20` | `q` searches name, contact, subject and `#id` |
| `POST` | `/api/inquiries` | `{ customerName, contact, subject, description, confirmDuplicate? }` | 201 |
| `GET` | `/api/inquiries/:id` | – | 404 if missing or not yours |
| `PATCH` | `/api/inquiries/:id/status` | `{ status, version }` | 409 on invalid transition or stale version |
| `PATCH` | `/api/inquiries/:id/assignee` | `{ assignedToId \| null, version }` | Admin only (403) |
| `GET` | `/api/users` | – | Admin only — people to assign to |
| `GET` | `/api/health` | – | Checks API + database |

## Project structure

```
docker-compose.yml          PostgreSQL (dev + test databases)
server/
  prisma/schema.prisma      data model · prisma/migrations/ · prisma/seed.ts
  src/modules/auth/         login, logout, me
  src/modules/inquiries/    *.schemas (validation) · *.policy (business rules) · *.service (queries) · *.routes (HTTP)
  src/middleware/           requireAuth, requireRole, error handler
  src/lib/                  AppError, validate()
  tests/                    API + rule tests
client/
  src/api/                  fetch wrapper (ApiError), TanStack Query hooks, cache setup
  src/auth/                 session hooks, route guard, current-user context
  src/pages/                Login, InquiryList, NewInquiry, InquiryDetail (+ tests)
  src/components/           StatusBadge, FormField, Alert, loading/empty/error states, StatusActions, AssigneeControl
```

## Troubleshooting

| Problem | Fix |
|---|---|
| App shows **"Cannot connect"** | The API isn't running (`npm run dev` in `server/`) or Docker/DB is down (`docker compose up -d`) |
| `port 5434 is already allocated` | Change `5434` in `docker-compose.yml` **and** in `server/.env` |
| `Cannot find module ... generated/prisma` | Run `npx prisma generate` in `server/` |
| Server tests fail to connect | Docker must be running. If the database volume is from an older setup without `inquiry_test`: run `docker compose down -v`, then `docker compose up -d`, then migrate + seed again (this deletes local data) |
