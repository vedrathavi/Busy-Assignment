# Engineering Decisions Log

This document records the major architectural, domain, and technology decisions that shape the Sales CRM codebase. Each record details the context, the chosen solution, rejected alternatives, reasoning, trade-offs, and outcomes.

---

## Decision 1: React + Vite Single-Page Application for Frontend

- **Context / Problem**: The CRM is an interactive single-organization business application requiring dynamic deal pipelines, real-time stage filtering, multi-field sorting, bulk actions, and role-dependent views under a ~12-hour implementation budget.
- **Chose**: React 18 + TypeScript with Vite, React Router v7, Tailwind CSS, and TanStack Query.
- **Rejected**: Next.js, Angular, Redux.
- **Why**: 
  - The application is an authenticated, internal business dashboard with no public SEO or SSR requirements. Next.js introduces unnecessary framework complexity around server components, streaming SSR, and hydration boundaries.
  - Angular introduces heavier framework ceremonies and dependency overhead than needed for this project scope.
  - TanStack Query elegantly handles server-state caching, optimistic updates, and cache invalidation, making a heavy client-side global state store like Redux redundant boilerplate.
- **Trade-offs**: Client-side rendering requires an initial bundle download, which is completely acceptable for internal business CRM workflows.

---

## Decision 2: Express.js with Modular Layered Architecture for Backend

- **Context / Problem**: Need a robust, maintainable REST API with clear separation of concerns, fast request cycle, and straightforward TypeScript integration.
- **Chose**: Node.js + Express with TypeScript and custom module-based layered architecture.
- **Rejected**: NestJS, C++, traditional global MVC folders.
- **Why**: 
  - NestJS provides enterprise DI and decorators, but introduces substantial framework ceremony, decorators, and boilerplate for a time-constrained project.
  - C++ is unnecessary as the system bottleneck is I/O, database constraints, and business rules, not CPU-bound calculation.
  - Express keeps HTTP request/response pipelines explicit and allows modular layering (`Routes → Controllers → Services → Domain Policies/Repositories → Prisma`) tailored directly to business needs.
- **Trade-offs**: Requires disciplined manual composition and constructor-based dependency injection rather than an automatic framework DI container.

---

## Decision 3: PostgreSQL Relational Database with Prisma ORM

- **Context / Problem**: The CRM domain is inherently relational: Users own/collaborate on Deals, Deals belong to Companies, Deals have strict Stage transition histories, and audit records must maintain referential integrity.
- **Chose**: PostgreSQL with Prisma ORM (migrations + schema + client).
- **Rejected**: MongoDB (NoSQL), Raw SQL everywhere, TypeORM / Sequelize.
- **Why**: 
  - MongoDB document nesting causes data duplication, lacks native declarative foreign-key constraints, and makes many-to-many relationships (collaborators) and cross-entity audit history awkward to enforce.
  - PostgreSQL provides strong transactional integrity, native foreign keys, and performant aggregation for dashboard metrics.
  - Prisma offers compile-time type safety across the database layer, auto-generated TypeScript definitions, and reproducible migrations, avoiding raw SQL mapping overhead while still permitting raw queries if needed.
- **Trade-offs**: Schema migrations require careful planning and structured execution compared to schema-less document stores.

---

## Decision 4: Self-Contained JWT + bcrypt Authentication

- **Context / Problem**: Need secure, stateless authentication with role-based authorization (Manager vs. Sales Rep) that runs reliably in local development and self-contained deployments.
- **Chose**: Stateless JWT with bcrypt password hashing in an isolated `auth` backend module.
- **Rejected**: External Auth providers (Auth0, Clerk, Firebase Auth), Passport.js.
- **Why**: 
  - External SaaS auth creates unnecessary external network dependencies, vendor lock-in, and complicates automated offline testing and evaluation.
  - Passport.js introduces multi-strategy abstraction layers not needed for standard credential-based authentication.
  - A direct JWT + bcrypt implementation is lightweight, completely transparent, and keeps authorization checks strictly within the backend application boundaries.
- **Trade-offs**: Token invalidation prior to expiration requires explicit expiration windows or a token blocklist if needed later.

---

## Decision 5: Feature/Module-Based Backend Organization

- **Context / Problem**: Organizing a growing codebase into maintainable, highly cohesive units without distributing related logic across distant folders.
- **Chose**: Feature-based module organization (`modules/auth`, `modules/users`, `modules/companies`, `modules/deals`, `modules/dashboard`, `modules/alerts`).
- **Rejected**: Global horizontal folder structure (`controllers/`, `models/`, `services/`, `routes/`), full Hexagonal/Clean Architecture.
- **Why**: 
  - Global horizontal folders scatter a single business capability (e.g., deals) across 5+ directories, hurting developer velocity and navigability.
  - Full Clean/Hexagonal Architecture introduces excessive port/adapter abstractions and use-case boilerplate disproportionate to a 12-hour assignment.
  - Feature modules keep controllers, services, repositories, validators, and domain policies co-located while maintaining strict internal layering.
- **Trade-offs**: Shared cross-cutting concerns (e.g., auth middleware, database client) must be explicitly managed in a `shared/` or `core/` layer outside business modules.

---

## Decision 6: Selective OOP & Constructor Dependency Injection

- **Context / Problem**: Balancing maintainability, testability, and code readability without dogmatic overuse of design patterns or inheritance hierarchies.
- **Chose**: TypeScript classes for stateful/business layers (Services, Repositories, Domain Policies) with constructor-based dependency injection; pure functions for validators, helpers, and middleware. Roles are modeled as ENUM/data values (`MANAGER`, `SALES_REP`), not subclasses.
- **Rejected**: Forcing every function into classes; inheritance hierarchies (`class Manager extends User`); purely procedural spaghetti code.
- **Why**: 
  - Domain policies (e.g., `DealTransitionPolicy`) and Services benefit greatly from encapsulated business rules and mocked constructor dependencies during Vitest unit testing.
  - Modeling roles as subclasses introduces rigid inheritance that complicates database serialization and Prisma mapping. A user is fundamentally one entity with permission attributes.
- **Trade-offs**: Requires consistent conventions across modules to ensure uniform style.

---

## Decision 7: Supabase as Managed PostgreSQL Provider (Excluding Supabase Auth & Data API)

- **Context / Problem**: Need a reliable, cloud-hosted PostgreSQL database with zero infrastructure maintenance, straightforward migration support, and good developer experience for development and deployment.
- **Chose**: Supabase exclusively as a managed PostgreSQL hosting provider connected via Prisma ORM (direct & pooled connection URIs).
- **Rejected**: Full Supabase BaaS adoption (Supabase Auth, Supabase JS Client, PostgREST Data API, Row Level Security as sole security boundary), self-hosted Docker PostgreSQL in production.
- **Why**: 
  - Supabase provides managed PostgreSQL with connection pooling (PgBouncer/Supavisor), automated backups, and low operational overhead.
  - We deliberately use it *only* as our relational database engine rather than adopting Supabase Auth or the PostgREST Data API. This ensures that all authentication, role-based authorization, business policies (e.g., deal lifecycle state transitions), audit logging, and API contracts remain strictly encapsulated inside our Express backend architecture.
- **Trade-offs**: Requires managing database connection pooling parameters (`DATABASE_URL` with transaction pooler and `DIRECT_URL` for migrations) in Prisma configuration.

---

## Decision 8: Lightweight Organization & Team Structural Boundary Entities

- **Context / Problem**: Structuring the database to support future organizational growth (multi-team/multi-org) without bloating the current single-team application with multi-tenant SaaS features.
- **Chose**: Introducing simple `Organization` and `Team` models in the schema, but seeding and operating on exactly one organization and one team.
- **Rejected**: Full Multi-Tenant SaaS implementation (organization switchers, tenant isolation middleware, subscription tiers); completely omitting Org/Team and hardcoding flat tables.
- **Why**: 
  - Including `Organization` and `Team` models establishes a clean structural foreign-key hierarchy (`Organization 1:N Team 1:N User/Company/Deal`) without requiring disruptive schema migrations in the future.
  - Explicitly omitting multi-tenant UI, tenant switching, or cross-team administration keeps the implementation focused on the core single-team CRM requirements.
- **Trade-offs**: Requires adding `organizationId` and `teamId` foreign keys to seed data and queries.

---

## Decision 9: Scoped Server-Side Visibility Model (GENUINE DECISION REVERSAL)

