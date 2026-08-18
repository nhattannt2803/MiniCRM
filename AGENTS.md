# AGENTS.md - MiniCRM AI Agent Instructions & Project Index

Chào mừng AI Agents (Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf, v.v.)!  
Tài liệu này đóng vai trò là **chỉ mục khởi đầu và quy chuẩn bắt buộc** giúp bạn nhanh chóng hiểu dự án **MiniCRM**, định vị file chính xác và tuân thủ các quy tắc kiến trúc.

---

## 1. Quick Project Overview

- **Project:** Full-Stack Mini CRM & Metadata-Driven Automation Engine.
- **Backend Stack:** Node.js, Express.js, TypeScript, Prisma ORM, MySQL 8.x, Redis, BullMQ.
- **Frontend Stack:** React 18, TypeScript, Vite, Ant Design (`antd`), Tailwind CSS, `@dnd-kit/core`, `@tanstack/react-query`, Axios, Zustand.
- **Architecture Pattern:** Clean Architecture 3-layer pattern (Controller ➔ Service ➔ Repository), Transactional Outbox Pattern, Event-Driven Automation Engine.

---

## 2. Fast Path Index (Đường Dẫn Nhanh)

| Thành Phần Nghiệp Vụ | Backend Files | Frontend Files |
|---|---|---|
| **Leads & Lead Conversion** | [LeadController.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/controllers/LeadController.ts)<br>[LeadService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/LeadService.ts)<br>[LeadRepository.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/repositories/LeadRepository.ts) | [features/leads/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/leads/)<br>[leadService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/services/leadService.ts) |
| **Opportunities & Kanban** | [OpportunityController.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/controllers/OpportunityController.ts)<br>[OpportunityService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/OpportunityService.ts)<br>[OpportunityRepository.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/repositories/OpportunityRepository.ts) | [features/opportunities/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/opportunities/)<br>[kanbanStore.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/stores/kanbanStore.ts) |
| **Automation Engine** | [AutomationEngine.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/AutomationEngine.ts)<br>[ConditionEvaluator.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/ConditionEvaluator.ts)<br>[ActionExecutor.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/ActionExecutor.ts) | [features/automations/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/automations/)<br>[automationService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/services/automationService.ts) |
| **Outbox & Workers** | [outboxWorker.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/workers/outboxWorker.ts)<br>[automationWorker.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/workers/automationWorker.ts)<br>[automationQueue.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/queues/automationQueue.ts) | N/A |
| **Tasks & Activities** | [TaskService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/TaskService.ts)<br>[ActivityService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/ActivityService.ts) | [features/tasks/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/tasks/)<br>[features/activities/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/activities/) |
| **Dashboard & Analytics** | [DashboardService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/DashboardService.ts) | [features/dashboard/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/dashboard/) |

---

## 3. Strict Coding Guidelines for AI Agents

### Rule 1: Clean Architecture 3-Layer Boundaries
- **Controllers (`server/src/controllers/`):** Chỉ xử lý HTTP request, parse/validate DTOs via Zod (`server/src/validators/`), và trả về response chuẩn `{ success: true, data }` hoặc `{ success: false, error }`. Không đưa SQL/Prisma hay business logic vào Controller!
- **Services (`server/src/services/`):** Nơi chứa toàn bộ business logic, quản lý DB Transactions (`prisma.$transaction`), và tạo Outbox Events.
- **Repositories (`server/src/repositories/`):** Chịu trách nhiệm trực tiếp thao tác với Prisma ORM / SQL query.

### Rule 2: Transactional Outbox Pattern Rule
Khi một thay đổi trạng thái entity xảy ra trong Service (VD: Lead created, Opportunity stage updated, Task overdue):
- **Bắt buộc** ghi record vào bảng `outbox_events` trong **cùng DB transaction** với entity update.
- Không phát event ra bên ngoài trước khi DB transaction commit thành công.

### Rule 3: Idempotency Protection Rule
- Mọi execution của Automation Engine phải thông qua `IdempotencyGuard.ts` kiểm tra hash key:  
  `SHA256(automation_id:event_id:entity_type:entity_id)`
- Tránh trùng lặp việc gửi thông báo hoặc tạo task khi worker retry.

### Rule 4: Task Overdue Status Logic
- Không lưu `status = 'OVERDUE'` cứng trong database `tasks`.
- Trạng thái quá hạn phải được tính toán động qua query filter: `status IN ('TODO', 'IN_PROGRESS') AND due_at < NOW()`.

### Rule 5: Frontend UI Standards
- Sử dụng Ant Design (`antd`) kết hợp với Tailwind CSS.
- Quản lý state Kanban/Lead/Modal bằng Zustand (`client/src/stores/`).
- API call client phải dùng `Axios` instance từ `client/src/services/api.ts` với error handling tập trung.

---

## 4. Key Development & Testing Commands

### Backend (`server/`):
```bash
# Run backend dev server
npm run dev

# Run Prisma schema push & seed
npx prisma db push
npm run prisma:seed

# Run integration tests
npm test
```

### Frontend (`client/`):
```bash
# Run frontend dev server
npm run dev

# Run TypeScript build check
npm run build
```

---

## 5. Linked Detailed Documentation

- [docs/FLOWS.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/FLOWS.md): Sơ đồ luồng xử lý chi tiết (Outbox, Automation, Lead Conversion).
- [docs/MODULES_MAP.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/MODULES_MAP.md): Bản đồ thư mục & file codebase đầy đủ.
- [docs/DATABASE_SCHEMA.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/DATABASE_SCHEMA.md): Tra cứu cơ sở dữ liệu, Enums & Polymorphic relations.
- [docs/ARCHITECTURE.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/ARCHITECTURE.md): Tài liệu thiết kế kiến trúc gốc.
