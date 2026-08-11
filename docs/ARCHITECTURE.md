# CRM PRODUCTION ARCHITECTURE & DATABASE SPECIFICATION

**Database Engine:** MySQL 8.x (InnoDB, utf8mb4, utf8mb4_unicode_ci)  
**Backend Architecture:** Node.js / Express / TypeScript + Outbox Pattern + BullMQ (Redis)  
**Frontend Stack Compatibility:** React + Tailwind CSS + Ant Design  

---

## 1. Domain Analysis

Hệ thống CRM hỗ trợ trọn vẹn vòng đời khách hàng từ khâu tiếp cận ban đầu cho đến chăm sóc sau bán hàng:

```text
Lead (Tiềm năng) ──► Qualification ──► Opportunity (Cơ hội) ──► Pipeline Stage ──► Won/Lost ──► Customer (Khách hàng)
```

### Chuyển đổi Lead (Lead Conversion Logic)
- **Lead** đại diện cho một người hoặc tổ chức tiềm năng chưa được xác thực đầy đủ.
- Khi Lead đạt trạng thái `QUALIFIED`, quy trình chuyển đổi sẽ kích hoạt (hoặc thủ công hoặc tự động qua Automation Engine).
- **Quy tắc chống trùng lặp (No-Duplicate Data Rule):**
  - Nếu Lead chưa có `company_id`, hệ thống tạo mới bảng `companies` và gán FK vào Lead.
  - Nếu Lead chưa có `contact_id`, hệ thống tạo mới bảng `contacts` thuộc `company_id` trên.
  - Tạo một `opportunities` mới liên kết với Company, Contact và Lead.
  - Lead cập nhật `status = 'CONVERTED'`, lưu `converted_opportunity_id`, `converted_customer_id`, và `converted_at`.

### Mô hình Company - Contact - Customer
- **Customer không tách biệt khỏi Company/Contact:** Thay vì tạo bảng Customer trùng lặp thông tin với Company hoặc Contact, bảng `customers` đóng vai trò là **Hồ sơ Khách hàng chính thức (Customer Account Profile)**.
- Bảng `customers` sử dụng polymorphic constraint / check constraint hỗ trợ hai mô hình bán hàng:
  - **B2B:** `entity_type = 'COMPANY'`, liên kết tới `company_id`.
  - **B2C:** `entity_type = 'CONTACT'`, liên kết tới `contact_id`.
- Một Customer có thể có nhiều `opportunities` (hỗ trợ bán lặp lại, mua thêm service/addon).

---

## 2. Text ERD (Logical Architecture)

```text
users ──┬──< leads (owner)
        ├──< companies (owner)
        ├──< contacts (owner)
        ├──< customers (owner)
        ├──< opportunities (owner)
        ├──< activities (owner / creator)
        ├──< tasks (assigned_to / creator)
        └──< audit_logs (actor)

companies ──┬──< contacts
            ├──< leads
            ├──< customers (B2B)
            └──< opportunities

contacts ──┬──< leads
           ├──< customers (B2C)
           └──< opportunities

pipelines ──< pipeline_stages ──< opportunities ──┬──< opportunity_stage_histories
                                                  ├──< opportunity_products >── products
                                                  ├──< quotes ──< quote_items >── products
                                                  ├──< activities (polymorphic)
                                                  └──< tasks (polymorphic)

campaigns ──┬──< leads
            └──< opportunities (ROI attribution)

automations ──┬──< automation_triggers
              ├──< automation_conditions (nested AND/OR tree)
              ├──< automation_actions
              └──< automation_executions ──< automation_execution_logs

outbox_events ── (Transactional Outbox) ──► Redis/BullMQ ──► Automation Worker
```

---

## 3. Quản lý Thực thể & Quan hệ (Entity Relationships)

