# CRM PRODUCTION ARCHITECTURE & MULTI-TENANT SAAS SPECIFICATION

**Database Engine:** MySQL 8.x (InnoDB, utf8mb4, utf8mb4_unicode_ci)  
**Backend Architecture:** Node.js / Express / TypeScript + Multi-Tenant Isolation + Outbox Pattern + BullMQ (Redis)  
**Frontend Stack Compatibility:** React 18 + Tailwind CSS + Ant Design + Zustand  

---

## 1. Multi-Tenant SaaS Architecture (Multi-Biz)

Hệ thống MiniCRM được thiết kế theo kiến trúc **Multi-Tenant SaaS (Multi-Biz)**. Một tài khoản người dùng (`User`) có thể thuộc nhiều Doanh nghiệp khác nhau (`Business`), và vai trò (`Role`) của người dùng được xác định độc lập theo từng Doanh nghiệp thông qua bảng trung gian `BusinessMember`.

```text
                                  ┌───────────────────────────┐
                                  │           User            │
                                  │ (isSuperAdmin, email,...) │
                                  └─────────────┬─────────────┘
                                                │ 1
                                                ▼ n
                                  ┌───────────────────────────┐
                                  │      BusinessMember       │
                                  │  (biz_id, user_id, role)  │
                                  └─────────────┬─────────────┘
                                                │ n
                                                ▼ 1
                                  ┌───────────────────────────┐
                                  │         Business          │
                                  │    (name, slug, plan)     │
                                  └─────────────┬─────────────┘
                                                │ 1
                                                ▼ n
    ┌───────────────────────────────────────────┴───────────────────────────────────────────┐
    │                                                                                       │
    ▼                                       ▼                                               ▼
  Leads                                Opportunities                                    Products
 (biz_id)                                (biz_id)                                       (biz_id)
```

### Cơ chế Cô lập Dữ liệu (Data Isolation Layer)
- **Column-based Multi-Tenancy:** Cột `biz_id` (`BIGINT UNSIGNED`) có mặt ở 18 bảng nghiệp vụ (`leads`, `companies`, `contacts`, `customers`, `opportunities`, `pipelines`, `products`, `quotes`, `activities`, `tasks`, `notifications`, `audit_logs`, `outbox_events`, `automations`, `system_settings`, `conversations`, `campaigns`, `roles`).
- **Composite Indexes:** Mọi chỉ mục (index) và ràng buộc duy nhất (unique constraint) đều đính kèm `biz_id` làm leading column (VD: `@@unique([bizId, code])` cho `roles` và `products`).
- **Tenant Context Middleware (`tenantMiddleware.ts`):** Trích xuất header `X-Biz-Id` từ client, kiểm tra tư cách thành viên `BusinessMember`, và gắn `req.bizId` vào mọi request API nghiệp vụ.

---

## 2. Platform Authentication, Super Admin Console & Dynamic Routing

### 2.1. Luồng Đăng Ký Tài Khoản Ẩn (`/portal-register`)
- **Trang Đăng Ký Ẩn:** Được đặt tại đường dẫn `/portal-register` (không hiển thị trên các thanh điều hướng public).
- **Không yêu cầu xác thực email:** Đăng ký trực tiếp và cấp JWT token ngay sau khi hoàn tất.
- **Tài khoản mặc định:** Tài khoản mới đăng ký chưa thuộc bất kỳ Doanh nghiệp nào (`memberships.length === 0`).

### 2.2. Trang Đợi Mời Doanh Nghiệp (`/no-business`)
- Người dùng đã đăng ký thành công nhưng chưa được bổ nhiệm vào Biz nào sẽ tự động chuyển hướng tới `/no-business`.
- Trang hiển thị thông tin tài khoản, hướng dẫn liên hệ Admin của Biz để được mời qua email.

### 2.3. Cổng Quản Trị Hệ Thống Độc Lập (`SystemLayout.tsx` & `/system/*`)
- **Layout độc lập (`SystemLayout.tsx`):** Dành riêng cho Super Admin, **không phụ thuộc vào bất kỳ context `bizId` hay Doanh nghiệp nào**.
- **Quản lý Tài Khoản (`/system/users`):** Bật/tắt trạng thái người dùng (`isActive`) và phân quyền Super Admin (`isSuperAdmin`).
- **Quản lý Doanh Nghiệp (`/system/businesses`):**
  - **Tạo Doanh Nghiệp mới:** Super Admin tạo Biz, chỉ định URL slug và gán email chủ sở hữu (Admin sở hữu). Tự động nạp bộ Role & Pipeline mặc định.
  - **Bật/Tắt trạng thái hoạt động Biz:** Chuyển đổi trạng thái `ACTIVE` vs `INACTIVE`. Khi Biz bị `INACTIVE`, người dùng thuộc Biz đó bị tạm ngưng truy cập CRM.

### 2.4. Định Tuyến URL Định Danh Mật Danh Doanh Nghiệp (`/:bizSlug/...`)
- **Routing tiền tố Slug:** Mọi đường dẫn CRM đều chứa mật danh của Doanh nghiệp (`/:bizSlug/`):
  - `http://localhost:5173/xedien/dashboard`
  - `http://localhost:5173/xedien/leads`
  - `http://localhost:5173/test-1/opportunities`
