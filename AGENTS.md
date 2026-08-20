# AGENTS.md - MiniCRM AI Agent Instructions & Project Index

Chào mừng AI Agents (Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf, v.v.)!  
Tài liệu này đóng vai trò là **chỉ mục khởi đầu và quy chuẩn bắt buộc** giúp bạn nhanh chóng hiểu dự án **MiniCRM**, định vị file chính xác và tuân thủ các quy tắc kiến trúc Multi-Tenant / Multi-Biz SaaS.

---

## 1. Quick Project Overview

- **Project:** Full-Stack Multi-Tenant SaaS Mini CRM & Metadata-Driven Automation Engine.
- **Backend Stack:** Node.js, Express.js, TypeScript, Prisma ORM, MySQL 8.x, Redis, BullMQ.
- **Frontend Stack:** React 18, TypeScript, Vite, Ant Design (`antd`), Tailwind CSS, `@dnd-kit/core`, `@tanstack/react-query`, Axios, Zustand.
- **Architecture Pattern:** Clean Architecture 3-layer pattern (Controller ➔ Service ➔ Repository), Transactional Outbox Pattern, Multi-Tenant Data Isolation (`biz_id`), Dynamic Tenant Slug URL Routing (`/:bizSlug/...`), Standalone System Admin Console.

---

## 2. Fast Path Index (Đường Dẫn Nhanh)

| Thành Phần Nghiệp Vụ | Backend Files | Frontend Files |
|---|---|---|
| **Multi-Tenant & Business Context** | [tenantMiddleware.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/middleware/tenantMiddleware.ts)<br>[BusinessService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/BusinessService.ts) | [authStore.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/stores/authStore.ts)<br>[MainLayout.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/layouts/MainLayout.tsx)<br>[useBizNavigate.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/hooks/useBizNavigate.ts) |
| **Auth, Register & Super Admin** | [AuthService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/AuthService.ts)<br>[UserService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/UserService.ts) | [RegisterPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/auth/RegisterPage.tsx)<br>[NoBusinessPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/auth/NoBusinessPage.tsx)<br>[SystemUsersPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/users/SystemUsersPage.tsx)<br>[SystemBusinessesPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/businesses/SystemBusinessesPage.tsx)<br>[SystemLayout.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/layouts/SystemLayout.tsx) |
| **Leads & Lead Conversion** | [crmControllers.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/controllers/crmControllers.ts)<br>[LeadService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/LeadService.ts)<br>[LeadConversionService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/LeadConversionService.ts) | [features/leads/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/leads/) |
| **Smax Chat & System Settings** | [SystemSettingService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/SystemSettingService.ts)<br>[LeadService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/LeadService.ts) | [LeadDetailPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/leads/LeadDetailPage.tsx)<br>[SettingsPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/settings/SettingsPage.tsx) |
| **Opportunities & Kanban** | [OpportunityService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/OpportunityService.ts)<br>[PipelineService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/PipelineService.ts) | [features/opportunities/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/opportunities/)<br>[kanbanStore.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/stores/kanbanStore.ts) |
| **Automation Engine** | [AutomationEngine.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/AutomationEngine.ts)<br>[ConditionEvaluator.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/ConditionEvaluator.ts)<br>[ActionExecutor.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/ActionExecutor.ts) | [features/automations/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/automations/) |
| **Outbox & Workers** | [outboxWorker.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/workers/outboxWorker.ts)<br>[automationWorker.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/workers/automationWorker.ts)<br>[outboxPublisher.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/events/outboxPublisher.ts) | N/A |
| **Tasks & Activities** | [ActivityService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/ActivityService.ts) | [features/tasks/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/tasks/)<br>[features/activities/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/activities/) |
| **Dashboard & Analytics** | [DashboardService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/DashboardService.ts) | [features/dashboard/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/dashboard/) |
| **i18n & Localization** | N/A | [i18n/](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/i18n/)<br>[vi.json](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/i18n/locales/vi.json)<br>[en.json](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/i18n/locales/en.json) |

