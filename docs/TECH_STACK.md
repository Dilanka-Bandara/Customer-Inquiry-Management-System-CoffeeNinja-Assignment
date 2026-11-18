# Tech Stack & Design Choices — Explained Simply

> Project: **Customer Inquiry Management System** (Coffee Ninja assessment)
>
> This file explains **what tools we use**, **why we picked them**, and the **good and bad sides** of each one.
> It is written in simple English so that even a beginner can follow it.

---

## 1. The Big Picture (How the app works)

Think of the app like a small restaurant:

| Restaurant part | App part | What it does |
|---|---|---|
| 🧑‍🍳 Dining room (what customers see) | **Frontend** (React) | The screens staff click on: login page, inquiry list, forms |
| 🧾 Waiter | **API** (Express) | Takes requests from the screen, checks rules, brings back answers |
| 🗄️ Kitchen storage room | **Database** (PostgreSQL) | Keeps all the data safely, even after the computer restarts |

```
 [ Browser: React app ]  --HTTP request-->  [ Express API ]  --SQL-->  [ PostgreSQL ]
          ^                                       |
          |------------- JSON response -----------|
```

**Important rule:** The screen (frontend) is never trusted. Anyone can open browser tools and change the screen.
So **all real checks happen in the API** (the waiter checks every order, even if the menu looks correct).

---

## 2. Our Final Stack (Summary Table)

| Layer | Tool we chose | One-line reason |
|---|---|---|
| Frontend | **React + Vite** | Simple, fast, clearly separate from the backend |
| Language | **TypeScript** (front and back) | Catches mistakes before the app runs |
| Backend | **Node.js + Express** | Required by the brief; small and easy to understand |
| Database | **PostgreSQL** | Required by the brief; reliable and strict about data |
| Database tool | **Prisma** (ORM) | Lets us write database code in TypeScript, with migrations |
| Running the DB | **Docker Compose** | Start PostgreSQL with one command, no install needed |
| Login | **JWT inside an httpOnly cookie** | Safe login that the backend checks on every request |
| Validation | **Zod** | One clear rule list for "what is valid data" |
| Data fetching (UI) | **TanStack Query** | Handles loading, errors and refreshing for us |
| Page routing (UI) | **React Router** | Different pages: `/login`, `/inquiries`, `/inquiries/:id` |
| Password safety | **bcrypt** | Stores passwords as scrambled hashes, never plain text |
| Tests | **Vitest + Supertest + React Testing Library** | Test the API rules and the screen behaviour |

---

## 3. Each Choice Explained

### 3.1 Frontend: React + Vite

**What is it?**
- **React** is a library for building screens out of small pieces called *components* (like LEGO blocks: a `Button`, a `StatusBadge`, an `InquiryForm`).
- **Vite** is the tool that starts the React app on your computer and builds it. It is very fast.

**Why it fits this project best**
- The brief says the backend **must be Express**. A plain React app only shows screens and talks to Express. Everything is clear: *frontend = screens, Express = logic*.
- Next.js (the other option) has its own built-in server. Then we would have **two servers**, and a reviewer might ask *"why not use Next.js API routes?"*. That adds confusion we don't need.

| ✅ Pros | ❌ Cons |
|---|---|
| Very simple idea: React only does screens | We must add a router and data-fetching tool ourselves |
| Very fast to start and reload while coding | No server-side rendering (not needed for an internal staff tool) |
| Easy to test with React Testing Library | Not as "trendy" as Next.js on a CV |
| Easy to explain in the interview | |

**Option we did NOT pick:** Next.js — powerful, but too much for this task and mixes two backends.

---

### 3.2 Language: TypeScript

**What is it?**
TypeScript is JavaScript **plus types**. A type says what shape data must have.
Example: an inquiry's `status` can only be `"NEW" | "IN_PROGRESS" | "RESOLVED"`. If you write `"DONE"` by mistake, the editor shows a red line **before** you run the code.

