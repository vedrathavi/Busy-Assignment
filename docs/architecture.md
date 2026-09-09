# System Architecture

This document describes the high-level architecture, module boundaries, component communication, and design principles of the Sales CRM application.

## 1. High-Level Architecture Overview

The application is structured as a decoupled Single-Page Application (SPA) communicating over RESTful HTTP APIs with a modular Node.js/Express backend, backed by PostgreSQL via Prisma ORM.

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite SPA                     │
│    (Tailwind CSS, TanStack Query, React Router)        │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON (Axios)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Node.js + Express Backend                │
│                                                        │
│  [Cross-Cutting: Auth Middleware, CORS, Error Handler] │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Feature Modules:                                 │  │
│  │ • auth      • users       • companies            │  │
│  │ • deals     • dashboard   • alerts               │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Layered Dependency Flow:                         │  │
│  │ Routes → Controllers → Services → Policies/Repos │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ Prisma Client
                            ▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                    │
│    (Users, Companies, Deals, Collaborators, History)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Moving Pieces & Inter-Process Communication

1. **Frontend Client (Port 5173)**:
   - Built with React 18, Vite, and TypeScript.
   - Styled with Tailwind CSS.
   - Server state, query caching, and optimistic updates managed by TanStack Query.
   - Client-side routing with React Router.
   - Communicates with the backend REST API via Axios with JWT authorization headers.

2. **Backend API Server (Port 5000)**:
   - Built with Node.js, Express, and TypeScript.
   - Organized into self-contained feature modules (`auth`, `users`, `companies`, `deals`, `dashboard`, `alerts`).
   - Cross-cutting concerns (authentication guards, role authorization, centralized error handling, environment validation) reside in shared infrastructure layers.
   - Strict runtime request validation using Zod.

3. **Database Layer (PostgreSQL)**:
   - Strongly relational database enforcing foreign keys, unique constraints, and check conditions.
   - Managed via Prisma ORM schemas, migrations, and type-safe query generation.

---

## 3. Backend Module Layering & Request Flow

Within each business module, dependencies follow a strict one-way flow:

```
HTTP Request
     │
     ▼
[Express Route]
     │ (Applies authMiddleware, roleGuard, zodValidator)
     ▼
[Controller]
     │ (Extracts params/body, delegates to Service)
     ▼
[Service Layer]
     │ (Coordinates business workflows, applies transaction bounds)
     ▼
[Domain Policies & Repositories]
     │ (Enforces domain invariants, stage transitions, data access)
     ▼
[Prisma Client]
     │
     ▼
[PostgreSQL]
```

### Representative Request Path: Deal Stage Transition
1. **User Action**: Rep changes deal stage on the frontend UI.
2. **Frontend Call**: Axios sends `PATCH /api/deals/:id/stage` with `{ stage, reason }` and Bearer JWT.
3. **Authentication Middleware**: Verifies JWT signature, attaches `req.user = { userId, role }`.
4. **Validation Middleware**: Zod validates the incoming body against `stageTransitionSchema`.
5. **Deal Controller**: Calls `DealService.transitionStage(dealId, newStage, reason, req.user)`.
6. **Deal Domain Policy (`DealTransitionPolicy`)**: 
   - Checks if user is owner/collaborator/manager.
   - Validates forward/backward transition rule validity.
   - Validates that closed deals can only be reopened by a `MANAGER`.
   - Ensures a backward transition includes an explicit explanation.
7. **Deal Repository & Transaction**:
   - Updates `Deal.stage` in PostgreSQL.
   - Inserts an immutable audit record into `DealHistory`.
8. **HTTP Response**: Returns updated deal and history timeline to the client.
9. **Frontend Invalidation**: TanStack Query invalidates `['deals']` and `['dashboard']` caches, triggering seamless UI update.

---

## 4. What Was Deliberately NOT Built (Scope & Complexity Guardrails)

- **Multi-Tenancy Abstractions**: No `Tenant`, `Organization`, or `Subscription` entities. The system is intentionally scoped to a single sales organization.
- **Microservices & Event Brokers**: No Kafka, RabbitMQ, or Redis. A monolithic modular architecture is simpler, more reliable, and fully suited to the requirements.
- **WebSockets / Server-Sent Events**: Standard TanStack Query polling and cache invalidation provide excellent responsiveness without socket reconnection overhead.
- **GraphQL**: REST endpoints with Zod schemas provide explicit, easily tested contracts.

