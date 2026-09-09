# Engineering Decisions Log

This document records the major architectural, domain, and technology decisions that shape the Sales CRM codebase. Each record explains the context, what was chosen, what was rejected, and the trade-offs/rationale.

---

## Decision 1: React + Vite Single-Page Application for Frontend

- **Context / Problem**: The CRM is an interactive single-organization business dashboard requiring complex deal tables, stage filters, bulk actions, timelines, and role-dependent views under a 12-hour implementation budget.
- **Chose**: React + TypeScript with Vite, React Router, Tailwind CSS, and TanStack Query.
- **Rejected**: Next.js, Angular, Redux.
- **Why**: 
  - The application is an authenticated, internal dashboard with no SSR or public SEO requirements. Next.js would introduce unnecessary complexity around server components and hydration boundaries.
  - Angular introduces heavier framework ceremonies than needed for this project scope.
  - TanStack Query elegantly handles server-state caching, invalidation, and background synchronization, making a heavy client-side global state store like Redux redundant boilerplate.
- **Trade-offs**: Client-side rendering requires a brief initial bundle download before rendering, which is completely acceptable for internal business CRM workflows.

---

## Decision 2: Express.js with Modular Layered Architecture for Backend

- **Context / Problem**: Need a robust, maintainable REST API with clear separation of concerns, fast request cycle, and straightforward TypeScript integration.
- **Chose**: Node.js + Express with TypeScript and custom module-based layered architecture.
- **Rejected**: NestJS, C++, traditional global MVC folders.
- **Why**: 
  - NestJS provides enterprise DI and decorators, but introduces substantial framework ceremony and boilerplate for a time-constrained project.
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

- **Context / Problem**: Balancing maintainability, testability, and code readability without dogmatic overuse of design patterns.
- **Chose**: TypeScript classes for stateful/business layers (Services, Repositories, Domain Policies) with constructor-based dependency injection; pure functions for validators, helpers, and middleware.
- **Rejected**: Forcing every function into classes; completely procedural spaghetti code.
- **Why**: 
  - Domain policies (e.g., `DealTransitionPolicy`) and Services benefit greatly from encapsulated business rules and mocked constructor dependencies during Vitest unit testing.
  - Utilities and simple middleware remain clean and lightweight as standalone functions.
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

*(Note: If any decision is subsequently changed or refined during development, the reversal and its rationale will be explicitly recorded here with a `Later reversed:` entry).*


