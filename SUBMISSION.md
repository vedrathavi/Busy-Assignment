# Submission

## Links

- **GitHub repository:** https://github.com/vedrathavi/Busy-Assignment
- **Live application:** https://busy-crm.vercel.app
- **Live backend API:** https://busy-backend-za64.onrender.com

## Notes for the reviewer

- **Render Cold Start**: The backend is hosted on Render's free tier, which spins down after periods of inactivity. If the service is idle, the initial request / cold start may take ~30–50 seconds to wake up. Once active, all requests and database queries are fast and responsive.
- **Test Suite**: The repository includes a full automated test suite with **242 passing integration tests** across 10 test suites covering all 10 core goals, role boundaries, decimal currency precision, transition state machine rules, and alert lifecycles. Run `npm test` in the `backend/` directory to execute.

## Demo credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Sales Manager** | `manager@busy.com` | `Password123!` | Full team pipeline, bulk reassign & advance, reopen closed deals, company management |
| **Sales Rep (Alex)** | `alex@busy.com` | `Password123!` | Scoped to owned companies/deals and deal collaborations (e.g. Deal 3, Deal 10) |
| **Sales Rep (Priya)** | `priya@busy.com` | `Password123!` | Scoped to owned companies/deals and deal collaborations (e.g. Deal 3, Deal 4) |
| **Sales Rep (Marcus)** | `marcus@busy.com` | `Password123!` | Scoped to owned companies/deals |

## Stack

| Layer | What you used | Why |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui tokens, TanStack Query, Zustand, React Router v7, Lucide Icons, Recharts | Fast client-side SPA with type-safety, responsive layout, dark theme, server-state caching, and data visualization. |
| **Backend** | Node.js, Express, TypeScript, Zod, Prisma ORM, JWT, bcryptjs | Type-safe REST API with strict runtime request validation (Zod), atomic transactions (`$transaction`), pure transition policy engine, and server-side authorization guards. |
| **Database** | PostgreSQL on Supabase | Robust ACID transactions, relational foreign keys, compound indexes, native `DATE` and `DECIMAL(14,2)` precision, and connection pooling. |
| **Hosting** | Vercel (Frontend) + Render (Backend) + Supabase (Database) | Serverless frontend SPA with client-side routing rewrites, persistent containerized Node.js web service, and managed cloud PostgreSQL. |

## Goal checklist

| # | Goal | Status | Notes |
|---|---|:---:|---|
| **1** | Accounts and roles | **Done** | Server-enforced roles (`MANAGER`, `SALES_REP`), JWT authentication, bcrypt hash check, generic 401 error. Managers manage all team companies/deals and reopen deals; Sales Reps are strictly scoped to owned/collaborated deals. |
| **2** | Companies | **Done** | `POST /api/companies`, `PATCH /api/companies/:id`, `POST /api/companies/:id/archive`, `POST /api/companies/:id/restore`. Scoped Rep visibility (`ownerId` or active deal participant). Archiving hides company without deleting associated deals. |
| **3** | Deals inside companies | **Done** | 1:1 Company association, exact decimal currency (`Prisma.Decimal(14,2)`), expected close date (`DATE`), owning rep. Soft-deletion with `deletedAt`, history preservation, dedicated `/trash` view, and company details deal list. |
| **4** | A deal lifecycle with rules | **Done** | Strict forward transitions (`NEW → QUALIFIED → PROPOSAL → NEGOTIATION → WON/LOST`) with fixed stage probabilities. 1-step backward moves enforce mandatory reason. Closed deals locked; Managers can reopen restoring `previousStage`. Invalid skips/jumps rejected with 400. |
| **5** | Collaborators | **Done** | Unlimited Rep collaborators per deal. Only Manager or Deal Owner can add/remove. Reps see combined owned + collaborated deals. Mutual exclusion between owner and collaborator enforced. |
| **6** | Finding deals | **Done** | 100% server-side search (`title`, `company`), filters (`companyId`, `stage`, `ownerId`), sorting (`value`, `expectedCloseDate`, `updatedAt`), and server-side pagination with exact total match counts. Zero client-side filtering leaks. |
| **7** | Acting on many deals at once | **Done** | Manager bulk-reassign (`POST /api/deals/bulk/reassign`) and bulk-advance (`POST /api/deals/bulk/advance`) with per-deal partial success reporting (`{ requested, succeeded, failed, results }`). Streaming RFC 4180 CSV export (`GET /api/deals/export`) with stage-weighted values. |
| **8** | A dashboard | **Done** | Headline metrics (Open deals count, exact weighted pipeline value, Won this month, Lost this month), breakdown by stage & owner, and chronological 8-week win trend chart. |
| **9** | History you cannot rewrite | **Done** | Append-only `DealHistory` timeline tracking deal creation, stage changes (with backward reasons), owner reassignments, collaborator additions/removals, notes, reopenings, and soft-deletions. Zero edit/delete endpoints exist. |
| **10** | Past-due deal alerts | **Done** | Dynamic calculation for open deals where `expectedCloseDate < today`. Header badge count with popover, owner dismissal persistence (`POST /api/alerts/:dealId/dismiss`), and automatic re-triggering if close date changes and expires again. |

## How much time did you actually spend?

## What would you do next, with another 12 hours?

## What are you least happy with in this codebase, and why?
