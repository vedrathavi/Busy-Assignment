# Implementation Plan & Progress Tracking

This document details the phased implementation roadmap, session breakdown, task checklists, dependency ordering, and retrospective logs for the Sales CRM application.

---

## 1. Phased Roadmap & Dependency Order

The project is structured into 13 sequential, dependency-driven phases designed to guarantee that database integrity and server-side authorization are firmly established before building UI layers.

```mermaid
graph TD
    P0[Phase 0: Architecture & Tooling] --> P1[Phase 1: Foundation & Setup]
    P1 --> P2[Phase 2: Database Schema & Seed]
    P2 --> P3[Phase 3: Authentication & Authorization]
    P3 --> P4[Phase 4: Companies Module]
    P4 --> P5[Phase 5: Deals & Lifecycle State Machine]
    P5 --> P6[Phase 6: Collaboration & Immutable History]
    P6 --> P7[Phase 7: Search, Filter, Sort & Pagination]
    P7 --> P8[Phase 8: Bulk Actions & CSV Export]
    P8 --> P9[Phase 9: Dashboard Pipeline Metrics]
    P9 --> P10[Phase 10: Overdue Deal Alerts]
    P10 --> P11[Phase 11: Frontend UI/UX Integration]
    P11 --> P12[Phase 12: Testing, Edge Cases & Deployment]
    P12 --> P13[Phase 13: Optional Stretch Features]
```

---

## 2. Phase-by-Phase Execution Checklist

### Phase 0: Architecture, Requirements & Tooling Setup
- [x] Inspect repository, assignment brief, and guidelines.
- [x] Document system architecture (`docs/architecture.md`).
- [x] Document relational schema design, DATE types, and constraints (`docs/schema.md`).
- [x] Establish Engineering Decisions Log (`docs/decisions.md`) with 14 ADRs including the genuine visibility reversal and history deletion semantics.
- [x] Initialize structured AI prompt tracking (`docs/ai-prompts.md`).
- *Status*: **COMPLETED**

### Phase 1: Project Foundation & Infrastructure Setup
- [x] Initialize Git repository.
- [x] Configure backend with Node.js, Express, TypeScript, Zod, and Vitest.
- [x] Configure frontend with React 18, TypeScript, Vite, Tailwind CSS, and TanStack Query.
- [x] Connect Prisma ORM with Supabase PostgreSQL (direct and transaction poolers).
- [x] Create sanitized `.env.example` and verified local execution scripts.
- *Status*: **COMPLETED**

