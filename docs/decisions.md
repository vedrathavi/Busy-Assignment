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