**Why it fits this project best**
- The frontend and backend both talk about the same things (Inquiry, User, Status). Types keep them in agreement.
- Reviewers see it as careful, professional work.

| ✅ Pros | ❌ Cons |
|---|---|
| Finds many bugs while typing, not at runtime | A bit more setup (config files) |
| Editor auto-complete is much better | Type errors can feel confusing at first |
| Code is easier to read ("what does this function return?") | Slightly more code to write |

**Option we did NOT pick:** plain JavaScript — faster to start, but mistakes only appear when the app breaks.

---

### 3.3 Backend: Node.js + Express

**What is it?**
- **Node.js** lets us run JavaScript/TypeScript on a server (not only in a browser).
- **Express** is a small framework for building an API. You write *routes* like:
  `POST /api/inquiries` → "create a new inquiry".

**Why it fits this project best**
- It is **required by the brief**.
- Express is small. We control everything ourselves: routes, middleware (checks that run before a route), and error handling. This shows our skill clearly.

| ✅ Pros | ❌ Cons |
|---|---|
| Required, so no risk | Very "bare" — we must organise folders ourselves |
| Huge community, lots of help online | No built-in validation or structure (we add Zod) |
| Middleware makes auth checks easy to apply to many routes | Easy to write messy code if not careful |

---

### 3.4 Database: PostgreSQL (run with Docker)

**What is it?**
- **PostgreSQL** is a database. It stores data in **tables** (like Excel sheets, but much stronger and safer).
- **Docker** runs PostgreSQL inside a small "box" (container), so you don't need to install it on Windows.

**Why it fits this project best**
- PostgreSQL is **required by the brief**.
- It is strict: it can refuse bad data (for example, an empty customer name, or a status that does not exist).
- With Docker, the reviewer just runs `docker compose up -d` and the database is ready. "Keep setup straightforward" — the brief asks for exactly this.

| ✅ Pros | ❌ Cons |
|---|---|
| Very reliable; data is never "half saved" (transactions) | Need Docker Desktop installed and running |
| Enforces rules (required fields, allowed values, relations) | Docker uses some memory on your laptop |
| Docker = same setup on every computer | One more tool to learn |

---

### 3.5 Database Tool: Prisma (ORM)

**What is it?**
An **ORM** lets you talk to the database using TypeScript code instead of writing SQL by hand.

```ts
// Prisma: find all NEW inquiries
prisma.inquiry.findMany({ where: { status: "NEW" } });
// Same as SQL: SELECT * FROM "Inquiry" WHERE status = 'NEW';
```

Prisma has three parts:
1. **`schema.prisma`** — one file that describes our tables (User, Inquiry).
2. **Migrations** — saved history of database changes, so anyone can build the same tables. (The brief asks for "database setup or migrations".)
3. **Prisma Client** — the typed code we use to read/write data.

**Why it fits this project best**
- Fast to build normal create/read/update features.
- Migrations and seed data (test accounts) come built in.
- Auto-complete knows our table columns, so fewer typos.

| ✅ Pros | ❌ Cons |
|---|---|
| Easy, readable database code | Hides the real SQL — we must still understand what it does |
| Built-in migrations and seeding | Extra "generate" step after changing the schema |
| Fully typed results (works great with TypeScript) | Bigger dependency than plain `pg` |
| Safe from SQL injection by default | Some advanced queries are awkward |

**How we will still show database skill:** we will design good **enums**, **relations**, **indexes**, and use a **conditional update** (`updateMany` with a `where` on the version number) for safe status changes. We will explain this in the interview.

**Options we did NOT pick:**
- *Raw SQL with `pg`* — shows SQL skill well, but more manual work.
- *Drizzle* — nice, but newer and less familiar.

---

### 3.6 Login: JWT inside an httpOnly Cookie

**What is it?**
- When you log in, the server checks your email and password. If correct, it creates a **JWT** (a signed "ticket" that says *"this is user 5, role STAFF"*).
- The server puts this ticket in a **cookie** marked **httpOnly**. This means **JavaScript in the browser cannot read it**. The browser just sends it automatically with every request.
- On every API request, a **middleware** checks the ticket. No ticket or bad ticket → **401 Unauthorized**.