### Phase 2: Database Schema, Migrations & Demo Seed Data
- [x] Implement complete Prisma schema (`Organization`, `Team`, `User`, `Company`, `Deal`, `DealCollaborator`, `DealHistory`, `DealAlert`).
- [x] Configure `Deal.deletedAt` (`DateTime?`) and `Deal.deletedById` (`String?`) for application-level soft deletion.
- [x] Configure `Deal.expectedCloseDate` and `DealAlert.dismissedCloseDate` as `DateTime @db.Date` (PostgreSQL `DATE`).
- [x] Configure `HistoryType` enum including `CREATED`, `STAGE_CHANGED`, `OWNER_CHANGED`, `NOTE_ADDED`, `REOPENED`, and `DELETED`.
- [x] Configure PostgreSQL enums, foreign keys, cascade rules for collaborators/alerts, and composite indexes (`@@index([teamId, deletedAt])`).
- [x] Run Prisma migration against Supabase database (`npx prisma migrate dev`).
- [x] Create reproducible database seed script (`prisma/seed.ts`) populating:
  - 1 Organization ("Busy Infotech") & 1 Team ("Enterprise Sales Team").
  - 1 Sales Manager & 3 Sales Reps with hashed demo passwords.
  - 8 Companies (7 active, 1 archived) across various industries.
  - 18 Deals across all stages (`NEW`, `QUALIFIED`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`).
  - 1 Soft-deleted deal in Trash demonstrating intact historical timelines and `DELETED` event.
  - 6 Collaborator links across deals (multiple reps collaborating on the same deal).
  - 46 Full immutable timeline events for historical deals (CREATED, STAGE_CHANGED, backward reasons, OWNER_CHANGED, NOTE_ADDED, REOPENED, DELETED).
  - 2 Overdue deals (1 active alert, 1 dismissed alert) for alert testing.
- *Status*: **COMPLETED**

### Phase 3: Authentication & Server-Side Authorization Module
- [x] User login endpoint (`POST /api/auth/login`) with bcrypt verification and generic 401 error.
- [x] JWT token issuance with minimal `sub = user.id` claims and verification utility (`src/utils/jwt.ts`).
- [x] Authentication middleware (`src/middleware/authenticate.ts`) resolving authoritative database user context.
- [x] Current user session endpoint (`GET /api/auth/me`).
- [x] Role authorization guard (`requireRole(['MANAGER', 'SALES_REP'])`).
- [x] Comprehensive automated Vitest integration suite (16 test scenarios covering valid logins, enumeration prevention, token expiry/tampering, context attachment, role rejection, and database-authoritative dynamic role changes).
- *Status*: **COMPLETED**

### Phase 4: Companies Module
- [x] Company validation schemas (`company.validator.ts`) for creation, update, query parameters, and UUID parameters.
- [x] Create company endpoint (`POST /api/companies`): Reps automatically own their created companies; Managers can assign to any team rep.
- [x] List accessible companies endpoint with scoped rep visibility (`GET /api/companies`):
  - Scoped database Prisma query: Reps see ONLY companies they own (`ownerId = user.id`) OR associated with deals they own or collaborate on (`deals.some({ teamId, OR: [{ ownerId }, { collaborators }] })`).
  - Managers see all active companies across the team.
  - Query parameters for `isArchived` (`'false'` active only, `'true'` archived only, `'all'` both), search (`name`/`industry`), and pagination.
- [x] View company details endpoint (`GET /api/companies/:id`): Enforces visibility scoping; returns 404 for unpermitted/cross-team companies (IDOR protection).
- [x] Edit company endpoint (`PATCH /api/companies/:id`): Managers can edit any team company; Reps can edit only owned companies (deal collaboration does NOT permit editing); owner reassignment restricted to Managers.
- [x] Archive and restore endpoints (`POST /api/companies/:id/archive`, `POST /api/companies/:id/restore`): Managers can archive/restore team companies; Reps can archive/restore only owned companies.
- [x] Comprehensive automated Vitest integration suite (30 test scenarios covering authentication, creation, scoping, IDOR protection, editing permissions, archive lifecycle, and safe owner responses).
- *Status*: **COMPLETED**

### Phase 5: Deals & Lifecycle State Machine
- [ ] Deal CRUD endpoints:
  - Create deal (`POST /api/deals`).
  - List active deals (`GET /api/deals`) — filtered by `deletedAt IS NULL`.
  - List deleted deals / Trash (`GET /api/deals/trash`) — filtered by `deletedAt IS NOT NULL` with role scoping.
  - View deal details (`GET /api/deals/:id`).
  - Edit deal details (`PATCH /api/deals/:id`) — blocked if deal is deleted.
  - Soft-delete deal (`DELETE /api/deals/:id`):
    - Manager or Deal Owner only.
    - Sets `deletedAt = NOW()`, `deletedById = req.user.id`.
    - Appends immutable `DELETED` event to `DealHistory`.
    - Physical deal row and full audit history remain intact.
- [ ] `DealTransitionPolicy` enforcing lifecycle rules:
  - Forward 1-step moves: `NEW → QUALIFIED → PROPOSAL → NEGOTIATION → WON/LOST`.
  - Backward 1-step moves: requires non-empty recorded reason.
  - Closed deal protection: `WON`/`LOST` blocks further transitions.
  - Manager reopen: restores `previousStage` with `closedAt = null`.
- [ ] Vitest unit tests covering valid, invalid, backward, reopened, and soft-delete transitions.
- *Status*: **PENDING**

### Phase 6: Collaboration & Immutable Deal History
- [ ] Add collaborator endpoint (`POST /api/deals/:id/collaborators`) — Manager or Deal Owner only.
- [ ] Remove collaborator endpoint (`DELETE /api/deals/:id/collaborators/:userId`) — Manager or Deal Owner only.
- [ ] Enforce: deal owner cannot be collaborator; collaborators can update deal; collaborators cannot manage other collaborators.
- [ ] Append-only `DealHistory` creation on:
  - Deal creation (`CREATED`)
  - Stage changes (`STAGE_CHANGED`)
  - Owner reassignment (`OWNER_CHANGED`)
  - Notes added (`NOTE_ADDED`)
  - Reopened (`REOPENED`)
  - Soft deletion (`DELETED`)
- [ ] Deal timeline endpoint (`GET /api/deals/:id/history`) — accessible for active and deleted deals.
- [ ] Strictly zero edit/delete endpoints for history.
- *Status*: **PENDING**

### Phase 7: Search, Filtering, Sorting & Server-Side Pagination
- [ ] Query parser and Zod schema for search/filter parameters.
- [ ] Search across deal title and company name (`ILIKE`) on active deals (`deletedAt IS NULL`).
- [ ] Filters: company, stage, owner.
- [ ] Sorting: value, expectedCloseDate, updatedAt (ASC/DESC).
- [ ] Server-side pagination returning `{ items, total, page, totalPages }`.
- [ ] Strict query scoping ensuring reps only see their accessible deals.
- *Status*: **PENDING**

### Phase 8: Bulk Operations & CSV Pipeline Export
- [ ] Manager bulk reassign endpoint (`POST /api/deals/bulk/reassign`).
- [ ] Manager bulk advance endpoint (`POST /api/deals/bulk/advance`).
- [ ] Partial success reporting returning per-deal status: `{ dealId, success, reason }`.
- [ ] Pipeline CSV export endpoint (`GET /api/deals/export`):
  - Streams every active open deal with company, stage, value, and weighted value.
- *Status*: **PENDING**

### Phase 9: Dashboard Pipeline Metrics
- [ ] Dashboard aggregation service (`GET /api/dashboard`) — excludes soft-deleted deals.
- [ ] Headline metrics: Open deals count, total weighted pipeline, won this month, lost this month.
- [ ] Breakdown metrics: Open deals by stage, open deals by owner.
- [ ] Trend metrics: Deals won per week over the last 8 weeks.
- [ ] Proper scoping: Manager sees team metrics; Sales Rep sees accessible metrics.
- *Status*: **PENDING**

### Phase 10: Overdue Deal Alerts
- [ ] Overdue deals detection query (`GET /api/alerts`) — excludes soft-deleted deals.
- [ ] Overdue alert badge count endpoint (`GET /api/alerts/count`).
- [ ] Dismiss alert endpoint (`POST /api/alerts/:dealId/dismiss`) — deal owner only.
- [ ] Verify re-triggering logic: alert returns if expectedCloseDate changes and lapses again.
- *Status*: **PENDING**

### Phase 11: Frontend UI/UX Integration
- [ ] Responsive navigation bar with role badge, alerts counter, and user profile.
- [ ] Authentication pages: Login with pre-filled demo credential buttons.
- [ ] Dashboard view: Summary metric cards, stage distribution chart, and 8-week win trend (Recharts).
- [ ] Deals Pipeline view: Interactive list/table of active deals, search bar, multi-filter drawer, sorting headers, pagination controls.
- [ ] Deleted / Trash view: Dedicated list showing soft-deleted deals with deletion metadata and full timeline drawer.
- [ ] Deal Detail drawer/modal: Full metadata, stage advancement stepper, backward move reason modal, collaborator manager, notes input, and audit timeline (with visual indicators for lifecycle and deleted states).
- [ ] Companies view: Company list, create modal, edit drawer, archive/restore actions.
- [ ] Bulk actions toolbar: Checkbox selection, bulk reassign dropdown, bulk advance button with results modal.
- [ ] CSV Export button.
- *Status*: **PENDING**

### Phase 12: Testing, Verification, Deployment & Submission
- [ ] Comprehensive automated test execution (`npm run test:backend`).
- [ ] Verify production builds (`npm run build:backend`, `npm run build:frontend`).
- [ ] Deploy backend to Render and frontend to Vercel.
- [ ] Verify live connectivity between Vercel frontend, Render backend, and Supabase database.
- [ ] Complete `SUBMISSION.md` with live URLs, demo credentials, and checklist.
- *Status*: **PENDING**

### Phase 13: Optional Stretch Features (Only after Phase 12)
- [ ] Duplicate company name detection on creation with neutral warning dialog.
- [ ] Commission calculation based on won deals.
- *Status*: **DEFERRED**

---

## 3. Retrospective Questions Log

### How did you break the work into sessions?
The work is split into 13 discrete, incremental phases. Early sessions focus on rock-solid foundations (architecture, schema, authorization, state machines), middle sessions implement business use cases and advanced query operations, and later sessions build the interactive frontend interface, end-to-end testing, and deployment.

### What order did you build in, and why that order?
We built **database-first and backend-first**:
1. Relational schema and constraints are established first because they are expensive to modify after code is written.
2. Business rules and server-side authorization are built and unit-tested before any UI is built, ensuring the API is completely authoritative.
3. The frontend is built on top of stable, predictable REST contracts with TanStack Query.

### What did you estimate versus what it actually took?
- *Foundation & Architecture (Phase 0-1)*: Estimated 2.5 hours, took ~2 hours.
- *Database Schema, Migrations & Seed (Phase 2)*: Estimated 1.5 hours, took ~1 hour.
- *Authentication & Authorization Foundation (Phase 3)*: Estimated 1.0 hour, took ~45 mins.
- *Companies Module (Phase 4)*: Estimated 1.0 hour, took ~45 mins.
- *(Remaining phases to be updated as completed)*.

### What did you cut when you ran short?
- Multi-tenancy SaaS abstractions (organizations/teams) were limited to structural schema boundaries with 1 seeded organization and team, cutting complex tenant-switching UI.
- Generic `ApprovalRequest` workflow engines were cut in favor of direct creation by default.
- All 9 optional stretch ideas were deferred until the 10 mandatory goals are 100% complete and verified.