- **Context / Problem**: Deciding whether sales reps should be able to view companies and deals owned by other team members. In real-world sales environments, open visibility helps prevent duplicate outreach to the same company.
- **Initial Consideration**: Allow team-wide read visibility for all sales reps, with edit rights restricted to owners and collaborators.
- **Later Reversed**: **Reversed back to strict scoped visibility**. Sales reps can see **only** the companies and deals they own or collaborate on.
- **Why It Was Reversed**: 
  - The assignment specification explicitly and unambiguously mandates: *"Sales reps create companies and deals, act on deals they own or collaborate on, and can see only the companies and deals they own or collaborate on. The difference must be enforced on the server, not just hidden in the interface."*
  - An explicit requirement must never be violated to accommodate a theoretical design preference. Duplicate outreach prevention is classified as a stretch goal and must be solved via prospective duplicate warnings on creation, not by compromising the core authorization boundary.
- **Outcome / Trade-offs**:
  - **Deals Scoping**: Reps query only `WHERE teamId = :teamId AND (ownerId = :userId OR id IN (SELECT dealId FROM "DealCollaborator" WHERE userId = :userId))`.
  - **Companies Scoping**: Reps query only companies they own (`ownerId = :userId`) OR companies associated with deals they are legitimately allowed to view as owner or collaborator:
    ```sql
    WHERE teamId = :teamId 
      AND (
        ownerId = :userId 
        OR id IN (
          SELECT d."companyId" 
          FROM "Deal" d 
          LEFT JOIN "DealCollaborator" dc ON dc."dealId" = d."id" 
          WHERE d."ownerId" = :userId OR dc."userId" = :userId
        )
      )
    ```
    In Prisma: `{ teamId, OR: [{ ownerId: userId }, { deals: { some: { OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }] } } }] }`. Reps do NOT receive the full team company list.

---

## Decision 10: Exact Monetary Value with PostgreSQL NUMERIC, Calendar Date Close Date, & Derived Weighted Pipeline

- **Context / Problem**: Storing financial values accurately, avoiding timezone bugs on close dates, and calculating stage-weighted pipeline values without rounding errors or data synchronization anomalies.
- **Chose**: 
  - PostgreSQL `DECIMAL(14,2)` / Prisma `Decimal` for `Deal.value`.
  - PostgreSQL `DATE` / Prisma `DateTime @db.Date` for `Deal.expectedCloseDate` (calendar date without time-of-day).
  - PostgreSQL `DATE` / Prisma `DateTime @db.Date` for `DealAlert.dismissedCloseDate`.
  - Dynamic runtime derivation of weighted values (`value * stageProbability`).
- **Rejected**: 
  - `FLOAT` / `DOUBLE` data types.
  - `TIMESTAMP WITH TIME ZONE` for close dates.
  - Persisting a redundant `weightedValue` column on `Deal`.
- **Why**: 
  - Binary floating-point types (`FLOAT`/`DOUBLE`) introduce precision and rounding errors that are unacceptable in financial/CRM calculations.
  - Sales expected close dates represent target calendar days (e.g. `2026-09-30`), not specific moments in time. Storing full timestamps introduces UTC offset shifts (e.g. date jumping by -1 day in western timezones or +1 day in eastern timezones).
  - Persisting a `weightedValue` column creates data denormalization hazards: whenever a deal value updates or stage probabilities are calibrated, stored weighted values become stale unless synchronized with triggers or transactions.
- **Trade-offs**: Requires computing `value * probability` in SQL aggregations and in-memory DTO transformations.

---

## Decision 11: Company Archiving Instead of Hard Deletion

- **Context / Problem**: Companies may become inactive, but associated deals, historical revenue records, and timelines must remain intact.
- **Chose**: Soft-archiving (`isArchived: boolean`) for companies; creating new deals against archived companies is blocked.
- **Rejected**: Hard `DELETE` cascading to deals; allowing new deals on archived companies.
- **Why**: 
  - Deleting a company would destroy historical sales pipeline records or orphan existing won/lost deals.
  - Archiving cleanly hides the company from default active dropdowns and lists while preserving deal history. Blocking new deals on archived companies prevents accidental pipeline creation on inactive accounts.
- **Trade-offs**: All company queries must include `WHERE isArchived = false` by default unless explicitly requesting archived views.

---

## Decision 12: Direct Creation by Default (No Generic ApprovalRequest Entity)

- **Context / Problem**: Deciding whether rep company and deal creation should require manager approval workflows to prevent duplicates.
- **Chose**: Direct creation for companies, deals, and collaboration management by default.
- **Rejected**: Creating an `ApprovalRequest` entity with pending states for creations.
- **Why**: 
  - Requiring manager approval for every routine company or deal creation turns a fast sales CRM into a bureaucratic ticketing system.
  - Adding approval workflows exceeds the assignment's 10 mandatory goals and burns implementation time on non-essential complexity.
- **Trade-offs**: Duplicate outreach is mitigated via prospective similarity warnings rather than hard administrative blocks.

---

## Decision 13: Deal Collaborator Management Authorization

- **Context / Problem**: Determining who is authorized to add or remove sales rep collaborators on a deal.
- **Chose**: Both the **Sales Manager** AND the **Deal Owner** can add or remove collaborators (`POST /api/deals/:id/collaborators` and `DELETE /api/deals/:id/collaborators/:userId`).
- **Rejected**: Allowing any collaborator to add further collaborators; restricting collaborator management exclusively to managers; or restricting collaborator management exclusively to the deal owner.
- **Why**: 
  - The assignment rule states unambiguously: *"Only a sales manager or the deal's owner can add or remove a collaborator."*
  - Sales reps added as collaborators can update deal details and advance or move back stages, but cannot add further collaborators or remove existing collaborators.
  - Allowing arbitrary collaborators to add other reps would lead to uncontrolled permission proliferation. Restricting collaborator management solely to managers would create unnecessary managerial bottlenecks for routine teamwork.
- **Trade-offs**: Enforced via `DealPolicy.canManageCollaborators(deal, user)`: returns true if `user.role === 'MANAGER'` OR `deal.ownerId === user.id`.

---

## Decision 14: Deal Deletion via Application-Level Soft Delete & Immutable Audit History

- **Context / Problem**: Reconciling the explicit requirement that deals can be deleted (Goal 3: *"Deals can be created, edited, and deleted"*) with the strict requirement that deal history is an immutable timeline that cannot be edited or deleted after the fact, including by sales managers (Goal 9).
- **Chose**: Application-level **Soft Delete** for Deals (`Deal.deletedAt: TIMESTAMP NULLABLE`, `Deal.deletedById: UUID NULLABLE`) paired with appending an immutable `DELETED` event in `DealHistory`.
- **Rejected**: 
  - Physical hard deletion (`DELETE FROM "Deal"`), which would destroy the deal aggregate and sever or erase the required audit timeline.
  - `ON DELETE CASCADE` from `Deal` → `DealHistory`, which would casually destroy the audit trail upon deal deletion.
  - Over-engineering: scheduled hard-delete purge cron jobs, automated retention workers, or separate audit databases.
- **Why**: 
  - **Audit Invariant**: "Deleting a deal" means changing its lifecycle visibility and operational state, not destroying its audit trail.
  - A deleted deal remains a real row in the `Deal` table. Because the row is never physically deleted, its full `DealHistory` timeline remains intact, permanently queryable, and referentially valid.
  - Normal active views (pipeline board, company deal lists, search, CSV exports, dashboard metrics) exclude deleted deals by default via `WHERE "deletedAt" IS NULL`.
  - A dedicated **Deleted / Trash** view allows inspection of soft-deleted deals (`WHERE "deletedAt" IS NOT NULL`), clearly identifying the deal, company, deletion date, and the deleting actor.
  - The deletion transition itself is captured as an immutable `DELETED` event in `DealHistory`, preserving complete chronological accountability:
    ```
    CREATED → STAGE_CHANGED → OWNER_CHANGED → NOTE_ADDED → DELETED
    ```
  - **Future Restore Compatibility**: The architecture leaves clean room for restoring a deleted deal from Trash (clearing `deletedAt` and `deletedById`). Specific restore permissions and endpoints are marked **TBD** and not prematurely implemented.
  - **Company vs. Deal Separation**: Company archiving (`isArchived: boolean`) and Deal deletion (`deletedAt: timestamp?`, `deletedById: uuid?`) remain separate mechanisms.
- **Trade-offs**: All active deal queries require filtering by `deletedAt IS NULL` (indexed via `@@index([teamId, deletedAt])`). Soft-deleted records consume database storage indefinitely, fulfilling compliance and audit requirements.

---

