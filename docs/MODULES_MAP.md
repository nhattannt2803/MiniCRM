# MiniCRM Codebase Directory & Module Map

Tài liệu này cung cấp bản đồ cấu trúc thư mục chi tiết (Directory Index) của cả **Backend (`server/`)** và **Frontend (`client/`)**, giúp AI Agent và Developers nhanh chóng tìm chính xác file source code cần đọc hoặc sửa đổi.

---

## 1. Backend Codebase Map (`server/src/`)

```text
server/src/
├── app.ts                    # Khởi tạo Express App, CORS, Helmet, Global Error Handler
├── server.ts                 # Entry point khởi chạy HTTP Server (Port 5000) & khởi tạo Workers
│
├── middleware/               # Middleware xử lý Auth Guard, Multi-Tenant Guard, Error Handling
│   ├── authMiddleware.ts     # JWT Authentication & Authorization check
│   ├── tenantMiddleware.ts   # Multi-Tenant Guard (Extract X-Biz-Id header & attach req.bizId)
│   ├── errorMiddleware.ts    # Centralized AppError Handling
│   └── rateLimitMiddleware.ts # Rate limiting cho API & Auth routes
│
├── controllers/              # Layer 1: Controller (Validate & HTTP Response handling)
│   └── crmControllers.ts     # Endpoint handlers cho tất cả các miền nghiệp vụ CRM & SaaS
│
├── services/                 # Layer 2: Business Logic & Transaction Boundaries (biz_id Scoped)
│   ├── BusinessService.ts    # Quản lý Doanh nghiệp (Tạo Biz, gán Admin chủ sở hữu, toggle ACTIVE/INACTIVE)
│   ├── AuthService.ts        # Logic đăng ký tài khoản nhanh, đăng nhập, lấy thông tin me
│   ├── UserService.ts        # Logic quản lý tài khoản nhân viên & Super Admin hệ thống
│   ├── LeadService.ts        # Business logic Lead, Identity resolution, LeadProduct, LeadAd & Smax URL parser
│   ├── LeadConversionService.ts # Chuyển đổi Lead ➔ Opportunity trong atomic transaction (hỗ trợ chọn Pipeline & Stage)
│   ├── OpportunityService.ts # Business logic Deal & ghi vết Stage History
│   ├── PipelineService.ts    # Quản lý Pipeline, Stage & Danh mục sản phẩm
│   ├── QuoteService.ts       # Báo giá & Chi tiết báo giá
│   ├── CompanyService.ts     # CRUD Công ty
│   ├── ContactService.ts     # CRUD Người liên hệ
│   ├── CustomerService.ts    # Quản lý Hồ sơ Khách hàng (Derived Customers)
│   ├── IdentityResolutionService.ts # Xử lý trùng lặp nhận dạng khách hàng
│   ├── ConversationService.ts # Hội thoại & Tin nhắn tư vấn đa kênh Smax.ai
│   ├── ActivityService.ts    # Nhật ký tương tác Polymorphic & Công việc (Tasks, Campaigns)
│   ├── DashboardService.ts   # Thống kê KPIs, Phễu bán hàng (Funnel), Pipeline
│   ├── SystemSettingService.ts # Cấu hình hệ thống theo Biz (Smax API Token, quy tắc trùng lặp)
│   └── seedEngine.ts         # Engine nạp dữ liệu mẫu Multi-Biz cho các ngành demo
│
├── automation/               # Core Event-Driven Automation Engine
│   ├── engine/
│   │   ├── AutomationEngine.ts   # Router chính nhận event & khớp rules theo biz_id
│   │   ├── ConditionEvaluator.ts # Bộ đánh giá cây điều kiện AND/OR
│   │   ├── ActionExecutor.ts     # Thực thi các hành động (CREATE_TASK, WEBHOOK...)
│   │   └── IdempotencyGuard.ts   # Chống lặp execution via SHA256 hash
│   ├── workers/
│   │   ├── outboxWorker.ts       # Worker đọc bảng outbox_events đẩy vào BullMQ
│   │   └── automationWorker.ts   # BullMQ Consumer gọi AutomationEngine
│   ├── triggers/                 # Định nghĩa Event Triggers
│   ├── conditions/               # Toán tử so sánh (=, !=, >, <, CONTAINS)
│   └── actions/                  # Cấu hình Action Types
│
├── events/                   # Outbox event publisher (`outboxPublisher.ts`)
├── queues/                   # BullMQ Queue instance (`automationQueue.ts`)
├── routes/                   # Router đính kèm các Controller endpoints (`apiRoutes.ts`)
└── utils/                    # JWT helpers, Password hashers, Logger
```

---

