# Full-Stack Multi-Tenant SaaS Mini CRM & Automation Engine

Enterprise-ready Full-Stack **Multi-Tenant SaaS Mini CRM** codebase with real-time MySQL 8 database persistence, Express REST API, React + Ant Design frontend, drag-and-drop Kanban sales pipeline, polymorphic Activity Timeline, atomic Lead Conversion transaction, Transactional Outbox Pattern, multi-biz data isolation, dynamic tenant slug URL routing (`/:bizSlug/...`), secret user registration, and an event-driven **Metadata-Driven Automation Engine**.

---

## Technical Stack & Architecture

```text
React 18 + Tailwind CSS + Ant Design + Vite
                     │ (Axios REST API - X-Biz-Id Header)
                     ▼
         Express.js + TypeScript
                     │ (Tenant Guard Middleware)
        ┌────────────┴────────────┐
        ▼                         ▼
   Prisma ORM                Outbox Event (biz_id)
        │                         │
        ▼                         ▼
  MySQL 8.x                  BullMQ + Redis
(biz_id Scoped)                   │
                                  ▼
                          Automation Engine
                      (Triggers, Conditions, Actions)
```

- **Frontend:** React 18, TypeScript, Vite, Ant Design (`antd`), Tailwind CSS, `@dnd-kit/core` (drag & drop Kanban), `@tanstack/react-query`, Axios, Recharts, Zustand.
- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, MySQL 8.x, Redis, BullMQ, Zod, JWT, bcryptjs.
- **Architecture:** Clean Architecture 3-layer pattern, Multi-Tenant Column-based Isolation (`biz_id`), Dynamic Tenant Slug URL Routing (`/:bizSlug/...`), Standalone System Admin Console (`SystemLayout.tsx`), Secret User Signup (`/portal-register`), Transactional Outbox Pattern, Metadata-Driven Automation Engine, Idempotency Protection (`SHA256(automation_id:event_id:entity_type:entity_id)`).

---

## Key Features

1. **Multi-Tenant SaaS Architecture (Multi-Biz):** Users can belong to multiple businesses with per-business role scoping (`BusinessMember`). Data is strictly isolated per tenant using `biz_id`.
2. **Dynamic Tenant Slug URL Routing (`/:bizSlug/...`):** All CRM URLs feature the active business's URL slug as a prefix (e.g. `http://localhost:5173/xedien/leads`). Switching business updates the URL automatically, and direct deep links auto-resolve the correct tenant context.
3. **Secret User Registration (`/portal-register`):** Fast email signup without verification requirement.
4. **Smart Navigation & Fallback (`/no-business`):** Users who register without business membership see a friendly landing page advising them to request an invitation from a Business Admin.
5. **Standalone System Admin Console (`/system/users` & `/system/businesses`):** Independent administration layout (`SystemLayout.tsx`) for Super Admins to manage all users and create/toggle active status for all platform businesses.
6. **Drag-and-Drop Kanban Board:** Interactive deal pipeline stage transition with optimistic UI updates.
7. **Atomic Lead Conversion:** Converts qualified leads to Companies, Contacts, and Opportunities in a single database transaction.
8. **Metadata-Driven Automation Engine:** Event-driven workflow rules executed asynchronously via BullMQ and Redis.

---

## Quick Start (Local Development)

### 1. Requirements
- Node.js v18+ & npm v10+
- MySQL 8.x & Redis 6+ (or via Docker Compose)

### 2. Run with Docker Compose
```bash
docker-compose up --build
```
This automatically starts MySQL 8, Redis, Express Backend (port 5000), and React Frontend (port 5173).

### 3. Run Locally (Manual)

#### Backend (`server/`):
```bash
cd server
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

#### Frontend (`client/`):
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Pre-configured Seed Accounts

| Role | Email | Password | Description |
|---|---|---|---|
| **Super Admin** | `admin@example.com` | `password123` | Platform-wide administrative control & Business #1 Admin |
| **Sales Executive 1** | `sales1@example.com` | `password123` | Manages leads, deals, tasks in Business #1 |
| **Sales Executive 2** | `sales2@example.com` | `password123` | Manages pipeline opportunities in Business #1 |
| **Sales Manager** | `manager@example.com` | `password123` | Pipeline performance & rules in Business #1 |

---

## Core REST APIs

### Authentication & Registration
- `POST /api/auth/register` *(Public secret signup)*
- `POST /api/auth/login`
- `GET /api/auth/me`

### System Administration (Super Admin Only)
- `GET /api/system/all-users` *(Fetch all platform users)*
- `PATCH /api/users/:id/toggle-status` *(Enable / Disable user)*
- `PATCH /api/users/:id/toggle-superadmin` *(Grant / Revoke Super Admin)*
- `GET /api/system/all-businesses` *(Fetch all platform businesses)*
- `POST /api/system/businesses` *(Create new business with owner email)*
- `PATCH /api/system/businesses/:id/status` *(Enable / Disable business)*

### Business Management
- `GET /api/businesses` | `POST /api/businesses` | `PATCH /api/businesses/switch`
- `GET /api/businesses/current/members` | `POST /api/businesses/current/members`

### Multi-Tenant CRM Endpoints (Requires `X-Biz-Id` Header)
- `GET /api/leads` | `POST /api/leads` | `POST /api/leads/:id/convert`
- `GET /api/companies` | `GET /api/contacts` | `GET /api/customers`
- `GET /api/opportunities` | `GET /api/opportunities/kanban` | `PATCH /api/opportunities/:id/stage`
- `GET /api/products` | `GET /api/quotes` | `GET /api/tasks` | `GET /api/activities`
- `GET /api/automations` | `GET /api/automations/executions` | `GET /api/dashboard`

---

## Documentation Links

- [docs/ARCHITECTURE.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/ARCHITECTURE.md): Multi-Tenant SaaS System Architecture Specification.
- [docs/FLOWS.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/FLOWS.md): Detailed Data & Execution Flow Diagrams.
- [docs/DATABASE_SCHEMA.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/DATABASE_SCHEMA.md): Database Dictionary & Multi-Tenant Schema.
- [docs/MODULES_MAP.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/MODULES_MAP.md): Complete Directory & Codebase File Index.