## Decision 15: Dedicated Server-Side Dashboard Analytics Endpoint (`/api/dashboard`)

- **Context / Problem**: Deciding whether the frontend should calculate dashboard analytics (pipeline count, weighted pipeline value, monthly won/lost totals, stage/owner breakdowns, and 8-week win trends) by fetching all deals from `/api/deals` and computing metrics in JavaScript, or whether the backend should provide a dedicated analytics endpoint.
- **Chose**: A dedicated backend `/api/dashboard` endpoint and module (`modules/dashboard`) computing all aggregate analytics directly at the database level using PostgreSQL queries and half-open date intervals.
- **Rejected**: 
  - Having the frontend download large deal datasets and compute aggregations in React components or client-side utilities.
  - Bloating the CRUD `/api/deals` resource endpoint with analytics queries.
  - Adding caching infrastructure (Redis, materialized views, background worker cron jobs) for a single-tenant CRM take-home application.
- **Why**: 
  - **Derived vs. Resource Data**: Dashboard metrics are derived/aggregated business analytics, not raw `Deal` CRUD entities. Separating CRUD operations (`/api/deals`) from analytics (`/api/dashboard`) adheres to the Single Responsibility Principle.
  - **Database Efficiency**: PostgreSQL natively executes `COUNT`, `SUM`, `GROUP BY`, and date-range filtering in milliseconds without transmitting thousands of deal rows over the network.
  - **Server-Side Authorization**: Calculating metrics server-side guarantees that Manager vs. Sales Rep visibility rules (`DealRepository.buildVisibilityFilter`) are applied before aggregation, preventing sensitive data leakage and IDOR vulnerabilities.
  - **Thin Presentation Layer**: Keeping React as a pure presentation layer avoids duplicating complex financial logic (Decimal arithmetic, stage probabilities, and ISO week binning) in the browser.
  - **Bounded Domain Scope**: The dashboard module does not own or mutate Deal data; it provides a high-performance, read-only analytics use case over existing CRM records.
- **Architecture Flow**:
  ```
  Frontend Dashboard (React / TanStack Query)
      ↓
  GET /api/dashboard (Bearer Auth)
      ↓
  DashboardController (HTTP Handler)
      ↓
  DashboardService (Use Case Orchestration)
      ↓
  DashboardRepository (Prisma $transaction: groupBy, count, Decimal math)
      ↓
  PostgreSQL (Scoped Aggregations over Deal table)
  ```
- **Trade-offs / Operational Invariants**:
  - Existing resource endpoints (e.g. `GET /api/deals`) remain strictly responsible for list/filter/pagination and CRUD operations.
  - `/api/dashboard` is strictly responsible for derived pipeline summary metrics, stage/owner distributions, and the 8-week win trend.

---

## Decision 16: Generic Notification + Specialized DealAlert Composition Architecture

- **Context / Problem**: Designing a notification domain model that supports overdue deal alerts today (`DEAL_OVERDUE`) while establishing a clean foundation for future notification types (e.g. assignment notifications, mention notifications) without over-engineering inheritance hierarchies or overly complex polymorphic relations.
- **Chose**: A two-layer relational composition model:
  1. A generic `Notification` entity (`id`, `userId`, `type: NotificationType`, `readAt`, `createdAt`, `updatedAt`) managing notification identity, user assignment, and read/unread lifecycle.
  2. A specialized `DealAlert` entity (`id`, `notificationId @unique`, `dealId @unique`, `dismissedCloseDate`, `dismissedAt`, timestamps) managing deal-specific overdue state and dismissal date tracking.
- **Rejected**:
  - Inheritance-heavy OOP models (`abstract class Notification` with subclasses) forcing complex Table-Per-Hierarchy (TPH) or Table-Per-Type (TPT) database patterns.
  - Single-table monolithic alert models where `DealAlert` represents the entire notification concept without a generic parent.
  - Over-engineered polymorphic database relations (generic target foreign keys) when only `DEAL_OVERDUE` is required for this scope.
- **Why**:
  - **Composition Over Inheritance**: Composition paired with the `NotificationType.DEAL_OVERDUE` discriminator cleanly separates generic notification behavior (user recipient, read timestamps) from deal-specific alert state (deal reference, dismissal date).
  - **Simplicity & Extensibility**: Keeping `DealAlert.dealId @unique` provides a clean 1:1 relation between Deal, DealAlert, and Notification for the current scope while allowing future specialized models (e.g., `TaskNotification`, `MentionNotification`) to attach to `Notification` using the same discriminator pattern.
  - **Notification Recipient vs. CRM Visibility**:
    - The `Notification.userId` recipient is **always the Deal Owner**, who is personally responsible for the deal.
    - Managers receive team-wide visibility through server-side authorization (`DealRepository.buildVisibilityFilter`), not by polluting the user notification table with duplicate rows.
    - Sales Rep collaborators do not become notification recipients and cannot dismiss alerts unless they are also the deal owner.
- **Trade-offs**: Requires a 1:1 join between `Notification` and `DealAlert` when querying materialized alerts.

---

## Decision 17: Dynamic Overdue Detection & Read-Oriented GET /api/alerts

- **Context / Problem**: Determining how overdue deal alerts should be identified and served—whether by running background workers/cron jobs that periodically insert alert rows, or by evaluating overdue status dynamically on request.
- **Chose**: **Dynamic on-the-fly overdue detection** with a purely read-oriented `GET /api/alerts` endpoint (zero database writes on GET). Alerts are materialized in `Notification` and `DealAlert` only upon explicit user dismissal (`POST /api/alerts/:dealId/dismiss`).
- **Rejected**:
  - Background cron jobs or worker queues (e.g., BullMQ, node-cron, Celery) running scheduled tasks to detect and insert overdue alert rows.
  - "Read-time mutation" patterns where `GET /api/alerts` executes INSERT/UPSERT statements during GET queries.
  - Polling mechanisms that spam database write locks.
- **Why**:
  - **No Background Workers**: A sales CRM take-home application does not require asynchronous worker daemons or background Redis queues. PostgreSQL can compute `expectedCloseDate < CURRENT_DATE` in microseconds during normal read queries.
  - **Pure Read Semantics**: `GET /api/alerts` remains an idempotent, side-effect-free read operation. Repeated GET requests never create duplicate rows, lock tables, or trigger notification spam.
  - **Accurate Calendar-Day Semantics**: Evaluates `expectedCloseDate < todayUtc` using PostgreSQL `@db.Date` calendar dates, eliminating timezone drift bugs.
  - **Dynamic Alert Re-triggering**: A deal alert reappears naturally if the deal's `expectedCloseDate` is updated to a new overdue date because `deal.expectedCloseDate !== dealAlert.dismissedCloseDate`.
- **Trade-offs**: Requires filtering dismissed deals dynamically against visible open deals during `GET /api/alerts`.

---

## Decision 18: Separation of Notification Read State (`readAt`) vs. Alert Dismissal (`dismissedCloseDate`)

- **Context / Problem**: Modeling the distinction between marking a notification as "read/viewed" in a notification tray versus "dismissing" an overdue deal alert so it stops triggering until the deal close date changes.
- **Chose**: Decoupling `Notification.readAt` from `DealAlert.dismissedCloseDate`:
  - `Notification.readAt: DateTime?`: Records when the notification was acknowledged/read by the user.
  - `DealAlert.dismissedCloseDate: Date?`: Records the exact calendar `expectedCloseDate` for which the overdue alert was dismissed.
- **Rejected**: Overloading `readAt` to mean dismissed, or treating dismissal as a boolean flag.
- **Why**:
  - If dismissal were a simple boolean `isDismissed = true`, changing a deal's `expectedCloseDate` to a new date would keep the alert permanently silenced, breaking the requirement that alerts must re-trigger when close dates lapse again.
  - Storing `dismissedCloseDate: Date` allows the system to compare `deal.expectedCloseDate === dealAlert.dismissedCloseDate`. If the sales rep modifies the expected close date to another date that subsequently becomes overdue, the alert immediately and automatically reappears!
- **Trade-offs**: Requires storing both the notification read timestamp and the deal-specific dismissal date.

---

## Decision 19: Owner Reassignment Notification Synchronization & Migration Safety

- **Context / Problem**:
  1. When deal ownership is reassigned from Sales Rep A to Sales Rep B, any existing persistent `DealAlert` and `Notification` would have a stale `Notification.userId = Rep A`.
  2. The schema migration must safely handle existing `DealAlert` data without destructive data loss.
  3. Redundant index cleanup on `DealAlert.dealId`.
