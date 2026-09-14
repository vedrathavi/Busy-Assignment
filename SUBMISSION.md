# Submission

## Links

- **GitHub repository:** https://github.com/vedrathavi/Busy-Assignment
- **Live application:** https://busy-crm.vercel.app
- **Live backend API:** https://busy-backend-za64.onrender.com

## Notes for the reviewer

- **Render Cold Start**: The backend is hosted on Render's free tier, which spins down after periods of inactivity. If the service is idle, the initial request / cold start may take ~30–50 seconds to wake up. Once active, all requests and database queries are fast and responsive.
- **Test Suite**: The repository includes a full automated test suite with **293 passing integration tests** across 12 test suites covering all 10 core goals, role boundaries, decimal currency precision, transition state machine rules, multi-assignee task lifecycles, and alert/notification lifecycles. Run `npm test` in the `backend/` directory to execute.
- **Performance Improvements**: Includes route-level code splitting with `React.lazy()` (reducing initial JS bundle by 58.6%), targeted TanStack Query cache invalidations, and high-performance scalar projections for background alert count polling.

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
| **Add-on 1** | Multi-Assignee Deal Tasks & Follow-ups Work Queue | **Done** | Actionable follow-up work queue linked to deals. Relational `TaskAssignee` model (`UNIQUE(taskId, userId)`), creation-time frozen assignment list (no post-creation mutation), strictly deal-scoped security ($\text{requestedAssignees} \subseteq \text{deal.ownerId} \cup \text{activeCollaborators}$), independent completion states with notes, overall completion calculation, and dual perspectives (`assigned_to_me`, `assigned_by_me`, `team`). |
| **Add-on 2** | Real-Time Deal Activity Notifications & Alerts Center | **Done** | Persistent in-app notifications for stage transitions, owner reassignments, collaborator updates, deal notes, and task assignments/completions. 30s lightweight count polling, lightweight recent preview (`limit: 5`), dedicated Activity center (`/alerts`) with read-state retention (no destructive deletion on read) and server-side pagination. |
| **Bonus** | Duplicate Company Warning & Authorized Similarity Detection | **Done** | Smart fuzzy name/domain duplicate check on company creation with strict authorization shielding to prevent cross-rep data leaks (`GET /api/companies/similar`). |

---

## How much time did you actually spend?

Approximately **14 hours** in total across planning, architecture, implementation, test suites, and documentation.

The breakdown by milestone and phase (including test creation, verification, and documentation passes for each phase):

| Phase / Milestone | Focus Area | Approx Time |
| :--- | :--- | :---: |
| **Phase 0 & 1** | **Architecture, Technology Decisions, Scaffolding & Tooling**: Defined single-tenant layered architecture (Routes &rarr; Controllers &rarr; Services &rarr; Domain Policies/Repositories &rarr; Prisma), server-side authorization invariants, immutable audit history design, and monorepo structure. | ~2.0 hrs |
| **Phase 2** | **Relational Schema, PostgreSQL Migrations & Seed Data**: Designed 8 core tables with Prisma, configured exact `DECIMAL(14,2)` monetary fields, pure `DATE` close dates, soft-delete metadata, cascade rules, and comprehensive demo seed dataset. | ~1.0 hr |
| **Phases 3–6** | **Core Backend Modules & Business State Machine**: Built JWT authentication, bcrypt hashing, scoped Companies CRUD, Deals state machine with 1-step rules and mandatory backward reasons, collaborator permissions with mutual exclusion, and append-only `DealHistory`. | ~4.5 hrs |
| **Phases 7–10** | **Advanced Query Engine, Bulk Operations, CSV Export & Dashboard**: Built server-side search, filtering, sorting, pagination, Manager bulk reassign & advance with partial reporting, RFC 4180 CSV export, and aggregation dashboard. | ~2.0 hrs |
| **Phases 11–13** | **Frontend SPA, Design System, UI Modules & CRM Polish**: Built React SPA with Tailwind CSS, custom design tokens, responsive layout, reusable form dialogs, Team Directory, Scoped User Profiles, and Read-Only Trash view. | ~2.5 hrs |
| **Add-ons** | **Multi-Assignee Deal Tasks & Activity Notifications**: Built relational `TaskAssignee` model, creation-time immutable assignments, strictly deal-scoped boundary enforcement, independent completion states with notes, dual perspectives, and in-app activity notifications. | ~2.0 hrs |
| **Verification & Fixes**| **Test Suites, Edge Cases, Hardening & Baseline Audit**: Built and ran comprehensive integration test suites (300+ tests), baseline database audits, type checks, production builds, and documentation passes. | ~1.0 hr |
| **Total** | | **~ 14.0 - 15.0 hrs** |

---

## What would you do next, with another 12 hours?

With another 12 hours, I would focus primarily on **performance optimization, real-time push architecture, and production polish**:

1. **Replace Polling with Real-Time WebSockets or Server-Sent Events (SSE)**:
   - Upgrade the current 30-second polling notification/task architecture to an event-driven WebSocket or SSE pipeline so updates appear instantly across collaborative sessions without polling overhead.

2. **Query & Render Performance Profiling**:
   - Profile PostgreSQL execution plans on complex multi-join queries (`TaskAssignee` + `DealCollaborator` + `DealHistory`).
   - Add database connection keep-alives and fine-tune caching headers for static assets.
   - Optimize React component re-renders and TanStack Query cache invalidation granularity.

3. **Practical AI-Assisted CRM Enhancements**:
   - Implement practical AI workflows: automated deal activity summarization, suggested next actions based on deal stage duration, and automated follow-up email draft generation from task completion notes.

4. **UI/UX Polish & Mobile Responsiveness**:
   - Refine keyboard navigation, drag-and-drop pipeline stage movement, and mobile touch interactions across complex tables and dialogs.
   - Expand accessibility (ARIA attributes, screen-reader focus traps).

---

## What are you least happy with in this codebase, and why?

1. **Latency & Feeling of Responsiveness over Remote Poolers**:
   - While database queries are optimized with composite indexes, network round-trips to the remote PostgreSQL instance over cloud transaction poolers can introduce perceived latency. A local in-memory cache (like Redis) or optimistic UI mutations across all actions would make the CRM feel substantially faster.

2. **Late Introduction of Real-Time Push**:
   - The current architecture uses efficient 30-second lightweight polling for notification count badges and activity alerts. While robust, designing a unified WebSocket/SSE event bus early in the project would have made multi-user collaboration and live task status updates even cleaner.

3. **Task Domain Complexity Discovered Iteratively**:
   - The task system evolved from a simple single-assignee model to a multi-assignee relational model with creation-time immutability, deal-scoped security boundaries, independent completions, completion notes, dual perspectives, and backward compatibility. While the resulting architecture is solid and 100% verified with automated tests, designing the full relational `TaskAssignee` domain upfront would have simplified the intermediate iterations.
