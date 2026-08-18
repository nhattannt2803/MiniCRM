# MiniCRM Core Logic & Data Flow Map

Tài liệu này mô tả chi tiết sơ đồ luồng dữ liệu (Data & Execution Flows) của các tính năng quan trọng nhất trong hệ thống MiniCRM SaaS Multi-Tenant, chỉ rõ thứ tự gọi file và hàm chịu trách nhiệm.

---

## 1. Flow 1: Atomic Lead Conversion (Chuyển Đổi Lead Tiềm Năng)

Quy trình chuyển đổi `Lead` (status = `QUALIFIED`) thành `Company`, `Contact`, và `Opportunity` diễn ra trong một **Atomic DB Transaction** phạm vi `biz_id` nhằm đảm bảo nguyên tắc **No-Duplicate Data**.

```text
[HTTP POST /api/leads/:id/convert]
         │ (Headers: Authorization, X-Biz-Id)
         ▼
[tenantGuard Middleware] ➔ Attach req.bizId
         │
         ▼
[crmControllers.convertLead] (Validate Request & Extract req.bizId)
         │
         ▼
[LeadConversionService.convertLead(bizId, data)] (Start Prisma $transaction)
         │
         ├── 1. Read Lead by bizId & leadId
         ├── 2. Check/Create Company under bizId (If companyName present & not linked)
         ├── 3. Check/Create Contact under bizId (If name present & not linked)
         ├── 4. Create Opportunity under bizId (Linked to Company & Contact)
         ├── 5. Update Lead status = 'CONVERTED', set converted_at & converted_opportunity_id
         └── 6. Write to outbox_events (biz_id, event_type = 'LEAD_CONVERTED')
         │
         ▼ (Commit DB Transaction)
[Return HTTP Response { success: true, data: { opportunityId, companyId, contactId } }]
```

---

## 2. Flow 2: Event-Driven Automation Pipeline (Transactional Outbox Pattern)

Mọi quy trình tự động hóa (Automation Rule) được kích hoạt bất đồng bộ thông qua mô hình **Transactional Outbox Pattern** kết hợp với **Redis & BullMQ**.

```text
[Business Event Triggered in Service] (VD: Lead Created, Opportunity Stage Changed)
         │
         ▼ (Same DB Transaction)
[Insert into `outbox_events` table] (biz_id, status = 'PENDING')
         │
         ▼ (Polling / Cron)
[outboxWorker.ts] (Reads PENDING outbox_events with biz_id)
         │
         ▼
[BullMQ Queue: automationQueue] (Push event payload to Redis)
         │
         ▼
[automationWorker.ts] (Worker processes job from BullMQ)
         │
         ▼
[AutomationEngine.processEvent]
         │
         ├── 1. Query Active Automations matching trigger event & bizId
         ├── 2. Check Idempotency via [IdempotencyGuard.ts]
         ├── 3. Evaluate Nested AND/OR Tree via [ConditionEvaluator.ts]
         └── 4. Execute Actions via [ActionExecutor.ts] (Extract bizId from payload)
                 ├── CREATE_TASK ➔ TaskService.createTask
                 ├── UPDATE_LEAD ➔ LeadService.updateLead
                 ├── SEND_NOTIFICATION ➔ NotificationService.send
                 └── CALL_WEBHOOK ➔ HTTP Post request
         │
         ▼
[Insert into `automation_executions` & `automation_execution_logs`]
         │
         ▼
[Update `outbox_events` status = 'PROCESSED']
```

---

## 3. Flow 3: Drag-and-Drop Opportunity Kanban & Stage Transition

Quy trình cập nhật giai đoạn cơ hội bán hàng (Opportunity Pipeline Stage) từ giao diện kéo thả Kanban.

```text
[Frontend: User drags card in Kanban Board]
         │
         ▼
[kanbanStore.ts / OpportunityKanbanView.tsx] (Optimistic UI Update)
         │
         ▼
[HTTP PATCH /api/opportunities/:id/stage] (Header: X-Biz-Id)
         │
         ▼
[tenantGuard Middleware] ➔ Attach req.bizId
         │
         ▼
[crmControllers.updateOpportunityStage]
         │
         ▼
[OpportunityService.updateStage(bizId, oppId, stageId)] (DB Transaction)
         │
         ├── 1. Update opportunity.stage_id under biz_id
         ├── 2. Record history in `opportunity_stage_histories`
         ├── 3. If stage is WON ➔ Trigger Customer conversion check
         └── 4. Insert `outbox_events` (biz_id, event_type = 'OPPORTUNITY_STAGE_CHANGED')
         │
         ▼
[Return Response] ➔ [React Query Invalidate & Refresh]
```

---

## 4. Flow 4: Dynamic Task Overdue Evaluation

