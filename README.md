# Full-Stack Mini CRM & Automation Engine

Enterprise-ready Full-Stack **Mini CRM** codebase with real-time MySQL 8 database persistence, Express REST API, React + Ant Design frontend, drag-and-drop Kanban sales pipeline, polymorphic Activity Timeline, atomic Lead Conversion transaction, Transactional Outbox Pattern, and an event-driven **Metadata-Driven Automation Engine**.

---

## Technical Stack & Architecture

```text
React 18 + Tailwind CSS + Ant Design + Vite
                     │ (Axios REST API)
                     ▼
         Express.js + TypeScript
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   Prisma ORM                Outbox Event
        │                         │
        ▼                         ▼
     MySQL 8.x               BullMQ + Redis
                                  │
                                  ▼
                         Automation Engine
                     (Triggers, Conditions, Actions)
```

- **Frontend:** React 18, TypeScript, Vite, Ant Design (`antd`), Tailwind CSS, `@dnd-kit/core` (drag & drop Kanban), `@tanstack/react-query`, Axios, Recharts, Zustand.
- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, MySQL 8.x, Redis, BullMQ, Zod, JWT, bcryptjs.
- **Architecture:** Clean Architecture 3-layer pattern, Transactional Outbox Pattern, Metadata-Driven Automation Engine, Idempotency Protection (`SHA256(automation_id:event_id:entity_type:entity_id)`), Exponential Backoff Retry.

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

## Seed Accounts (Pre-configured)

| Role | Email | Password | Description |
|---|---|---|---|
| **Administrator** | `admin@example.com` | `password123` | Full administrative control |
| **Sales Executive 1** | `sales1@example.com` | `password123` | Manages leads, deals, tasks |
| **Sales Executive 2** | `sales2@example.com` | `password123` | Manages pipeline opportunities |
| **Sales Manager** | `manager@example.com` | `password123` | Pipeline performance & rules |

---

## Core Modules & REST APIs

### Authentication
- `POST /api/auth/login`
- `GET /api/auth/me`

### Leads & Lead Conversion
- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/convert` *(Atomic transaction: Lead ➔ Company ➔ Contact ➔ Opportunity without duplication)*

### Companies & Contacts & Customers
- `GET /api/companies` | `POST /api/companies` | `GET /api/companies/:id`
- `GET /api/contacts` | `POST /api/contacts`
- `GET /api/customers` | `GET /api/customers/:id` *(Derived customer accounts from Won deals)*

### Opportunities & Drag-and-Drop Kanban Board
- `GET /api/opportunities`
- `GET /api/opportunities/kanban`
- `POST /api/opportunities`
- `PATCH /api/opportunities/:id/stage` *(Records Stage History + Emits Outbox Event)*
- `POST /api/opportunities/:id/products`

### Products, Quotes, Tasks & Activities
- `GET /api/products` | `POST /api/products`
- `GET /api/quotes` | `POST /api/quotes`
- `GET /api/tasks` | `POST /api/tasks` | `PATCH /api/tasks/:id/status`
- `GET /api/activities` | `POST /api/activities`

### Automation Engine & Executions
- `GET /api/automations` | `POST /api/automations`
- `GET /api/automations/executions` *(Execution audit logs & step-by-step trace)*
- `GET /api/dashboard` *(Real-time aggregated KPIs, Funnel chart, Pipeline distribution)*

---

## 6 Seeded Automation Rules

1. **Lead Created** ➔ Assign Sales & Create Task *"Contact new lead"* (+2h).
2. **Lead QUALIFIED** ➔ Auto Create Opportunity deal.
3. **Opportunity Stage PROPOSAL** ➔ Create Task *"Send quotation"*.
4. **Opportunity No Activity for 7 Days** ➔ Notify Owner & Create Task *"Re-engage stale deal"*.
5. **Opportunity WON** ➔ Promote Account to Active Customer & Create Onboarding Task.
6. **Task Overdue** ➔ Send Overdue Notification to Assigned Sales.

---

## Running Integration Tests

Inside `server/`:
```bash
npm test
```
Runs test suite verifying Lead CRUD & Atomic Conversion, Opportunity Stage progression, and Automation Engine Condition Evaluator & Idempotency Guard.
