# MiniCRM Database Schema & Data Dictionary

Tài liệu này đóng vai trò là **từ điển dữ liệu (Data Dictionary)** cho cơ sở dữ liệu MySQL 8.x của dự án MiniCRM, giúp AI Agent và Developers tra cứu nhanh các bảng, trường dữ liệu, Enums, và quan hệ Polymorphic mà không cần parse lại file [`schema.prisma`](file:///Volumes/ChanCuu/Projects/MiniCRM/server/prisma/schema.prisma).

---

## 1. Database Specifications & Decisions

- **Database Engine:** MySQL 8.x (InnoDB, `utf8mb4_unicode_ci`).
- **Primary Key Strategy:** `BIGINT UNSIGNED AUTO_INCREMENT` (Tối ưu B-Tree clustered index, tránh phân mảnh đĩa đệm so với UUID v4 ngẫu nhiên).
- **Soft Delete:** Áp dụng trường `deleted_at DATETIME(3) NULL` trên các entity nghiệp vụ chính (`leads`, `companies`, `contacts`, `customers`, `opportunities`, `products`, `quotes`, `automations`). Không áp dụng soft delete trên các bảng vết lịch sử (`audit_logs`, `automation_executions`, `outbox_events`).

---

## 2. Table Index & Categorization

### Group A: Identity & Access Control (IAM)
- **`roles`**: Danh mục vai trò (`ADMIN`, `SALES_EXEC`, `SALES_MANAGER`).
- **`users`**: Người dùng hệ thống (Tài khoản Sales, Manager, Admin).
- **`user_roles`**: Bảng trung gian n-n giữa `users` và `roles`.

### Group B: Core CRM Entities (Customer Journey)
- **`leads`**: Khách hàng tiềm năng ban đầu chưa qualify (`NEW`, `CONTACTED`, `QUALIFIED`, `UNQUALIFIED`, `CONVERTED`).
- **`companies`**: Hồ sơ công ty/doanh nghiệp (B2B).
- **`contacts`**: Người liên hệ cá nhân thuộc công ty hoặc B2C.
- **`customers`**: Hồ sơ Khách hàng chính thức (Derived từ Deal WON hoặc Lead Qualified). Hỗ trợ cả B2B (`company_id`) và B2C (`contact_id`).
- **`campaigns`**: Chiến dịch Marketing thu hút Leads & Opportunities.

### Group C: Sales Pipeline & Deal Management
- **`pipelines`**: Danh mục quy trình bán hàng.
- **`pipeline_stages`**: Các giai đoạn trong phễu (`QUALIFICATION`, `NEEDS_ANALYSIS`, `PROPOSAL`, `NEGOTIATION`, `CLOSED_WON`, `CLOSED_LOST`).
- **`opportunities`**: Cơ hội bán hàng / Deal giá trị tài chính.
- **`opportunity_stage_histories`**: Nhật ký chuyển giai đoạn (phục vụ tính toán Funnel & Time-in-Stage).
- **`products`**: Danh mục sản phẩm/dịch vụ master.
- **`opportunity_products`**: Sản phẩm đính kèm trong từng Opportunity (với đơn giá snapshot).
- **`quotes`** & **`quote_items`**: Báo giá & Chi tiết báo giá cho khách hàng.

### Group D: Polymorphic Activities & Tasks
- **`activities`**: Nhật ký tương tác thực tế (`CALL`, `EMAIL`, `MEETING`, `NOTE`, `DEMO`, `SMS`).
- **`tasks`**: Việc cần làm (`TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- **`notifications`**: Thông báo trong ứng dụng gửi cho Sales/Manager.
- **`audit_logs`**: Nhật ký truy vết thay đổi dữ liệu.

### Group E: Metadata-Driven Automation Engine
- **`automations`**: Cấu hình quy trình tự động hóa (`status` = `ACTIVE` / `INACTIVE`).
- **`automation_triggers`**: Sự kiện kích hoạt (`LEAD_CREATED`, `LEAD_QUALIFIED`, `OPPORTUNITY_STAGE_CHANGED`, `TASK_OVERDUE`).
- **`automation_conditions`**: Cây điều kiện lồng nhau (AND/OR Logic tree dưới dạng JSON).
- **`automation_actions`**: Danh sách hành động (`CREATE_TASK`, `UPDATE_LEAD`, `SEND_NOTIFICATION`, `CALL_WEBHOOK`).
- **`automation_executions`** & **`automation_execution_logs`**: Nhật ký lịch sử chạy automation.
- **`outbox_events`**: Transactional Outbox Queue (`PENDING`, `PROCESSED`, `FAILED`).

---

## 3. Polymorphic Relationships (Activities & Tasks)

Các bảng `activities` và `tasks` được thiết kế dạng **Polymorphic Linkage** để có thể gắn vào bất kỳ thực thể nào trong hệ thống mà không cần n+1 cột FK:

- `related_type` (`VARCHAR(30)`): Tên thực thể liên kết (`LEAD`, `OPPORTUNITY`, `COMPANY`, `CONTACT`, `CUSTOMER`).
- `related_id` (`BIGINT UNSIGNED`): ID của thực thể tương ứng.

### Ví dụ Query Polymorphic Activities của một Lead:
```sql
SELECT * FROM activities 
WHERE related_type = 'LEAD' 
  AND related_id = 123 
ORDER BY created_at DESC;
```

---

## 4. Enum Reference Table

| Enum Name | Possible Values | Descriptions |
|---|---|---|
| **LeadStatus** | `NEW`, `CONTACTED`, `QUALIFIED`, `UNQUALIFIED`, `CONVERTED` | Vòng đời của Lead |
| **LeadRating** | `HOT`, `WARM`, `COLD` | Mức độ tiềm năng |
| **OpportunityStageCategory** | `OPEN`, `WON`, `LOST` | Nhóm trạng thái Deal |
| **TaskStatus** | `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Trạng thái công việc (*Lưu ý: OVERDUE tính động!*) |
| **TaskPriority** | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | Mức độ ưu tiên |
| **ActivityType** | `CALL`, `EMAIL`, `MEETING`, `NOTE`, `DEMO`, `SMS` | Loại hình tương tác |
| **AutomationStatus** | `DRAFT`, `ACTIVE`, `INACTIVE`, `ARCHIVED` | Trạng thái quy trình |
| **OutboxStatus** | `PENDING`, `PROCESSED`, `FAILED` | Trạng thái outbox event |

---

## 5. Schema Location
File schema chính thức của Prisma nằm tại: [`server/prisma/schema.prisma`](file:///Volumes/ChanCuu/Projects/MiniCRM/server/prisma/schema.prisma)