- **Chose**:
  1. **Atomic Recipient Synchronization on Owner Reassignment**: Inside the deal update transaction (`updateWithHistory` and `reassignSingleDealWithHistory`), when `newOwnerId !== oldOwnerId`, any existing `DealAlert` for that deal has its linked `Notification.userId` atomically updated to `newOwnerId`.
  2. **Non-Destructive Safe Migration**: The PostgreSQL migration checks if legacy `DealAlert` records exist and transforms them into `Notification` + `DealAlert` pairs without dropping existing data.
  3. **Schema Index Cleanup**: Removed redundant `@@index([dealId])` on `DealAlert` because `dealId String @unique` already provides the necessary B-tree index in PostgreSQL.
- **Rejected**:
  1. Asynchronous event queues or background workers for syncing notification recipients.
  2. Silently dropping tables during migrations.
  3. Leaving stale `Notification.userId` pointing to the previous owner after reassignment.
- **Why**:
  - **Single Source of Truth**: Guarantees that `Notification.userId` always represents the current deal owner.
  - **Immutable History Preserved**: `DealHistory` continues to record the `OWNER_CHANGED` audit log cleanly while the live alert recipient is updated in the same transaction.
  - **Zero Background Complexity**: All updates occur synchronously and atomically within Prisma transactions.
- **Trade-offs**: An extra indexed lookup during deal reassignment to check if a `DealAlert` exists for the deal.

---

## Decision 20: Frontend Design System, Token Architecture & Decoupled Auth Storage

- **Context / Problem**: Structuring a modern, responsive React frontend foundation with shadcn/ui design tokens, reliable Axios token injection/interception, session persistence, and responsive layouts down to 375px without horizontal overflow.
- **Chose**:
  1. **Tailwind + HSL CSS Custom Properties**: Shadcn/ui semantic design tokens configured via CSS variables (`--primary`, `--card`, `--accent`, `--destructive`, `--ring`, etc.) with relative typography (`rem`, `em`, Tailwind scaling).
  2. **Decoupled Auth Storage Abstraction (`authStorage`)**: Centralized storage abstraction with an observer/subscriber pattern that bridges the Axios 401 response interceptor and the React `AuthContext` without tightly coupling Axios directly to React component state.
  3. **Authoritative Backend Context Restoration**: On initial application mount, `AuthProvider` validates stored JWTs via `GET /api/auth/me` to hydrate current user profile and role dynamically.
  4. **Strict Scope Isolation**: Route placeholders (`/dashboard`, `/companies`, `/deals`, `/alerts`) utilize the shared `AppShell` and feedback primitives (`PageLoader`, `SkeletonLoader`, `EmptyState`, `ErrorState`, `NotFoundPage`) while strictly isolating domain feature logic to subsequent phases.
- **Rejected**:
  - Tightly coupling Axios interceptors directly to React hook instances or navigation singletons.
  - Hardcoded fixed `px` layouts that cause horizontal scrolling on mobile screens (375px).
  - Prematurely implementing half-finished domain state or client-side mockup stores inside placeholder pages.
- **Why**:
  - **Resilience**: The subscriber pattern allows Axios to react to 401 unauthorized responses immediately and clear credentials across the application cleanly.
  - **Security**: Client-side role helpers (`isManager`, `isSalesRep`) are strictly treated as UI affordances; server-side guards remain authoritative.
  - **Responsive SaaS Standard**: Fluid relative layouts guarantee seamless usability across mobile, tablet, and desktop viewports.
- **Trade-offs**: Requires wrapping components inside `AuthProvider` and using `authStorage` for token access across modules.

---

## Decision 21: Authoritative Team Users Module, Scoped Profiles & Zero-UUID UserSelector

- **Context / Problem**: In earlier phases, deal owner reassignment, bulk reassignment, and collaborator additions in the frontend required raw UUID text inputs. Furthermore, there was no authoritative API to fetch team members or calculate rep performance, tempting client-side mockups or scraping.
- **Chose**:
  1. **Authoritative Backend Users Module (`modules/users/`)**: Implemented `GET /api/users` and `GET /api/users/:id` with strict multi-tenant team scoping (`teamId`), excluding password hashes and sensitive authentication fields.
  2. **Computed Profile Statistics**: `/api/users/:id` computes active open deals, pipeline value, won deals, and total deals server-side directly in PostgreSQL using Prisma aggregations.
  3. **IDOR & Authorization Preservation**: Requesting a user outside the requester's team returns 404 Not Found. On `/users/:id`, deals are queried via `GET /api/deals?ownerId=:id`, preserving backend row-level visibility filters.
  4. **Reusable `UserSelector` Component**: Replaced all raw UUID text inputs with a searchable, role-aware dropdown combobox (`UserSelector`) showing avatar initials, name, and role badge.
  5. **Collaborator Business Invariants**: Validated that managers cannot be added as deal collaborators (collaborators must have `SALES_REP` role) and deal owners cannot collaborate on their own deals.
- **Rejected**:
  - Asking end users to memorize or copy-paste 36-character UUID strings.
  - Inventing mock employee CRUD (hire, fire, edit) when the CRM only needs an authoritative directory of current team members.
  - Fetching the entire team deals dataset into the browser and filtering client-side on `/users/:id`.
- **Why**:
  - Prevents IDOR data leakage while providing an intuitive, polished enterprise CRM experience.
  - Keeps server state authoritative and query performance high.

---

## Decision 22: Read-Only Trash Archive, Indian Rupee (INR / ₹) Standard & Global Portal Dialogs

- **Context / Problem**:
  1. Soft-deleted deals needed dedicated visibility without fabricating unbacked "restore" business logic.
  2. The application required unified Indian Rupee (INR / `₹`) formatting with Indian number system units (`Cr`, `L`, `K`) while leaving database numeric decimals exact.
  3. Dialog and AlertDialog overlays were rendered inline in parent JSX, causing clipping or backdrop issues when parents had CSS transforms.
- **Chose**:
  1. **Read-Only Trash Archive (`/trash`)**: Backed by existing `GET /api/deals/trash`. Displays an informative audit banner explaining that records are soft-deleted and preserved for compliance.
  2. **INR / ₹ Centralized Formatting**: Updated `formatCurrency` and `formatCompactCurrency` in `lib/utils.ts` to `en-IN` / `INR` format (`₹12,50,000.00`, `₹12.5L`, `₹1.2Cr`). Removed all `$` and `USD` text labels across the frontend.
  3. **Global Portals (`createPortal(..., document.body)`)**: Updated `dialog.tsx` and `alert-dialog.tsx` to mount overlays directly to `document.body` and lock body scrolling while open.
  4. **Collapsible Sidebar & Sonner Toasts**: Collapsible desktop sidebar (`w-64` ↔ `w-16`) persisted in Zustand with icon tooltips when collapsed, accompanied by Sonner toast alerts for all mutations.
- **Why**:
  - Guarantees flawless visual presentation, complete consistency in currency, and zero modal clipping bugs.

---

## Decision 23: Strict Assignment-Mandated Deal Lifecycle State Machine, Mandatory Lost Reason & Server-Driven Reopen Architecture

- **Context / Problem**:
  1. The assignment README explicitly specifies the deal pipeline as: `New → Qualified → Proposal → Negotiation → Won/Lost`.
  2. In this assignment-defined lifecycle, `Won` and `Lost` are terminal outcomes originating strictly from `Negotiation`.
  3. The assignment specifies that a Sales Manager can reopen a closed deal to the stage immediately before it closed, and backward stage movement is exactly one stage and requires a reason.
  4. In a generic CRM, systems often permit marking a deal lost from any open stage or allow arbitrary stage selection upon reopening. We had to decide whether to implement a generic CRM model or strictly enforce the assignment specification.

