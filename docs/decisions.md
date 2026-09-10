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

## Decision 14: `DealHistory` Deletion Semantics & `ON DELETE RESTRICT`

- **Context / Problem**: Reconciling the requirement that deals can be deleted (Goal 3: *"Deals can be created, edited, and deleted"*) with the requirement that deal history is an immutable timeline that cannot be edited or deleted (Goal 9: *"Nothing in this timeline can be edited or deleted after the fact, including by sales managers"*).
- **Chose**: `DealHistory.dealId` foreign key configured with `ON DELETE RESTRICT` at the database level.
- **Rejected**: `ON DELETE CASCADE` from `Deal` → `DealHistory`; silently inventing a soft-delete column (`isDeleted`) for deals.
- **Why**: 
  - If `ON DELETE CASCADE` is used, deleting a deal physically drops all associated historical timeline rows, directly violating Goal 9 and enabling the exact failure mode described in the assignment scenario: *"A deal marked lost gets deleted from the sheet entirely, so nobody can ever explain afterward why it fell through."*
  - Using `ON DELETE RESTRICT` enforces at the physical database engine level that deals with established historical audit trails cannot be casually destroyed through cascading deletes.
  - **How Goal 3 is Satisfied**:
    - Deals without downstream lifecycle transitions or notes (e.g. newly created deals entered mistakenly with no stage movements or notes) can be deleted cleanly, satisfying the requirement that deals can be created and deleted.
    - Once a deal accumulates lifecycle audit history (stage movements, reassignments, notes), the application blocks deletion and returns `409 Conflict` / `400 Bad Request`, instructing the user that active or historical deals must be progressed or marked `LOST` rather than deleted.
  - **No Silently Invented Features**: We do not invent an unrequested soft-delete system or trash bin for deals. The behavior is achieved purely through relational referential integrity (`ON DELETE RESTRICT`) and domain policy validation.
- **Trade-offs**: Hard deletion of historical deals is forbidden, guaranteeing compliance with audit immutability rules.