1. **Lead ↔ Company ↔ Contact:**
   - Lead hỗ trợ nullable `company_id` và `contact_id`. Khi nhập lead dạng raw, thông tin lưu ở `company_name`, `first_name`, `last_name`. Khi qualify, sẽ populate vào bảng `companies` và `contacts`.
2. **Opportunity ↔ Pipeline Stage:**
   - Stage không hard-code bằng `ENUM` mà tham chiếu FK tới `pipeline_stages`.
   - Mỗi lần Opportunity thay đổi stage, một record mới tự động được ghi vào `opportunity_stage_histories` để phục vụ tính toán Funnel, Time-in-Stage và Conversion Rate.
3. **Product ↔ Opportunity ↔ Quote:**
   - `products` lưu danh mục sản phẩm/dịch vụ master.
   - `opportunity_products` lưu các item trong deal (có giá snapshot tại thời điểm báo giá).
   - `quotes` & `quote_items` cho phép tạo nhiều phiên bản báo giá (versioning) cho cùng một Opportunity.
4. **Activity ↔ Task (Polymorphic Timeline & Action):**
   - Bảng `activities` lưu tương tác thực tế đã/đang diễn ra (`CALL`, `EMAIL`, `MEETING`, `NOTE`, `DEMO`, `SMS`) liên kết với bất kỳ thực thể nào qua `(related_type, related_id)`.
   - Bảng `tasks` lưu việc cần làm (`TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).

---

## 4. Các Quyết định Kiến trúc Quan trọng (Architecture Decisions)

### 4.1. Primary Key Strategy: `BIGINT UNSIGNED AUTO_INCREMENT`
- **Quyết định:** Sử dụng `BIGINT UNSIGNED AUTO_INCREMENT` cho Primary Key của toàn bộ các bảng chính.
- **Lý do:**
  - Trong MySQL InnoDB (B-Tree clustered index), auto-increment integer đảm bảo các dòng dữ liệu mới luôn ghi nối tiếp ở cuối trang đĩa (sequential page append), tránh gây phân trang (page split), nén lại index và phân mảnh đĩa so với UUID v4 ngẫu nhiên.
  - Tiết kiệm dung lượng bộ nhớ RAM (Buffer Pool) và Disk Space (8 bytes so with 36 bytes per UUID string).
  - Đối với các API công khai cần ẩn ID nội bộ, có thể bổ sung `uuid CHAR(36)` hoặc `ulid CHAR(26)` làm secondary unique index mà không làm giảm hiệu năng ghi của Primary Key.

### 4.2. Soft Delete Strategy
- Chỉ áp dụng `deleted_at DATETIME(3) NULL` cho các entity nghiệp vụ chính (`leads`, `companies`, `contacts`, `customers`, `opportunities`, `products`, `quotes`, `campaigns`, `automations`).
- **Không áp dụng soft delete** cho các bảng lịch sử/lỗi/vết audit (`opportunity_stage_histories`, `audit_logs`, `automation_executions`, `outbox_events`) nhằm đảm bảo tính toàn vẹn và toàn vẹn pháp lý (data immutability).

### 4.3. Task Overdue Logic
- **Quyết định:** Không lưu trạng thái `OVERDUE` cố định vào cột `status` trong database.
- **Lý do:** Trạng thái quá hạn là phụ thuộc thời gian thực (`NOW()`). Nếu lưu `status = 'OVERDUE'`, hệ thống phải chạy cron job liên tục để UPDATE hàng triệu dòng làm lock row/table và ghi log thừa.
- **Giải pháp:** Trong DB, `status` chỉ gồm (`TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  - Đánh giá Overdue bằng query filter: `status IN ('TODO', 'IN_PROGRESS') AND due_at < NOW()`.
  - Đã tối ưu bằng Compound Index: `idx_tasks_due_status (due_at, status)` và `idx_tasks_assigned_status_due (assigned_to, status, due_at)`.

---

## 5. SQL Migration Complete
Vui lòng tham khảo file đính kèm: [`sql/01_schema.sql`](file:///Volumes/ChanCuu/Projects/MiniCRM/sql/01_schema.sql)

## 6. Seed Data Complete
Vui lòng tham khảo file đính kèm: [`sql/02_seed.sql`](file:///Volumes/ChanCuu/Projects/MiniCRM/sql/02_seed.sql)

---

## 7. Kiến trúc Automation Engine (Metadata-Driven Engine)

Cấu trúc Automation Engine gồm 6 bảng core hỗ trợ workflow builder kéo-thả:

### 7.1. Cấu trúc Metadata Điều kiện (`automation_conditions`)
Mỗi điều kiện lưu dưới dạng một node trong cây logic (AND/OR Tree):
```json
{
  "logic_operator": "AND",
  "conditions": [
    {
      "field": "opportunity.amount",
      "operator": ">=",
      "value": 100000000
    },
    {
      "field": "opportunity.stage_code",
      "operator": "=",
      "value": "PROPOSAL"
    }
  ]
}
```

### 7.2. Cấu trúc Action Configuration (`automation_actions`)
Hỗ trợ mở rộng không giới hạn action bằng JSON config schema:
- **Action `CREATE_TASK`:**
  ```json
  {
    "type": "CREATE_TASK",
    "config": {
      "title": "Contact new lead",
      "due_in_hours": 2,
      "priority": "HIGH",
      "assignee_strategy": "LEAD_OWNER"
    }
  }
  ```
- **Action `CALL_WEBHOOK`:**
  ```json
  {
    "type": "CALL_WEBHOOK",
    "config": {
      "url": "https://api.thirdparty.com/webhook",
      "method": "POST",
      "headers": { "Authorization": "Bearer token" }
    }
  }
  ```

---

## 8. Mẫu Automation Seed
Hệ thống đã được seed 6 quy trình tự động hóa thực tế trong file [`sql/02_seed.sql`](file:///Volumes/ChanCuu/Projects/MiniCRM/sql/02_seed.sql):
1. **Automation 1:** Tạo Lead mới ➔ Tự động phân công Sales & Tạo Task "Contact new lead" (+2h).
2. **Automation 2:** Lead chuyển trạng thái `QUALIFIED` ➔ Tự động tạo Opportunity.
3. **Automation 3:** Opportunity sang stage `PROPOSAL` ➔ Tự động tạo Task "Send quotation".
4. **Automation 4:** Opportunity không có Activity 7 ngày ➔ Gửi Notification cho Owner & Tạo Task follow-up.
5. **Automation 5:** Opportunity `WON` ➔ Kích hoạt Customer & Tạo Task Onboarding.
6. **Automation 6:** Task bị Overdue ➔ Gửi Notification cho người được phân công.

---

## 9. Reporting Queries
Vui lòng tham khảo file đính kèm: [`sql/03_reporting_queries.sql`](file:///Volumes/ChanCuu/Projects/MiniCRM/sql/03_reporting_queries.sql)

---

## 10. Backend Service Layer Architecture (Node.js / Express / TypeScript)

Mô hình thiết kế chuẩn Clean Architecture 3 lớp:

```text
src/
├── controllers/              # Layer 1: HTTP Request Handling & Validation
│   ├── LeadController.ts
│   ├── OpportunityController.ts
│   └── AutomationController.ts
├── services/                 # Layer 2: Business Logic & Transaction Boundaries
│   ├── LeadService.ts
│   ├── OpportunityService.ts
│   ├── EventPublisherService.ts
│   └── AutomationEngineService.ts
├── repositories/             # Layer 3: Database Data Access Layer (Knex / Kysely / TypeORM)
│   ├── LeadRepository.ts
│   ├── OutboxRepository.ts
│   └── AutomationRepository.ts
├── workers/                  # Async Automation Workers (BullMQ)
│   ├── EventDispatcherWorker.ts
│   └── AutomationExecutionWorker.ts
└── engine/                   # Automation Engine Core Logic
    ├── ConditionEvaluator.ts # Evaluates condition rules
    ├── ActionExecutor.ts     # Dynamic action handlers registry
    └── IdempotencyGuard.ts   # Check duplicate executions
```

---

## 11. Event System & Async Queue (Transactional Outbox Pattern)

Để đảm bảo tuyệt đối không bị mất event khi HTTP request nảy sinh sự cố, hệ thống áp dụng **Transactional Outbox Pattern**:

```text
Client HTTP POST /leads
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ Database Transaction Boundary                           │
│                                                         │
│ 1. INSERT INTO leads (...)                              │
│ 2. INSERT INTO outbox_events (event_id, payload, ...)   │
│                                                         │
│ COMMIT                                                  │
└─────────────────────────────────────────────────────────┘
        │ (Transaction Committed)
        ▼
Outbox Poller / Debezium CDC ──► Push to Redis / BullMQ
                                          │
                                          ▼
                             Automation Execution Worker
                                          │
                                          ▼
                               Evaluate Conditions
                                          │
                                          ▼
                                Execute Actions & Log
```

---

## 12. Transaction Boundary, Idempotency & Retry Mechanism

### 12.1. Phân định ranh giới Transaction (Transaction Boundary)
- **Tạo Lead / Cập nhật Opportunity:** Chạy trong Database Transaction chính. Ngay trong transaction này, ghi bản tin event vào `outbox_events`.
- **Thực thi Automation:** Chạy hoàn toàn bất đồng bộ (Asynchronous) ở background worker.
- **Quy tắc cô lập lỗi:** Sự cố tại Automation Worker (ví dụ: lỗi gửi mail, lỗi webhook) **KHÔNG ĐƯỢC CAUSE ROLLBACK** nghiệp vụ chính của người dùng.

### 12.2. Đảm bảo Idempotency (Chống chạy lặp)
Mỗi lần khởi tạo execution, worker tạo `idempotency_key` theo công thức:
$$\text{idempotency\_key} = \text{SHA256}(\text{automation\_id} + ":" + \text{event\_id} + ":" + \text{entity\_type} + ":" + \text{entity\_id})$$

Được bảo vệ bởi `UNIQUE KEY (idempotency_key)` trong bảng `automation_executions`. Nếu event bị gửi trùng (duplicate queue message), Database DB Constraint sẽ reject đợt chèn thứ hai với lỗi Duplicate Entry (`ER_DUP_ENTRY`), giúp ngăn chặn tuyệt đối việc sinh trùng Task hoặc trùng Notification.

### 12.3. Cơ chế Retry độc lập (Exponential Backoff Retry)
- Nếu action gặp lỗi tạm thời (network glitch, third-party API timeout), `automation_executions.status` chuyển thành `FAILED`, `retry_count` tăng thêm 1.
- BullMQ worker lên lịch retry với chiến lược Exponential Backoff (`delay = initial_delay * 2^retry_count`).
- Số lần retry tối đa mặc định: `max_retries = 3`.

---

## 13. Khả năng mở rộng giao diện UI Workflow Builder (Drag-and-Drop Ready)

Bảng metadata `automations`, `automation_triggers`, `automation_conditions`, và `automation_actions` được thiết kế tương thích 1-1 với các framework React Workflow Canvas hàng đầu (như **React Flow**, **Ant Design X**, hoặc **Node-RED**):

- **Trigger Node:** Đánh dấu bởi `automation_triggers` (chứa `trigger_event`, `entity_type`).
- **Condition Nodes:** Đánh dấu bởi cây `automation_conditions` (hỗ trợ kéo các nhánh IF/ELSE, AND/OR).
- **Action Nodes:** Mỗi node tương ứng với một dòng trong `automation_actions` có thứ tự `step_order`.