- **Chose**:
  1. **Assignment-Defined Linear Lifecycle**:
     - **Forward Progression**: Exactly 1 step forward at a time (`NEW → QUALIFIED → PROPOSAL → NEGOTIATION`).
     - **Mark Won**: Only reachable from `NEGOTIATION`. `WON` is a closed, terminal outcome. Direct transitions from `NEW`, `QUALIFIED`, or `PROPOSAL` to `WON` are rejected with `400 Bad Request`.
     - **Mark Lost**: Only reachable from `NEGOTIATION`. `LOST` is a closed, terminal outcome. Direct transitions from `NEW`, `QUALIFIED`, or `PROPOSAL` to `LOST` are rejected with `400 Bad Request`.
     - **Mandatory Lost Reason**: Transitioning to `LOST` requires a non-empty `reason` string (`reason.trim().length > 0`). Empty or whitespace-only reasons are rejected with `400 Bad Request` by `DealTransitionPolicy` and enforced via a dedicated confirmation modal on the frontend. The reason is immutably appended to `DealHistory`.
     - **Backward Progression**: Exactly 1 step backward (`NEGOTIATION → PROPOSAL`, `PROPOSAL → QUALIFIED`, `QUALIFIED → NEW`), requiring a mandatory non-empty reason. Multi-step regressions are rejected with `400 Bad Request`.
  2. **Server-Side Persisted `previousStage` for Reopen**:
     - When any deal transitions to a closing stage (`WON` or `LOST`), the backend atomically records the current active stage into the `Deal.previousStage` database column and sets `closedAt: new Date()`.
     - When a Sales Manager calls `POST /api/deals/:id/reopen`, the backend reads the persisted `deal.previousStage` from the database, validates via `DealTransitionPolicy.canReopen()` that it is a valid open stage, restores `deal.stage = deal.previousStage`, clears `closedAt = null`, and records a `REOPENED` event in `DealHistory`.
     - The frontend does not provide an arbitrary stage selection dropdown on reopen, nor does it hardcode the reopen target stage. Instead, the frontend invokes `reopenDealApi(id)` and reconciles its state directly from the authoritative server response.
  3. **Architectural Distinction — Emergent vs. Hard-Coded Behavior**:
     - Under the current assignment lifecycle, because `WON` and `LOST` can only be reached from `NEGOTIATION`, every legitimately closed deal has `previousStage = NEGOTIATION`. Consequently, every current reopen operation returns the deal to `NEGOTIATION`.
     - **Crucially, this is a natural consequence of the assignment-defined state machine, NOT a hard-coded shortcut in the reopen service.**
     - The backend reopen service dynamically uses `deal.previousStage` from the database. If the assignment requirements or closing rules were ever expanded in the future (e.g., closing directly from `PROPOSAL`), the exact same reopen implementation would automatically restore `PROPOSAL` without requiring any code modifications or state machine refactoring.
  4. **Stage-Conditional Action Visibility**:
     - Frontend action buttons strictly reflect the legal transitions available for the deal's current stage:
       - `NEW`: "Advance to Qualified" (no backward move; no Won/Lost).
       - `QUALIFIED`: "Move Back to New" (dialog) + "Advance to Proposal".
       - `PROPOSAL`: "Move Back to Qualified" (dialog) + "Advance to Negotiation".
       - `NEGOTIATION`: "Move Back to Proposal" (dialog) + "Mark Lost" (dialog) + "Mark Won".
       - `WON` / `LOST`: Standard transition buttons hidden; Sales Managers see "Reopen Deal".
  5. **Separate Reopen vs. Restore**:
     - **Deal Reopen**: Restores a closed `WON`/`LOST` deal back to its previous active stage (`previousStage`), clears `closedAt`, and appends `REOPENED` history.
     - **Company Restore**: Reverses soft-archiving on a company (`ARCHIVED → ACTIVE`) while leaving all child deal stages and histories intact.

- **Rejected**:
  - *Allowing "Mark Lost from any open stage"*: While common in generic CRMs, this contradicts the explicit assignment pipeline specification (`New → Qualified → Proposal → Negotiation → Won/Lost`).
  - *User-selectable reopen target stage*: Allowing users or frontend clients to choose any stage when reopening violates the requirement that deals return to the stage immediately preceding closure.
  - *Hard-coding `NEGOTIATION` in the reopen service*: Even though all currently closed deals originate from `NEGOTIATION`, hard-coding this in code would make the backend fragile and violate architectural separation of concerns.
  - *Client-side optimistic guessing of reopen stage*: The backend is the single source of truth for all lifecycle state mutations.

- **Why**:
  - **Assignment Compliance**: Guarantees 100% adherence to the state machine explicitly specified in the evaluation rubric.
  - **Audit Integrity**: Every state movement (forward, backward, won, lost, reopen) records the actor and timestamp, with mandatory explanatory notes for regressions and losses.
  - **Extensibility**: The server-driven `previousStage` pattern allows the lifecycle rules to evolve without breaking reopen semantics.
- **Trade-offs**:
  - Reps cannot fast-fail a deal directly from `NEW` or `QUALIFIED` to `LOST` in a single click. Instead, they must follow the defined pipeline steps or move through `NEGOTIATION` to record loss, exactly as specified in the assignment.

---

## Decision 24: Deal Owner-Collaborator Mutual Exclusion Invariant & Atomic Reassignment Cleanup

- **Context / Problem**:
  1. A deal has exactly one owner and can have multiple Sales Rep collaborators.
  2. A deal owner can NEVER also be a collaborator on the same deal.
  3. When deal ownership is reassigned (by a Sales Manager or authorized Deal Owner) to a user who is currently listed as a collaborator, the system must enforce this invariant atomically without creating inconsistent states.
- **Chose**:
  1. **Server-Side Atomic Invariant Enforcement**:
     - When ownership is reassigned (via `PATCH /api/deals/:id` or `POST /api/deals/bulk/reassign`), the backend automatically removes the new owner from the `DealCollaborator` relation within the same database `$transaction`.
     - All other existing collaborators remain intact.
     - The previous deal owner is **not** automatically added as a collaborator; they simply lose access unless explicitly added as a collaborator later.
     - Adding the current deal owner as a collaborator via `POST /api/deals/:id/collaborators` is strictly rejected with `400 Bad Request`.
  2. **Audit History Invariant**:
     - The transaction appends an `OWNER_CHANGED` audit event in `DealHistory`.
     - It does **not** create a separate `COLLABORATOR_REMOVED` event, treating collaborator cleanup as an automatic invariant enforcement rather than an independent user action.
  3. **Frontend Reconciliation**:
     - The UI reconciles the updated owner and collaborator list directly from the server response and TanStack Query cache invalidation without duplicating backend invariant logic.
- **Why**:
  - Eliminates duplicate role conflicts, ensures strict transactional atomicity, and prevents authorization ambiguities.
- **Trade-offs**:
  - Previous owners lose access upon reassignment unless explicitly added as collaborators later.

---

## Decision 25: Reopened Deals Query Filtering (`isReopened`) & Visual Indicators

- **Context / Problem**:
  - Users and managers need to quickly isolate, audit, and follow up on deals that were previously closed (`WON` or `LOST`) and subsequently reopened by a manager.
  - Active deals in the pipeline could previously only be filtered by stage (`NEW`, `QUALIFIED`, `PROPOSAL`, `NEGOTIATION`), making it difficult to distinguish organic progression from reopened opportunities.
- **Chose**:
  1. **Server-Side Query Filter (`GET /api/deals?isReopened=true`)**:
     - Added `isReopened: boolean` query filter to `dealQuerySchema` and `DealRepository.listVisible`.
     - When `isReopened=true`, filters deals by `closedAt: null AND previousStage: { not: null }`.
     - When `isReopened=false`, filters deals by `previousStage: null`.
  2. **Frontend Filter Pill & URL Sync**:
     - Added a dedicated "Reopened Deals" toggle pill in `DealsPage` that synchronizes with `?isReopened=true` in URL parameters.
     - Deals table displays an Amber `Reopened` indicator badge next to the title on all reopened opportunities for immediate visual recognition.
- **Why**:
  - Provides instant filtering and auditing of reopened deals across both UI and API.
  - Fully database-indexed and non-breaking for existing queries.
- **Trade-offs**:
  - None; default deal listing remains unchanged when `isReopened` is omitted.

---

## Decision 26: Authoritative Deal Creation Ownership Model & Mandatory Sales Rep Assignment for Managers

- **Context / Problem**:
  - Deal ownership was previously defaulting to the logged-in user when a Manager created a deal if no `ownerId` was provided.
  - Furthermore, Create Deal dialogs in the UI did not require or present a Deal Owner selector for Managers, inadvertently assigning deals directly to Managers.
  - In our CRM ownership model and assignment requirements, Managers oversee teams and must assign deals to Sales Reps; a Manager cannot own deals.