## 2. Frontend Codebase Map (`client/src/`)

```text
client/src/
├── main.tsx                  # Entry point React 18 render
├── App.tsx                   # React Router configuration, /:bizSlug/* dynamic routes & Guards
├── index.css                 # Tailwind CSS directives & Custom CSS
│
├── features/                 # Modules giao diện phân theo miền nghiệp vụ
│   ├── auth/                 # Form đăng nhập (LoginPage), Đăng ký (RegisterPage), Chờ Biz (NoBusinessPage)
│   ├── users/                # Quản lý nhân viên (UsersListPage), System Users Admin (SystemUsersPage)
│   ├── businesses/           # Quản lý Doanh nghiệp hệ thống cho Super Admin (SystemBusinessesPage)
│   ├── leads/                # LeadListPage, MyLeadsPage, LeadDetailPage (Smax Frame, Ad & Products tab), QuickCreateLeadModal
│   ├── opportunities/        # Phễu bán hàng (Funnel), Bảng kéo thả Kanban Board, Table View, Stage Progress
│   ├── companies/            # Danh sách & Detail Công ty (Sub-item của Khách hàng)
│   ├── contacts/             # Danh sách & Detail Người liên hệ (Sub-item của Khách hàng)
│   ├── customers/            # Hồ sơ Khách hàng chính thức (Sub-item chính của Khách hàng)
│   ├── automations/          # Workflow Builder kéo thả, Xem nhật ký Execution Logs
│   ├── tasks/                # Danh sách Task, Bộ lọc Task Overdue
│   ├── activities/           # Timeline nhật ký cuộc gọi, email, họp
│   ├── overview/             # Trang tổng quan cho Sale, Leader và Manager
│   ├── dashboard/            # BI Analytics, Funnel Chart (Recharts), KPI Cards
│   ├── products/             # Quản lý Danh mục sản phẩm & dịch vụ
│   ├── quotes/               # Quản lý Báo giá & Chi tiết báo giá
│   ├── roles/                # Quản lý Vai trò & Phân quyền
│   ├── settings/             # Cấu hình Doanh nghiệp & Token kết nối
│   ├── staff/                # Quản lý Đội ngũ nhân sự
│   └── teams/                # Quản lý Nhóm / Đội ngũ bán hàng
│
├── i18n/                     # Trình đa ngôn ngữ (i18next)
│   ├── index.ts              # Khởi tạo i18n configuration
│   └── locales/              # Tệp dịch thuật ngôn ngữ (vi.json, en.json)
│
├── stores/                   # Quản lý State toàn cục bằng Zustand
│   ├── authStore.ts          # State user đăng nhập, danh sách Businesses, activeBiz, switchBizBySlug
│   ├── kanbanStore.ts        # State bảng Kanban & Optimistic Stage Dragging
│   └── leadStore.ts          # State bộ lọc & danh sách Leads
│
├── hooks/                    # Custom React Hooks
│   └── useBizNavigate.ts     # Hook điều hướng an toàn tự động đính kèm tenant slug /:bizSlug/
│
├── services/                 # Call REST APIs tới Backend (Axios Client)
│   ├── api.ts                # Axios instance đính kèm X-Biz-Id header & JWT Bearer token
│   └── crmService.ts         # API wrappers cho toàn bộ endpoints
│
├── layouts/                  
│   ├── MainLayout.tsx        # Layout CRM chính đính kèm /:bizSlug/ (Sidebar thu gọn mặc định, Business Switcher)
│   └── SystemLayout.tsx      # Standalone Layout Quản trị Super Admin hệ thống (/system/users, /system/businesses)
│
├── components/               # UI Components tái sử dụng (DataTable, Tag, Modal...)
├── types/                    # Interfaces & TypeScript Types chung (`index.ts`)
└── utils/                    # Currency formatters, Date formatters
```

---

## 3. Map Quy Trình Tìm Kiếm Khi Cần Sửa Code

- **Sửa API / Thêm Endpoint:**  
  `routes/apiRoutes.ts` ➔ `controllers/crmControllers.ts` ➔ `services/<Feature>Service.ts`

- **Sửa Dynamic Tenant Slug URL Routing:**  
  `client/src/App.tsx` ➔ `client/src/layouts/MainLayout.tsx` ➔ `client/src/stores/authStore.ts`

- **Sửa Super Admin Quản Lý Doanh Nghiệp:**  
  `client/src/features/businesses/SystemBusinessesPage.tsx` ➔ `server/src/services/BusinessService.ts`

- **Sửa Automation Engine:**  
  `server/src/automation/engine/ActionExecutor.ts` ➔ `server/src/automation/engine/AutomationEngine.ts`