**Why it fits this project best**
- The brief says: *"Authentication must be enforced by the backend."* This is exactly that — the API checks every request, not the screen.
- httpOnly cookies are safer than saving the token in `localStorage` (where a bad script could steal it).

| ✅ Pros | ❌ Cons |
|---|---|
| Server checks every request (real security) | We cannot "cancel" a ticket before it expires (we keep expiry short, e.g. 8 hours) |
| Token cannot be stolen by page JavaScript | Need correct CORS + cookie settings between ports 5173 and 4000 |
| No session table needed (stateless) | Slightly harder to debug than a header token |

**Options we did NOT pick:**
- *Server sessions in database* — can log out instantly, but more moving parts.
- *Token in localStorage* — simplest, but less secure; reviewers may point it out.

---

### 3.7 Validation: Zod

**What is it?**
Zod lets us write **rules for data** in one place:

```ts
const createInquirySchema = z.object({
  customerName: z.string().trim().min(2, "Name is too short"),
  contact:      z.string().trim().min(3, "Add an email or phone number"),
  subject:      z.string().trim().min(3).max(120),
  description:  z.string().trim().min(10).max(2000),
});
```

**Why it fits:** The brief asks *"Does the UI guide them? Does the API independently reject bad data?"*
- The **API** uses Zod to reject bad data with **400 Bad Request** and clear field messages.
- The **form** uses the same rules to show friendly messages before sending.

| ✅ Pros | ❌ Cons |
|---|---|
| One set of rules, used in two places | One more library to learn |
| Clear error messages per field | Must keep front and back rules in sync (we share them) |
| Works perfectly with TypeScript types | |

---

### 3.8 Frontend Helpers: TanStack Query + React Router

- **React Router** → gives us pages: `/login`, `/inquiries`, `/inquiries/new`, `/inquiries/:id`.
- **TanStack Query** → handles server data for us:
  - shows **loading** state while waiting,
  - shows **error** state if something fails,
  - **refetches when you come back to the tab** (helps with stale data in two tabs).

| ✅ Pros | ❌ Cons |
|---|---|
| Loading / error / empty states become simple | New concepts: "query keys", "invalidation" |
| Automatic refresh on tab focus | Another dependency |
| Less custom `useEffect` code (fewer bugs) | |

---

### 3.9 Tests: Vitest + Supertest + React Testing Library

- **Vitest** — runs our tests (fast, works great with Vite).
- **Supertest** — sends fake HTTP requests to our Express API in tests.
  *Example test:* "a STAFF user opening someone else's inquiry gets **404**."
- **React Testing Library** — tests the screen like a real user does.
  *Example test:* "clicking Save with an empty name shows the message *Name is required*."

| ✅ Pros | ❌ Cons |
|---|---|
| Same test tool for front and back | Backend tests need a test database running |
| Tests real behaviour, not internal details | Writing good tests takes time |

---

## 4. Our Business Rules (Engineering Decisions)

The brief asks us to **decide** these rules and **enforce them in the API**.

### 4.1 Who can see what? (Access rule)

| Role | Can see | Can change |
|---|---|---|
| **STAFF** | Only inquiries they **created** or are **assigned to** | Same inquiries |
| **ADMIN** | **All** inquiries | All, and can **assign** inquiries to staff |

- If a STAFF user opens a direct link to someone else's inquiry → API returns **404 Not Found**.
  *Why 404 and not 403?* So we don't even confirm that the inquiry exists (safer).

✅ **Pro:** realistic, and easy to demonstrate "direct link I'm not allowed to see".
❌ **Con:** a staff member cannot help with a colleague's inquiry unless an admin assigns it.

### 4.2 Which status changes are allowed?

```
   NEW ──────► IN_PROGRESS ──────► RESOLVED
                    ▲                  │
                    └──── reopen ──────┘
```