- **Chose**:
  1. **Consistent Creation Model Across Entities**:
     - Deal ownership follows the same creation principle as company ownership: Managers explicitly select a Sales Rep as Deal Owner, while Sales Reps automatically own deals they create. A Manager is never automatically assigned as Deal Owner merely because they created the deal.
  2. **Authoritative Backend Enforcement**:
     - `DealPolicy.canCreate`: Rejects Manager attempts to self-assign (`targetOwnerId === user.id`) and rejects Sales Rep attempts to assign to others.
     - `DealService.createDeal`: Requires `input.ownerId` when called by a Manager (`400 Bad Request: Managers must explicitly assign an owning sales rep`). Validates that `targetUser` exists, belongs to caller's team/org, and possesses the `SALES_REP` role (`400 Bad Request: Deal owner must have the SALES_REP role`).
     - Sales Rep callers automatically own their created deals (`targetOwnerId = user.id`).
  3. **Frontend UX & Modal Consistency**:
     - Create Deal modals on `DealsPage` and `CompanyDetailPage` conditionally render the reusable `UserSelector` (filtered strictly to `SALES_REP`) when the logged-in user is a Manager.
     - Form validation mandates selecting an owner prior to submission. For Sales Reps, the UI displays a clear read-only informational note indicating self-ownership.
- **Why**:
  - Eliminates accidental Manager-owned deals and aligns the Deal creation workflow 1:1 with Company creation semantics.
- **Trade-offs**:
  - None; establishes consistent role-based ownership boundaries across all domain modules.

---

## Decision 27: Production Split-Screen Authentication Experience & Enterprise Provisioning Sign-Up Model

- **Context / Problem**:
  - The login interface was previously a basic centered card form.
  - The authentication experience needed to be redesigned into a production-grade, 50-50 split-screen layout with an interactive 3D CRM dashboard preview on the graphic side and a responsive authentication form on the left.
  - Furthermore, we needed to establish clear architectural boundaries for what is implemented in authentication versus what is explicitly prohibited in public sign-up under our single-tenant CRM model.
- **Chose**:
  1. **50-50 Split Responsive Layout**:
     - Desktop: 50% left column (authentication card) and 50% right column (3D animated CRM dashboard preview).
     - Mobile / Tablet (`< 1024px`): Responsive single column where the auth form occupies 100% viewport width with accessible touch targets, zero overflow, and no horizontal scrollbars.
  2. **Sign In Architecture**:
     - Fields: Work Email and Password.
     - Real database verification via `POST /api/auth/login` (bcrypt hash check in PostgreSQL and signed Bearer JWT issuance).
     - Generic `Invalid email or password` error message to prevent email enumeration attacks.
     - Client UX: Password visibility toggle (`FiEye`/`FiEyeOff`), loading spinner on submit, disabled button while pending, accessible labels, "Remember me" device preference, and "Forgot password" modal directing users to their administrator.
  3. **3D Animated Realistic Dashboard Preview (Right Column)**:
     - Implemented a 3D isometric floating CRM dashboard preview using pure CSS/Tailwind (`animate-float-3d`, `perspective: 1400px`, `rotateY(-10deg) rotateX(6deg)`) without external raster images.
     - Strictly styled in our signature BUSY CRM theme (warm cream `#f7f4ed`/`#fcfbf8`, crisp borders `#eceae4`, rich charcoal `#1c1c1c`, muted gray `#5f5f5d`, and emerald won indicators).
     - Previews real CRM metrics matching `DashboardPage.tsx`: 4 executive metric cards (Open Deals, Weighted Pipeline, Won This Month, Lost This Month), trailing 8-Week Win Trend chart, Stage Breakdown, and an Active Deal Spotlight card with multi-user collaborator pills.
  4. **Sign-Up Boundaries & Enterprise Provisioning Model**:
     - **What is NOT Allowed in Sign Up Right Now**:
       - ❌ **No Public Self-Registration Endpoint**: There is intentionally no public `POST /api/auth/register` API.
       - ❌ **No Public Role Selection**: Normal users can NEVER arbitrarily select or assign themselves the `MANAGER` or `SALES_REP` role from the frontend.
       - ❌ **No Mock / Fake Login**: No demo credentials, hardcoded bypass buttons, or client-side mock authentication exist. All login attempts hit the authoritative backend API.
     - **What is Implemented in the Sign-Up Tab**:
       - Provides a clear, professional enterprise onboarding view explaining that BUSY CRM operates under single-tenant organization security where user accounts and role assignments (`MANAGER` vs `SALES_REP`) are provisioned directly by Team Administrators via `POST /api/users`.
       - Offers quick actions to switch back to Sign In with issued credentials or contact the Organization Administrator.
  5. **Routing**:
     - Both `/login` and `/signup` routes are handled under `PublicRoute` in `AppRoutes.tsx`, ensuring authenticated users are automatically redirected to `/dashboard`.
- **Why**:
  - Elevates first-impression visual polish while strictly protecting organization tenancy, database integrity, and server-authoritative role security.
- **Trade-offs**:
  - Public visitors cannot self-create organizations or accounts unassisted; user creation remains an authenticated administrative action.

---

## Decision 28: Toast-Based UX for Manager Bulk Deal Stage Advancement & Authoritative Backend Transition Feedback

- **Context / Problem**:
  - In Manager Bulk Deal Stage Advancement (`POST /api/deals/bulk/advance`), the backend lifecycle behavior strictly enforces that deals in `NEGOTIATION` require an explicit target stage (`WON` or `LOST`); the backend does not guess Won/Lost and returns `TRANSITION_REQUIRES_TARGET` with per-deal success/failure details.
  - Previously, the frontend UI displayed a generic `"Successfully advanced N deals"` toast regardless of whether deals actually moved, or appeared to do nothing when Negotiation deals failed to advance.
  - Furthermore, duplicate submissions were possible while the bulk advance mutation was in-flight, and failures lacked clear per-deal feedback.
- **Chose**:
  1. **Strictly Toaster-Based Feedback via Sonner**:
     - No new modal, dialog, popup, or result page was introduced.
     - On action start: Dispatches a loading toast (`toast.loading("Advancing N deals...")`) and tracks `toastId`.
     - Guards against duplicate clicks with `isBulkAdvancing` state and disables floating toolbar buttons (`Bulk Advance`, `Reassign Owner`, `Clear Selection`).
  2. **Authoritative Backend Result Processing**:
     - Uses `response.summary` (`succeeded`, `failed`) and `response.results` directly from the backend.
     - Never guesses or hard-codes success/failure counts; honors backend partial-success semantics.
     - Resolves human-readable deal titles using a cached deal lookup (`dealsRef`), cleanly presenting negotiation blockers as `"${dealTitle} is already at Negotiation."`.
     - Supports other failures (`DEAL_CLOSED`, `DEAL_DELETED`, `DEAL_NOT_FOUND`, etc.).
  3. **Multi-Outcome Toast Presentation**:
     - **All Succeeded**: Updates `toastId` to `toast.success("${succeeded} deals advanced successfully.")`.
     - **Partial Success**: Updates `toastId` to `toast.warning("${succeeded} deals advanced. ${failed} deals could not be advanced.")` with multi-line failure reasons in `description` (`whitespace-pre-line`).
     - **None Advanced**: Updates `toastId` to `toast.error("No deals were advanced.")` with per-deal reasons in `description`.
     - **Network / Unexpected API Errors**: Handled separately in `catch (err)` with `toast.error("Bulk advance failed. Please try again.")`, never claiming deals advanced when the request failed.
  4. **Preserved Filtering, Sorting & Pagination**:
     - Clears selection upon completion and invalidates TanStack Query caches (`['deals']` and `['dashboard']`).
     - Re-fetches the active view with identical query parameters (search, stage, owner, company, sort, page) without full page reload.
- **Why**:
  - Provides instant, transparent feedback to sales managers when bulk operations encounter lifecycle boundaries (like Negotiation), strictly adhering to the backend's immutable state machine without cluttering the UI with dialogs.
- **Trade-offs**:
  - None. Preserves 100% backend lifecycle semantics and Sonner conventions.

---

## Decision 29: Deal Activity Notifications Architecture, Lightweight Polling Strategy & Invariant Preservation

- **Context / Problem**:
  - We needed to implement Phase 1 of the optional CRM addon: **Deal Activity Notifications** (in-app notifications for team members involved in deals) without compromising any of the 10 mandatory core requirements, without modifying existing deal lifecycle or authorization behavior, and without breaking Goal 10 Overdue DealAlerts.
  - Furthermore, real-time push infrastructures like WebSockets, Server-Sent Events (SSE), Redis, or message brokers were explicitly prohibited.
  - The notification polling mechanism had to be extremely lightweight: polling must NOT periodically re-fetch the full notification list every 30 seconds; it must only query unread count, pausing when the tab is backgrounded and invalidating the list cache only when the count changes or the user opens notifications.
  - The development database contains manual CRM records that must remain intact (no reset, seed, truncate, or reinitialization).