Hệ thống **không** lưu trạng thái `OVERDUE` cố định trong DB để tránh ghi log/update đĩa lặp đi lặp lại.

```text
[Query Tasks Request] (Filter Overdue)
         │
         ▼
[TaskService.getTasks(bizId, params)]
         │
         ▼ (SQL Query execution using Compound Index)
SELECT * FROM tasks 
WHERE biz_id = ? 
  AND status IN ('TODO', 'IN_PROGRESS') 
  AND due_at < NOW() 
  AND deleted_at IS NULL;
```

---

## 5. Flow 5: Secret User Registration & No-Business Navigation Flow

Luồng đăng ký người dùng nhanh (không cần email verify) và phân hướng thông minh dựa vào tư cách Doanh nghiệp:

```text
[User accesses /portal-register]
         │
         ▼
[RegisterPage.tsx] ➔ Form submit (email, password, firstName, lastName, phone)
         │
         ▼
[HTTP POST /api/auth/register]
         │
         ▼
[AuthService.register]
         ├── 1. Check existing email
         ├── 2. Hash password via bcryptjs
         ├── 3. Create User record (isSuperAdmin = true if first user, else false)
         └── 4. Generate JWT Token
         │
         ▼
[Client receives Token & User object]
         │
         ▼ Check User Memberships Count
        /                             \
  businesses.length === 0        businesses.length > 0
      /                                 \
  Redirect to [/no-business]       Redirect to [/:activeBizSlug/dashboard]
```

---

## 6. Flow 6: Dynamic Tenant Slug URL Resolution & Navigation (`/:bizSlug/...`)

Luồng xử lý định tuyến URL tiền tố mật danh Doanh nghiệp khi nhận link trực tiếp hoặc chuyển Biz:

```text
[User enters URL: http://localhost:5173/xedien/leads]
         │
         ▼
[App.tsx] Matches route [/:bizSlug/*] ➔ Renders [MainLayout.tsx]
         │
         ▼
[MainLayout.tsx] Extracts `bizSlug = "xedien"` via useParams
         │
         ▼
[authStore.switchBizBySlug("xedien")]
         │
         ├── Checks if `activeBiz.slug === "xedien"` ➔ Keep active
         └── If different ➔ Find match in `businesses` array:
                 ├── Sets `activeBiz` in Zustand Store
                 └── Saves `activeBizId` to localStorage
         │
         ▼
[Axios API Client] Auto attaches header: `X-Biz-Id = activeBizId`
         │
         ▼
[crmService.getLeads()] ➔ Displays leads strictly for "xedien"
```

---

## 7. Flow 7: Standalone Super Admin System & Business Console (`SystemLayout.tsx`)

Luồng quản trị dành riêng cho Super Admin quản lý toàn bộ hệ thống SaaS không thuộc về Biz nào:

```text
[User with isSuperAdmin = true]
         │
         ▼ Access [/system/users] or [/system/businesses]
[ProtectedRoute in App.tsx]
         │
         ├── Checks: isAuthenticated = true, user.isSuperAdmin = true
         └── Bypass bizId requirement (allows access even if businesses.length === 0)
         │
         ▼
[SystemLayout.tsx] (Renders standalone dark-themed console layout)
         │
         ├── [/system/users] ➔ [SystemUsersPage.tsx]
         │       ├── GET /api/system/all-users
         │       ├── Toggle Status ➔ PATCH /api/users/:id/toggle-status
         │       └── Toggle SuperAdmin ➔ PATCH /api/users/:id/toggle-superadmin
         │
         └── [/system/businesses] ➔ [SystemBusinessesPage.tsx]
                 ├── GET /api/system/all-businesses
                 ├── Create Business ➔ POST /api/system/businesses (Name, Slug, OwnerEmail, Plan)
                 └── Toggle Status ➔ PATCH /api/system/businesses/:id/status (ACTIVE / INACTIVE)
```

---

## 8. Key Files Index

- Auth & Tenant Middleware: [tenantMiddleware.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/middleware/tenantMiddleware.ts), [authMiddleware.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/middleware/authMiddleware.ts)
- Business Service: [BusinessService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/BusinessService.ts)
- Auth Service: [AuthService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/AuthService.ts)
- User Service: [UserService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/UserService.ts)
- Standalone System Layout: [SystemLayout.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/layouts/SystemLayout.tsx)
- System Businesses Management: [SystemBusinessesPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/businesses/SystemBusinessesPage.tsx)
- Secret Register Page: [RegisterPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/auth/RegisterPage.tsx)
- No Business Landing Page: [NoBusinessPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/auth/NoBusinessPage.tsx)
- System Users Management: [SystemUsersPage.tsx](file:///Volumes/ChanCuu/Projects/MiniCRM/client/src/features/users/SystemUsersPage.tsx)
