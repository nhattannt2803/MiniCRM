# MiniCRM Core Logic & Data Flow Map

Tài liệu này mô tả chi tiết sơ đồ luồng dữ liệu (Data & Execution Flows) của các tính năng quan trọng nhất trong hệ thống MiniCRM, chỉ rõ thứ tự gọi file và hàm chịu trách nhiệm.

---

## 1. Flow 1: Atomic Lead Conversion (Chuyển Đổi Lead Tiềm Năng)

Quy trình chuyển đổi `Lead` (status = `QUALIFIED`) thành `Company`, `Contact`, và `Opportunity` diễn ra trong một **Atomic DB Transaction** nhằm đảm bảo nguyên tắc **No-Duplicate Data**.

```text
[HTTP POST /api/leads/:id/convert]
         │
         ▼
[LeadController.convertLead] (Validate Request)
         │
         ▼
[LeadService.convertLead] (Start Prisma Transaction $transaction)
         │
         ├── 1. Read Lead by ID
         ├── 2. Check/Create Company (If companyName present & not linked)
         ├── 3. Check/Create Contact (If name present & not linked)
         ├── 4. Create Opportunity (Linked to Company & Contact)
         ├── 5. Update Lead status = 'CONVERTED', set converted_at & converted_opportunity_id
         └── 6. Write to outbox_events (event_type = 'LEAD_CONVERTED')
         │
         ▼ (Commit DB Transaction)
[Return HTTP Response { success: true, data: { opportunityId, companyId, contactId } }]
```

### Key Files Involved:
- Controller: [LeadController.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/controllers/LeadController.ts)
- Service: [LeadService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/LeadService.ts#L120-L220)
- Repository: [LeadRepository.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/repositories/LeadRepository.ts)
- Model: [Lead](file:///Volumes/ChanCuu/Projects/MiniCRM/server/prisma/schema.prisma#L177)

---

## 2. Flow 2: Event-Driven Automation Pipeline (Transactional Outbox Pattern)

Mọi quy trình tự động hóa (Automation Rule) được kích hoạt bất đồng bộ thông qua mô hình **Transactional Outbox Pattern** kết hợp với **Redis & BullMQ**.

```text
[Business Event Triggered in Service] (VD: Lead Created, Opportunity Stage Changed)
         │
         ▼ (Same DB Transaction)
[Insert into `outbox_events` table] (status = 'PENDING')
         │
         ▼ (Polling / Cron)
[outboxWorker.ts] (Reads PENDING outbox_events)
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
         ├── 1. Query Active Automations matching trigger event
         ├── 2. Check Idempotency via [IdempotencyGuard.ts]
         ├── 3. Evaluate Nested AND/OR Tree via [ConditionEvaluator.ts]
         └── 4. Execute Actions via [ActionExecutor.ts]
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

### Key Files Involved:
- Outbox Worker: [outboxWorker.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/workers/outboxWorker.ts)
- Queue Definition: [automationQueue.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/queues/automationQueue.ts)
- Automation Worker: [automationWorker.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/workers/automationWorker.ts)
- Engine Router: [AutomationEngine.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/AutomationEngine.ts)
- Condition Evaluator: [ConditionEvaluator.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/ConditionEvaluator.ts)
- Action Executor: [ActionExecutor.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/ActionExecutor.ts)
- Idempotency Guard: [IdempotencyGuard.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/automation/engine/IdempotencyGuard.ts)

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
[HTTP PATCH /api/opportunities/:id/stage]
         │
         ▼
[OpportunityController.updateStage]
         │
         ▼
[OpportunityService.updateStage] (DB Transaction)
         │
         ├── 1. Update opportunity.stage_id
         ├── 2. Record history in `opportunity_stage_histories` (Calculates Time-in-Stage)
         ├── 3. If stage is WON ➔ Trigger Customer conversion check
         └── 4. Insert `outbox_events` (event_type = 'OPPORTUNITY_STAGE_CHANGED')
         │
         ▼
[Return Response] ➔ [React Query Invalidate & Refresh]
```

### Key Files Involved:
- Frontend View: `client/src/features/opportunities/OpportunityKanbanView.tsx`
- Frontend Store: `client/src/stores/kanbanStore.ts`
- Backend Controller: [OpportunityController.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/controllers/OpportunityController.ts)
- Backend Service: [OpportunityService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/OpportunityService.ts)

---

## 4. Flow 4: Task Overdue Dynamic Evaluation

Hệ thống **không** lưu trạng thái `OVERDUE` cố định trong DB để tránh ghi log/update đĩa lặp đi lặp lại.

```text
[Query Tasks Request] (Filter Overdue)
         │
         ▼
[TaskRepository.getOverdueTasks]
         │
         ▼ (SQL Query execution using Compound Index)
SELECT * FROM tasks 
WHERE status IN ('TODO', 'IN_PROGRESS') 
  AND due_at < NOW() 
  AND deleted_at IS NULL;
         │
         ▼
[Return Dynamic Overdue Task List]
```

### Key Files Involved:
- Backend Service: [TaskService.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/services/TaskService.ts)
- Backend Repository: [TaskRepository.ts](file:///Volumes/ChanCuu/Projects/MiniCRM/server/src/repositories/TaskRepository.ts)