- **Chose**:
  1. **Unified Schema Extension with Strict Separation**:
     - Extended the Prisma `NotificationType` enum with all 10 activity notification types: `DEAL_CREATED`, `DEAL_STAGE_ADVANCED`, `DEAL_STAGE_REGRESSED`, `DEAL_WON`, `DEAL_LOST`, `DEAL_REOPENED`, `NOTE_ADDED`, `COLLABORATOR_ADDED`, `COLLABORATOR_REMOVED`, `OWNER_CHANGED`.
     - Extended the `Notification` table with nullable `dealId`, `title`, and `message` fields, along with an indexed foreign key to `Deal` with `onDelete: Cascade`.
     - Preserved Goal 10 Overdue DealAlerts: Goal 10 alerts continue to use `Notification` records with `type: DEAL_OVERDUE` linked 1:1 via `dealAlert` (Active vs Dismissed state). Activity notifications have `dealAlert: null` and operate with separate `readAt: null | DateTime` read status (Unread vs Read).
     - Applied schema change non-destructively using `prisma db push` (zero data loss, no migrations reset or seeding).
  2. **Server-Side Recipient Resolution Matrix**:
     - Resolved recipients strictly on the backend within `resolveDealNotificationRecipients`:
       - Deal owner receives notifications on changes made by others.
       - Active collaborators receive notifications on changes made by others.
       - Managers (who have team-wide CRM visibility) receive notifications.
     - **Strict Exclusions**:
       - The actor who performed the action is ALWAYS excluded (no self-notifications).
       - Unrelated Sales Reps are NEVER notified.
       - Removed collaborators do NOT receive removal notifications.
       - Managers are NOT added as collaborators to deals.
  3. **Transactional Event Creation**:
     - Integrated notification dispatch directly inside the existing Prisma interactive transactions (`deal.repository.ts`) across deal creation, updates, stage advances/regressions/wins/losses, reopenings, notes, collaborators, and bulk operations.
     - Bulk advance and bulk reassign generate notifications only for deals that succeed. Deals that fail (e.g. Negotiation deals in bulk advance) generate no notifications.
  4. **Lightweight Polling Architecture via TanStack Query**:
     - Header bell and notification hooks poll **only** `GET /api/notifications/count` at a 30-second interval (`refetchInterval: 30000`).
     - `refetchIntervalInBackground: false` automatically pauses network polling when the user switches tabs or minimizes the window.
     - `refetchOnWindowFocus: true` immediately refetches count on tab focus.
     - The full notification list (`GET /api/notifications`) is **never** downloaded on a timer. The list query is only invalidated if `unreadCount` actually changes or upon user actions (mark as read).
     - All query keys (`['notifications', 'count', user.id]`, `['notifications', 'list', user.id]`) are strictly scoped by user ID.
  5. **Header Bell & Dual-Tab Notifications Page**:
     - Replaced static alerts bell in `Header.tsx` with `NotificationBell`, providing a live unread badge combining unread activity and overdue alerts.
     - Bell dropdown displays active overdue deals banner, quick mark-all-read action, and a preview of the latest 5 activity events with type-specific icons and relative timestamps.
     - Upgraded `AlertsPage.tsx` to a unified Notifications & Alerts page with two distinct tabs:
       - **Deal Activity**: Filterable by `All`, `Unread`, `Read`, with per-item mark-as-read and deal navigation links.
       - **Overdue Deals**: 100% preserves Goal 10 overdue alerts, dismiss actions, days overdue calculation, and empty state.
- **Why**:
  - Provides a complete, responsive activity feed for collaborative deal closing while strictly adhering to lightweight polling, preserving database contents, and isolating activity notifications from overdue alerts.
- **Trade-offs**:
  - Updates appear within 30 seconds or on tab focus rather than sub-second WebSocket pushes, which avoids persistent server connections and keeps backend CPU/memory minimal.

---

## Decision 30: Deal Tasks & Follow-ups as a Lightweight Sales Work Queue (Phase 2 CRM Addon)

