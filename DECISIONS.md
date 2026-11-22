# Decisions

## Assumptions
- A small internal team (a handful of staff + an admin). Accounts are seeded; no registration or password reset.
- "A way to contact them" = **one** field holding an email **or** phone number (validated as either).
- Staff normally handle what they record; an admin distributes work. So the one extra field I added is **Assignee** — it directly answers the brief's problem ("who is handling a request").
- Hard deletes are out of scope; "record no longer exists" is handled as a normal 404.

## Design choices

**1. Access rule lives in one function and is part of every query.**
Staff can reach inquiries they **created or are assigned to**; admins reach all; only admins can reassign.
`accessScope(user)` (server/src/modules/inquiries/inquiry.policy.ts) returns a Prisma `where` filter that every read and update starts from, so the rule can't be forgotten in one endpoint. A forbidden record returns **404, not 403** — identical to a missing one — so ids can't be probed. The UI hides nothing for security; it just reflects what the API returns.

**2. Explicit lifecycle + optimistic concurrency.**
Allowed: `NEW → IN_PROGRESS → RESOLVED`, `RESOLVED → IN_PROGRESS` (reopen — a customer may come back). Skipping straight to Resolved, returning to New, or "changing" to the same status → **409** with a message naming the allowed next step. The server also returns `allowedNextStatuses`, so the UI only shows valid buttons but never decides the rule.
Every inquiry has a `version`. Updates send the version they saw, and the write is one statement: `UPDATE … WHERE id = ? AND version = ?`. If 0 rows change, someone else won → **409 VERSION_CONFLICT** with the latest record, which the UI shows with a clear warning. A test fires two simultaneous updates and asserts exactly one wins.

**3. One error shape, end to end.**
The API throws `AppError(code, message, {fields, details})` and one handler turns everything into `{ error: { code, message, fields?, details? } }` (stack traces never leave the server). The frontend's single `api()` wrapper converts that into an `ApiError`, so components branch on codes (`VERSION_CONFLICT`, `POSSIBLE_DUPLICATE`) rather than parsing text. Validation runs in the form for guidance and again in the API with Zod, which rejects bad data independently.

**Duplicates / missing data policy:** missing or invalid fields → 400 with a message per field; the form keeps what was typed when a save fails. Same contact + subject within 10 minutes (among inquiries the user can see) → a **warning, not a block** ("Save anyway"), because a customer can genuinely ask twice. The submit button is disabled while saving.

## Trade-off I accepted
**No real-time updates.** A second tab learns about changes when it regains focus (refetch-on-focus) or when it tries to save (409). I chose this over WebSockets because the version check already guarantees nothing is silently overwritten, and live sync would add a lot of moving parts for a small team. Cost: a user can look at an outdated status until they refocus or act.
Smaller one: a **JWT can't be revoked** before it expires. I keep sessions to 8 hours and reload the user from the database on every request, so a deleted user or changed role takes effect immediately.

## Testing
- **Backend (38, Vitest + Supertest, real Postgres test DB):** 401 on every protected route, forged token, identical login errors, staff blocked from another person's inquiry (and the DB unchanged), every status pair, stale version, simultaneous updates, validation, bad ids, duplicates.
- **Frontend (7, React Testing Library, fetch faked):** empty form shows all errors and sends nothing; invalid contact; duplicate warning → "Save anyway"; failed save keeps input; only allowed status buttons; version-conflict warning; not-found state.
- I checked the tests are meaningful by temporarily breaking the access rule, a transition, form validation and the conflict warning — each made tests fail.
- **Gaps:** no end-to-end browser test (I tested the full workflow manually, including two tabs); the 10-minute duplicate window isn't tested at its edges (needs a fake clock); list filters/pagination UI has no automated test; no load testing.

## What I would improve next
1. End-to-end tests (Playwright) for the full workflow and the three situations in the brief.
2. A status history / activity log ("what happened last") — the brief's other pain point.
3. Rate-limit the login endpoint; CSRF token if the frontend is ever served from another site.
4. Share one validation schema package between client and server instead of mirroring rules.

## Use of AI
I used Claude (an AI coding assistant) to discuss stack options, scaffold code, and explain things as we built step by step. I reviewed and tested every part, and I can explain all of it.
- **Accepted:** the single-statement version check (`updateMany … where version`) — I verified it with a concurrent-request test.
- **Changed:** it recommended raw SQL with `pg`; I chose **Prisma** for typed queries and built-in migrations, and accepted that I need to understand the SQL it generates (I read the migration file).
- **Rejected / corrected:** the npm `latest` tag for Prisma was an **8.0 release candidate**; we pinned the stable 7.10.1 instead. Manual browser testing also caught AI-written bugs that I had fixed: signing out showed a blank page (a component read a `null` user before the route guard redirected, and `queryClient.clear()` detached the guard from the session data), and the post-login redirect ignored the link the user had opened.