| From → To | Allowed? |
|---|---|
| New → In Progress | ✅ |
| In Progress → Resolved | ✅ |
| Resolved → In Progress (reopen) | ✅ |
| New → Resolved (skip) | ❌ 409 Conflict |
| Anything → New | ❌ 409 Conflict |

✅ **Pro:** someone must actually work on an inquiry before closing it; reopening is possible if the customer comes back.
❌ **Con:** for very quick fixes staff need two clicks.

### 4.3 Two tabs showing old data (stale data)

- Every inquiry has a **`version`** number (starts at 1, goes up by 1 on each change).
- When you change status, the screen sends the version it saw.
- If the database version is different (someone else changed it), the API answers **409 Conflict**.
- The screen shows: *"This inquiry was updated elsewhere. Reload to see the latest."*
- Also, TanStack Query **refreshes when you return to the tab**.

✅ **Pro:** nobody silently overwrites someone else's change.
❌ **Con (trade-off we accept):** no live real-time updates (no WebSockets). You see changes on focus/reload, not instantly.

### 4.4 Missing information and double submit

- **Missing / invalid data:** the form shows field errors; the API also rejects it with **400** (never trust the screen).
- **Double click on Save:** the Save button is disabled while saving.
- **Same inquiry submitted again:** if the same contact + subject was saved in the last few minutes, we show a **warning** (not a hard block) — because a real customer *can* ask twice.

✅ **Pro:** simple and fair. ❌ **Con:** not a full duplicate-detection system (the brief says not to build one).

### 4.5 Our one extra field: **Assignee**

The brief's main problem is: *"Staff lose track of who is handling a request."*
An **assignee** field answers exactly that, and it powers our access rule.
Staff can filter the list by **"Assigned to me"**.

---

## 5. Error Responses (Predictable Failures)

| Situation | HTTP code | What the user sees |
|---|---|---|
| Bad or missing form data | **400** | Field messages under each input |
| Not logged in / expired login | **401** | Sent back to the login page |
| Inquiry not found / not allowed / invalid ID | **404** | "Inquiry not found" page with a link back |
| Invalid status change or stale version | **409** | Clear message explaining what happened |
| Server problem | **500** | "Something went wrong, please try again" |

All errors use **one JSON shape**, for example:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Please fix the highlighted fields", "fields": { "subject": "Subject is required" } } }
```

---

## 6. Why This Whole Stack Is the Best Fit

1. **It follows the brief exactly** — React, Node + Express, PostgreSQL.
2. **Clear separation** — screens in React, rules in Express, data in PostgreSQL. Easy to explain.
3. **Security is real** — the backend checks login and access on every request.
4. **Good for the marking table** — validation (Zod), clean API errors, a proper data model (Prisma), and loading/error states (TanStack Query) all map to points.
5. **Easy setup for the reviewer** — `docker compose up`, `npm install`, `npm run dev`.
6. **Small enough to fully understand** — important, because the interview may ask you to explain or change any part.

---

## 7. Quick Glossary (for beginners)

| Word | Simple meaning |
|---|---|
| **API** | The part of the server that receives requests and sends answers (JSON) |
| **Endpoint / Route** | One address on the API, e.g. `GET /api/inquiries` |
| **Middleware** | Code that runs before a route, e.g. "is this user logged in?" |
| **JWT** | A signed ticket that proves who you are |
| **Cookie (httpOnly)** | Small data the browser sends automatically; httpOnly = page JS can't read it |
| **ORM** | A tool to use the database with code instead of raw SQL |
| **Migration** | A saved step that creates or changes database tables |
| **Seed** | Starting data, like test user accounts |
| **Enum** | A list of allowed values, e.g. NEW / IN_PROGRESS / RESOLVED |
| **Validation** | Checking that data is correct before saving it |
| **Stale data** | Old information still shown on a screen after it changed |
| **409 Conflict** | "Your request clashes with the current state of the data" |