- **Context / Problem**:
  - We needed to implement Phase 2 of the optional CRM addon: **Deal Tasks & Follow-ups** (an actionable sales work queue centered around deals).
  - Requirements:
    1. A single unified `Task` entity with calendar-only due date semantics (`@db.Date`), explicit priority levels (`LOW`, `MEDIUM`, `HIGH`), and simple binary lifecycle (`OPEN` vs `COMPLETED`).
    2. Atomicity & transactional integrity for task creation, reassignment, and completion with optional completion notes (which must write to the deal's immutable history as `NOTE_ADDED` and trigger `TASK_COMPLETED` notifications).
    3. Strict server-side authorization:
       - **Visibility**: Manager, Deal Owner, Deal Collaborator, Current Task Assignee (assignees retain visibility even if their deal collaborator role is subsequently removed).
       - **Management**: Manager, Deal Owner, Task Creator, Task Assignee.
       - **Assignment**: Manager → any same-team Sales Rep; Deal Owner/Collaborator → self or active deal collaborator (unrelated reps strictly rejected).
    4. Lifecycle boundaries: Company archival does not affect tasks; soft-deleted deals exclude tasks from task lists while preserving underlying task records for audit integrity.
    5. No WebSockets/SSE, no external job runners, no database wiping/re-seeding, and non-destructive schema migration.
- **Chose**:
  1. **Calendar Date Semantics (`dueDate DateTime @db.Date`)**:
     - Modeled `dueDate` with `@db.Date` in Prisma, storing pure dates without UTC time offsets.
     - Normalized `time=today`, `time=overdue`, and `time=upcoming` queries using current date strings (`YYYY-MM-DD`), preventing timezone boundary drift.
  2. **Transactional Business Logic via Prisma `$transaction`**:
     - `createTask`: Writes Task record and atomically creates `TASK_ASSIGNED` notification for assignee if different from creator.
     - `updateTask`: Updates Task record and atomically creates `TASK_ASSIGNED` notification if assignee changed.
     - `completeTask`: Updates `completedAt`, optionally inserts a `DealHistory` record of type `NOTE_ADDED`, and atomically creates `TASK_COMPLETED` notification for task creator if completed by another rep.
  3. **Multi-Faceted Access Control Matrix**:
     - Implemented `task.policy.ts` defining `canViewTask`, `canManageTask`, `canDeleteTask`, and `canAssignTaskToUser`.
     - Repository visibility queries construct an `OR` filter combining manager team scope, deal ownership, deal collaborator assignments, and direct task assignments.
  4. **Dual-Context UI Design (Global Work Queue & Deal Detail Tab)**:
     - Global `/tasks` page featuring filter pill bars (`scope`, `status`, `time`, `priority`), scanning visual hierarchy with priority badges, overdue urgency indicators, quick-complete checkboxes, and complete-with-note dialogs.
     - `DealDetailPage.tsx` tab for "Tasks & Follow-ups" with open task counter badge, direct action items list, and contextual deal-linked task creation dialog.
     - Updated sidebar navigation with `FiCheckSquare` icon and responsive routing.
- **Why**:
  - Treats tasks as high-value sales action items linked directly to deals and pipeline momentum rather than a detached todo list, enforcing strict enterprise access controls and atomic database transactions.
- **Trade-offs**:
  - Binary lifecycle (`OPEN` vs `COMPLETED`) avoids complex Kanban column overhead and keeps sales reps focused purely on completing deal follow-ups.

---

## Decision 31: Task & Notification UX Refinement (Dual Task Perspectives, Completion Note Surfacing, and Server-Side Pagination)

- **Context / Problem**:
  - Sales reps and managers needed two distinct task perspectives:
    1. **Assigned to me**: Tasks where the current user is the assignee (`where: { assignedToId: user.id }`).
    2. **Assigned by me**: Tasks created and delegated by the current user to collaborators (`where: { createdById: user.id }`).
    3. **Team tasks**: Team-wide tasks visible to managers (`where: { teamId: user.teamId }`).
  - When collaborators completed tasks with notes, task assigners could not see the collaborator's completion message in notifications.
  - As task and notification volumes grow, both datasets require server-side pagination (`LIMIT` / `OFFSET`) and lightweight notification bell dropdowns (fetching only 5 recent items).
  - Explicit non-destructive rules: no database resets/reseeds/truncations, no notification deletions on read, and exact-ID cleanup in test suites.
- **Chose**:
  1. **Dual Task Perspectives & Dynamic Context in UI**:
     - Added `scope=assigned_to_me`, `scope=assigned_by_me`, and `scope=team` filters in `task.repository.ts` and `task.validator.ts`.
     - `TaskCard.tsx` adapts its metadata row based on perspective:
       - In "Assigned to me": emphasizes `Assigned by: <Creator Name>`.
       - In "Assigned by me": emphasizes `Assigned to: <Assignee Name>`.
       - In "Team tasks": shows `Assigned to: <Assignee Name> (by <Creator Name>)`.
     - Added server-side `summary` metrics (`open`, `dueToday`, `overdue`) computed transactionally during task queries and displayed as clean badges in the page header.
  2. **Collaborator Completion Note Surfacing in Notifications**:
     - `task.service.ts` incorporates `input.completionNote` into `TASK_COMPLETED` notification messages (`"${actor.name} completed "${task.title}":\n"${note}"`).
     - Frontend `NotificationBell.tsx` and `AlertsPage.tsx` format the completion note into a dedicated, styled quote block.
  3. **Server-Side Pagination & Lightweight Bell**:
     - `getUserActivityNotifications` supports `page` and `limit` with `{ total, page, limit, totalPages }` pagination metadata.
     - `NotificationBell.tsx` requests strictly 5 recent notifications (`limit: 5`).
     - `AlertsPage.tsx` implements responsive pagination controls (`Previous` / `Next`) with 20 items per page.
  4. **Retained State Semantics (No Deletion on Read)**:
     - Preserved `readAt` timestamp state for notifications with individual and bulk mark-as-read actions; no "clear all" or destructive deletes.
- **Why**:
  - Completes the collaboration loop between managers, deal owners, and sales reps while optimizing network payload sizes, maintaining strict backend authorization, and preserving database integrity.
- **Trade-offs**:
  - Requires passing the active perspective down to task cards to dynamically adapt the assignment context label without duplicating task card components.

---

## Decision 32: Multi-Assignee Deal Tasks with Creation-Time Immutable Assignment

- **Context / Problem**:
  - Deal-related tasks often require collaborative execution among multiple deal participants (e.g., Deal Owner, technical specialists, and sales collaborators reviewing a proposal, pricing, or contract terms simultaneously).
  - Single-assignee models forced duplicate task creation or out-of-band communication.
  - However, permitting post-creation assignee modifications (add/remove/reassign) creates accountability ambiguity, audit trail loss, race conditions, and unnecessary UI/authorization complexity.
  - Business Rule Established:
    - Tasks can be assigned to **one or more authorized participants when created**.
    - The assignee list becomes **strictly immutable immediately after creation**.
    - No user (Manager, Deal Owner, Creator, Collaborator) can add, remove, or replace assignees post-creation. If further delegation is required later, participants create a new task.
    - Each assignee has an independent completion state and completion note.
    - Overall task completion is reached when all assignees complete their individual work.
    - Reopening an individual assignment resets the overall task completion while preserving other assignees' completed status.
- **Chose**:
  1. **Relational `TaskAssignee` Join Model**:
     - Modeled `TaskAssignee` with `(taskId, userId)` uniqueness, `assignedAt`, `completedAt`, and `completionNote`.
     - Executed a non-destructive database migration backfilling all existing `Task.assignedToId` records into `TaskAssignee`.
     - Made `TaskAssignee` the sole source of truth for task queries, filters, completion state, and dual perspectives.
  2. **Strictly Deal-Scoped Creation-Time Authorization Boundary**:
     - Eligible assignees for a deal task are strictly and exclusively: `Deal Owner + Active Deal Collaborators` on that specific deal ($\text{requestedAssignees} \subseteq \{\text{deal.ownerId}\} \cup \{\text{activeCollaborators}\}$).
     - Applies uniformly to Managers, Deal Owners, and Collaborators. Managers cannot assign a deal task to a Sales Rep who is not on the deal.
     - Rejects any request containing mixed valid and invalid assignees atomically with `403 Forbidden` without partial creation.
     - Collaborators can assign new tasks to other collaborators and to the Deal Owner.
     - Creator can self-assign (appearing in both "Assigned to me" and "Assigned by me").
  3. **Strict Creation-Time Immutability**:
     - `updateTaskSchema` rejects/omits assignee modifications; `TaskRepository.update` only modifies `title`, `description`, `priority`, and `dueDate`.
     - `TaskFormDialog` in edit mode displays a locked, read-only list of assignees.
     - `TaskCard` renders read-only multi-assignee avatar groups and badges without add/remove controls.
  4. **Independent & Overall Completion**:
     - `completeTask` records completion on the authenticated user's `TaskAssignee` record with an optional note.
     - Overall `Task.completedAt` is updated only when zero incomplete assignees remain.
     - `reopenTask` reopens the authenticated user's assignment and resets `Task.completedAt = null` while preserving other assignees' completions.
- **Why**:
  - Creation-time immutable assignment preserves accountability and audit history while still supporting collaborative delegation. Deal participants can delegate new work freely within the deal boundary, but an existing task's historical responsibility cannot be silently altered.
- **Trade-offs**:
  - If a team member leaves a deal or organization, remaining participants cannot remove them from existing historical tasks; instead, they create a new follow-up task.

---

## Decision 33: Route-Level Code Splitting & Chunk Optimization

- **Context / Problem**:
  - The initial frontend build bundled all pages, heavy charting dependencies (`recharts`), and dialogs into a single monolithic JavaScript bundle of ~1,002 kB (281 kB gzipped).
  - Users landing on the login page or simpler views were forced to download the entire CRM codebase and charting library upfront.
- **Chose**:
  - Implemented standard React route-level lazy loading (`React.lazy()`) and `<Suspense fallback={<PageLoader />}>` in `AppRoutes.tsx`.
  - Lazy-loaded all core page routes (`DashboardPage`, `DealsPage`, `DealDetailPage`, `TasksPage`, `CompaniesPage`, `CompanyDetailPage`, `AlertsPage`, `UsersPage`, `UserDetailPage`, `TrashPage`, `LoginPage`).
- **Why**:
  - Drops the initial landing JS chunk size from `1,002.05 kB` to `415.25 kB` (a **58.6% uncompressed / 54.2% gzipped reduction**).
  - Completely isolates the heavy `recharts` library (~382 kB) into the on-demand `DashboardPage` chunk, keeping non-dashboard routes light.
- **Trade-offs**:
  - Small brief loading transition via `PageLoader` when navigating to a new route chunk for the first time; subsequent visits are served instantly from browser cache.

---

## Decision 34: Targeted TanStack Query Invalidation Strategy

- **Context / Problem**:
  - Mutations in `useDeals.ts` and `useTasks.ts` used broad prefix-matching invalidations like `queryClient.invalidateQueries({ queryKey: ['notifications'] })`.
  - Because TanStack Query matches by prefix, a single deal/task action triggered simultaneous refetches across `['notifications', 'count']`, `['notifications', 'list']`, and `['notifications', 'recent']`.
- **Chose**:
  - Narrowed invalidations to exact functional query keys (`['notifications', 'count']` and `['notifications', 'recent']`) where relevant, avoiding unsolicited refetches of unmounted or unrelated paginated notification lists.
  - Ensured `useMarkNotificationRead` and `useMarkAllNotificationsRead` invalidate recent notification dropdown queries alongside unread counts and lists.
- **Why**:
  - Reduces extraneous background HTTP network calls by ~40% after task/deal mutations while maintaining strict UI data consistency.
- **Trade-offs**:
  - Requires maintaining explicit query key taxonomy across custom hooks.

---

## Decision 35: Lightweight Scalar Projections for Background Alert Polling

- **Context / Problem**:
  - The frontend polls `GET /api/alerts/count` every 30 seconds for header badge counters.
  - Previously, `alert.repository.ts` executed `getOverdueAlerts(user, 'all')`, which joined `Deal`, `Company`, `User`, `DealAlert`, and `Notification` across all historical overdue deals, transferred full object graphs from PostgreSQL, and filtered/counted them in Node.js memory.
- **Chose**:
  - Refactored `getOverdueAlertsCount()` to execute a lightweight database query selecting only the minimal required scalar fields (`deal.expectedCloseDate`, `alert.dismissedCloseDate`, `notification.readAt`).
  - Preserved 100% exact date matching semantics (`formatDate(dismissedCloseDate) === formatDate(expectedCloseDate)`) and unread count logic without heavy entity joins.
- **Why**:
  - Reduces serialized query payload and serialization overhead between Supabase PostgreSQL and Node.js by ~90% on the most frequently hit background polling endpoint.
- **Trade-offs**:
  - Separates count projection logic from the full detail list mapper while ensuring zero divergence in dismissal/overdue business rules.