- **Dynamic URL Switching:** Khi chọn Biz khác trên Header bar, URL tự động cập nhật sang `/:newBizSlug/...`.
- **Deep Link Resolution (`switchBizBySlug`):** Khi truy cập trực tiếp URL bất kỳ (ví dụ `/move-bikes/leads`), ứng dụng kiểm tra tư cách thành viên của người dùng đối với `move-bikes`, tự động kích hoạt context Biz tương ứng và cập nhật `X-Biz-Id` header.

---

## 3. Domain Analysis & Core CRM Flows

Hệ thống CRM hỗ trợ trọn vẹn vòng đời khách hàng từ khâu tiếp cận ban đầu cho đến chăm sóc sau bán hàng trong phạm vi tenant (`biz_id`):

```text
Lead (Tiềm năng) ──► Qualification ──► Opportunity (Cơ hội) ──► Pipeline Stage ──► Won/Lost ──► Customer (Khách hàng)
```

### 3.1. Chuyển đổi Lead (Lead Conversion Logic)
- **Lead** đại diện cho một người hoặc tổ chức tiềm năng chưa được xác thực đầy đủ.
- Khi Lead đạt trạng thái `QUALIFIED`, quy trình chuyển đổi sẽ kích hoạt trong một **Atomic DB Transaction** (bao gồm `biz_id`).
- **Quy tắc chống trùng lặp (No-Duplicate Data Rule):**
  - Tạo `companies` & `contacts` nếu chưa liên kết.
  - Tạo `opportunities` mới thuộc `biz_id` liên kết với Company & Contact.
  - Lead chuyển trạng thái `CONVERTED`, cập nhật `converted_at` và phát Outbox Event đính kèm `biz_id`.

### 3.2. Transactional Outbox Pattern & Event-Driven Automation Engine
- Ghi vào `outbox_events` trong **cùng DB transaction**.
- `outboxWorker` đọc event `PENDING` đẩy vào BullMQ Queue (`Redis`).
- `automationWorker` thực thi cây điều kiện (AND/OR Logic tree) và thực thi các hành động (`CREATE_TASK`, `UPDATE_LEAD`, `SEND_NOTIFICATION`, `CALL_WEBHOOK`).
- **Chống trùng lặp (Idempotency Guard):** Kiểm tra hash SHA256 `SHA256(automation_id:event_id:entity_type:entity_id)` trước khi thực thi.

---

## 4. Text ERD (Logical Architecture)

```text
users (isSuperAdmin) ──┬──< business_members >── businesses (plan, status, slug)
                       ├──< leads (owner) ──┬──< lead_products >── products (biz_id)
                       │                    └──< lead_ads (ad_id, campaign_id)
                       ├──< companies (owner)
                       ├──< contacts (owner)
                       ├──< customers (owner)
                       ├──< opportunities (owner)
                       ├──< activities (owner / creator)
                       ├──< tasks (assigned_to / creator)
                       └──< audit_logs (actor)

businesses (biz_id) ──┬──< roles (biz_id, code)
                      ├──< campaigns (biz_id)
                      ├──< companies (biz_id)
                      ├──< contacts (biz_id)
                      ├──< customers (biz_id)
                      ├──< pipelines (biz_id) ──< pipeline_stages
                      ├──< opportunities (biz_id) ──┬──< opportunity_stage_histories
                      │                             ├──< opportunity_products >── products (biz_id)
                      │                             └──< quotes (biz_id) ──< quote_items
                      ├──< automations (biz_id)
                      ├──< system_settings (biz_id, key)
                      ├──< conversations (biz_id, smax_biz_slug) ──< messages
                      ├──< activities (biz_id, polymorphic)
                      ├──< tasks (biz_id, polymorphic)
                      └──< outbox_events (biz_id) ──► Redis/BullMQ ──► Automation Worker
```

---

## 5. Summary of Key Architecture Decisions

1. **Primary Key:** `BIGINT UNSIGNED AUTO_INCREMENT` cho mọi bảng chính để tối ưu B-Tree clustered index ghi đĩa tuần tự.
2. **Multi-Tenancy:** Cột `biz_id` làm leading index ở 18 bảng nghiệp vụ.
3. **IAM Scoping:** Vai trò (`Role`) được scope per-tenant (`biz_id, code`), trong khi `isSuperAdmin` thuộc cấp Platform User.
4. **Dynamic Tenant Slug Routing:** Tiền tố `/:bizSlug/` ở tất cả CRM routes kết hợp với `switchBizBySlug`.
5. **Standalone Admin Layout:** `SystemLayout.tsx` tách biệt hoàn toàn khỏi tenant context với 2 trang `/system/users` và `/system/businesses`.
6. **Multichannel & Smax.ai Integration:** Tự động định danh PSID, lưu giữ vết quảng cáo (`lead_ads`), liên kết đa sản phẩm (`lead_products`), và cache hội thoại 15 phút.