---

## 3. Strict Coding Guidelines for AI Agents

### Rule 1: Multi-Tenant Data Isolation Rule (`biz_id`)
- Tất cả các truy vấn DB (SELECT, INSERT, UPDATE, DELETE) trong Service Layer **bắt buộc** phải bổ sung điều kiện `bizId` làm tham số đầu tiên.
- Mọi API trong `apiRoutes.ts` thuộc nhóm CRM phải chạy qua `tenantGuard` middleware để gắn `req.bizId` vào Request context.

### Rule 2: Dynamic Tenant Slug URL Routing (`/:bizSlug/...`)
- Tất cả các đường dẫn giao diện CRM trong `App.tsx` đều đính kèm tham số `/:bizSlug/` (VD: `/:bizSlug/dashboard`, `/:bizSlug/leads`).
- Khi đổi Doanh nghiệp trên Header bar, chuyển hướng URL tự động sang `/:newBizSlug/...`. Khi nhận URL trực tiếp, `switchBizBySlug` sẽ kích hoạt Biz tương ứng.
- **BẮT BUỘC:** Sử dụng `useBizNavigate` hook (`client/src/hooks/useBizNavigate.ts`) thay cho `useNavigate` khi điều hướng trong các component giao diện CRM để tự động đính kèm `/:bizSlug` hiện tại (tránh lỗi nhảy về Dashboard do route bị mất tenant slug).

### Rule 3: Clean Architecture 3-Layer Boundaries
- **Controllers (`server/src/controllers/`):** Lấy `req.bizId!` từ `AuthenticatedRequest`, parse/validate DTO, và gọi Service với `req.bizId!`. Não viết SQL/Prisma logic trong Controller!
- **Services (`server/src/services/`):** Quản lý business logic, DB Transactions (`prisma.$transaction`), cô lập theo `bizId`, và phát Outbox Events kèm `bizId`.

### Rule 4: Transactional Outbox Pattern Rule
Khi thay đổi trạng thái entity (Lead created, Opportunity stage changed, Task overdue):
- Ghi record vào `outbox_events` trong **cùng DB transaction** với entity update, đính kèm `bizId` trong payload.

### Rule 5: Idempotency Protection Rule
- Mọi execution của Automation Engine phải kiểm tra idempotency hash: `SHA256(automation_id:event_id:entity_type:entity_id)`.

### Rule 6: Standalone Super Admin Console & Business Management
- Quyền Super Admin (`isSuperAdmin`) cho phép quản lý tài khoản toàn hệ thống tại `/system/users` và quản lý Doanh nghiệp tại `/system/businesses` thông qua `SystemLayout.tsx` mà **không phụ thuộc vào bất kỳ Biz nào**.

### Rule 7: UI Text Localization Rule (i18n)
- Khi thêm hoặc chỉnh sửa nhãn menu, tiêu đề trang hoặc văn bản giao diện, **bắt buộc** cập nhật đồng bộ các tệp ngôn ngữ tại `client/src/i18n/locales/vi.json` và `client/src/i18n/locales/en.json` thông qua hàm `t('nav...')` hoặc `t(...)`.

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

- [docs/FLOWS.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/FLOWS.md): Sơ đồ luồng xử lý chi tiết (Outbox, Automation, Lead Conversion, Multi-Tenant Context, Tenant Slug Routing, Register & Super Admin).
- [docs/MODULES_MAP.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/MODULES_MAP.md): Bản đồ thư mục & file codebase đầy đủ.
- [docs/DATABASE_SCHEMA.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/DATABASE_SCHEMA.md): Tra cứu cơ sở dữ liệu, Enums, Polymorphic relations & Multi-Tenant Schema.
- [docs/ARCHITECTURE.md](file:///Volumes/ChanCuu/Projects/MiniCRM/docs/ARCHITECTURE.md): Tài liệu thiết kế kiến trúc hệ thống SaaS Multi-Biz.
