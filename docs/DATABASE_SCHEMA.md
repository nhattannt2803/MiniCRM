# MiniCRM Multi-Tenant Database Schema & Data Dictionary

Tài liệu này đóng vai trò là **từ điển dữ liệu (Data Dictionary)** cho cơ sở dữ liệu MySQL 8.x của dự án MiniCRM SaaS Multi-Tenant, giúp AI Agent và Developers tra cứu nhanh các bảng, trường dữ liệu, Enums, và quan hệ Polymorphic mà không cần parse lại file [`schema.prisma`](file:///Volumes/ChanCuu/Projects/MiniCRM/server/prisma/schema.prisma).

---

## 1. Database Specifications & Decisions

- **Database Engine:** MySQL 8.x (InnoDB, `utf8mb4_unicode_ci`).
- **Primary Key Strategy:** `BIGINT UNSIGNED AUTO_INCREMENT` (Tối ưu B-Tree clustered index, tránh phân mảnh đĩa đệm so với UUID v4 ngẫu nhiên).
- **Multi-Tenant Data Isolation:** Cột `biz_id` (`BIGINT UNSIGNED`) làm leading index trên 18 bảng nghiệp vụ.
- **Soft Delete:** Áp dụng trường `deleted_at DATETIME(3) NULL` trên các entity nghiệp vụ chính (`users`, `leads`, `companies`, `contacts`, `customers`, `opportunities`, `products`, `quotes`, `automations`). Não áp dụng soft delete trên các bảng vết lịch sử (`audit_logs`, `automation_executions`, `outbox_events`).

---

## 2. Table Index & Categorization

### Group A: SaaS Multi-Tenancy & Identity Access Management (IAM)
- **`businesses`**: Danh mục Doanh nghiệp khách hàng SaaS (`name`, `slug`, `status`, `plan`).
- **`business_members`**: Bảng liên kết người dùng vào Doanh nghiệp với vai trò tương ứng (`business_id`, `user_id`, `role_id`, `is_default`, `is_active`).
- **`roles`**: Danh mục vai trò theo từng Doanh nghiệp (`biz_id`, `code`, `name`). Unique constraint: `(biz_id, code)`.
- **`users`**: Tài khoản người dùng hệ thống (`email`, `password_hash`, `first_name`, `last_name`, `phone`, `is_active`, `is_super_admin`).

### Group B: Core CRM Entities (Scoped by `biz_id`)
- **`leads`**: Khách hàng tiềm năng ban đầu chưa qualify (`biz_id`, `status` = `NEW` | `CONTACTED` | `NURTURING` | `QUALIFIED` | `UNQUALIFIED` | `CONVERTED` | `LOST`, `smax_biz_slug`, `fb_page_id`, `fb_page_name`, `received_at`).
- **`lead_products`**: Bảng liên kết nhiều sản phẩm/dịch vụ quan tâm cho Lead (`lead_id`, `product_id`, `is_primary`, `notes`).
- **`lead_ads`**: Bảng ghi vết thuộc tính quảng cáo của Lead (`lead_id`, `ad_id`, `ad_name`, `adset_id`, `campaign_id`, `fb_page_id`, `source_type`). Unique constraint: `(lead_id, ad_id)`.
- **`companies`**: Hồ sơ công ty/doanh nghiệp B2B (`biz_id`).
- **`contacts`**: Người liên hệ cá nhân thuộc công ty hoặc B2C (`biz_id`).
- **`customers`**: Hồ sơ Khách hàng chính thức (`biz_id`, `customer_code`). Unique constraint: `(biz_id, customer_code)`.
- **`campaigns`**: Chiến dịch Marketing thu hút Leads & Opportunities (`biz_id`, `code`). Unique constraint: `(biz_id, code)`.

### Group C: Sales Pipeline & Deal Management (Scoped by `biz_id`)
- **`pipelines`**: Danh mục quy trình bán hàng (`biz_id`).
- **`pipeline_stages`**: Các giai đoạn trong phễu (`pipeline_id`, `code`, `order_no`, `probability`).
- **`opportunities`**: Cơ hội bán hàng / Deal giá trị tài chính (`biz_id`, `stage_id`, `amount`, `status`).
- **`opportunity_stage_histories`**: Nhật ký chuyển giai đoạn (phục vụ tính toán Funnel & Time-in-Stage).
- **`products`**: Danh mục sản phẩm/dịch vụ master (`biz_id`, `code`). Unique constraint: `(biz_id, code)`.
- **`opportunity_products`**: Sản phẩm đính kèm trong từng Opportunity (với đơn giá snapshot).
- **`quotes`** & **`quote_items`**: Báo giá & Chi tiết báo giá (`biz_id`, `quote_number`). Unique constraint: `(biz_id, quote_number)`.

### Group D: Polymorphic Activities & Tasks (Scoped by `biz_id`)
- **`activities`**: Nhật ký tương tác thực tế (`biz_id`, `type`, `related_type`, `related_id`).
- **`tasks`**: Việc cần làm (`biz_id`, `priority`, `status`, `due_at`, `related_type`, `related_id`).
- **`notifications`**: Thông báo trong ứng dụng gửi cho nhân viên (`biz_id`, `user_id`).
- **`audit_logs`**: Nhật ký truy vết thay đổi dữ liệu (`biz_id`, `user_id`).

### Group E: Event-Driven Automation Engine (Scoped by `biz_id`)
- **`automations`**: Cấu hình quy trình tự động hóa (`biz_id`, `is_active`, `trigger_type`, `triggers`, `conditions`, `actions`).
- **`automation_executions`** & **`automation_execution_logs`**: Nhật ký lịch sử chạy automation.
- **`outbox_events`**: Transactional Outbox Queue (`biz_id`, `event_type`, `payload`, `status` = `PENDING` | `PROCESSED` | `FAILED`).
- **`conversations`** & **`messages`**: Hội thoại & Tin nhắn tư vấn đa kênh Smax.ai (`biz_id`, `channel_type`, `channel_thread_id`, `smax_biz_slug`).
- **`system_settings`**: Cấu hình hệ thống theo Doanh nghiệp (`biz_id`, `key` = `SMAX_API_TOKEN` | `SMAX_BIZ_SLUG` | `SMAX_WEBHOOK_KEY` | `DUPLICATE_LEAD_RULES`, `value`). Unique constraint: `(biz_id, key)`.

---

## 3. Polymorphic Relationships (Activities & Tasks)

Các bảng `activities` và `tasks` được thiết kế dạng **Polymorphic Linkage** để có thể gắn vào bất kỳ thực thể nào trong hệ thống trong cùng tenant `biz_id`:

- `biz_id` (`BIGINT UNSIGNED`): ID doanh nghiệp sở hữu.
- `related_type` (`VARCHAR(30)`): Tên thực thể liên kết (`LEAD`, `OPPORTUNITY`, `COMPANY`, `CONTACT`, `CUSTOMER`).
- `related_id` (`BIGINT UNSIGNED`): ID của thực thể tương ứng.

### Ví dụ Query Polymorphic Activities thuộc Biz #1:
```sql
SELECT * FROM activities 
WHERE biz_id = 1 
  AND related_type = 'LEAD' 
  AND related_id = 123 
ORDER BY created_at DESC;
```

---

## 4. Enum Reference Table

| Enum Name | Possible Values | Descriptions |
|---|---|---|
| **LeadStatus** | `NEW`, `CONTACTED`, `NURTURING`, `QUALIFIED`, `UNQUALIFIED`, `CONVERTED`, `LOST` | Vòng đời của Lead |
| **LeadRating** | `HOT`, `WARM`, `COLD` | Mức độ tiềm năng |
| **OpportunityStatus** | `OPEN`, `WON`, `LOST` | Nhóm trạng thái Deal |
| **TaskStatus** | `TODO`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Trạng thái công việc (*Lưu ý: OVERDUE tính động!*) |
| **TaskPriority** | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | Mức độ ưu tiên |
| **ActivityType** | `CALL`, `EMAIL`, `MEETING`, `NOTE`, `DEMO`, `SMS`, `OTHER` | Loại hình tương tác |
| **BusinessStatus** | `ACTIVE`, `INACTIVE`, `SUSPENDED` | Trạng thái Doanh nghiệp |
| **BusinessPlan** | `FREE`, `STARTER`, `PRO`, `ENTERPRISE` | Gói cước SaaS |
| **OutboxStatus** | `PENDING`, `PROCESSED`, `FAILED` | Trạng thái outbox event |

---

## 5. Schema Location
File schema chính thức của Prisma nằm tại: [`server/prisma/schema.prisma`](file:///Volumes/ChanCuu/Projects/MiniCRM/server/prisma/schema.prisma)
