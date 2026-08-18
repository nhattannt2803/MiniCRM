# MiniCRM Codebase Directory & Module Map

Tài liệu này cung cấp bản đồ cấu trúc thư mục chi tiết (Directory Index) của cả **Backend (`server/`)** và **Frontend (`client/`)**, giúp AI Agent và Developers nhanh chóng tìm chính xác file source code cần đọc hoặc sửa đổi.

---

## 1. Backend Codebase Map (`server/src/`)

```text
server/src/
├── app.ts                    # Khởi tạo Express App, CORS, Helmet, Global Error Handler
├── server.ts                 # Entry point khởi chạy HTTP Server (Port 5000) & khởi tạo Workers
│
├── controllers/              # Layer 1: Controller (Validate & HTTP Response handling)
│   ├── AuthController.ts     # Đăng nhập, đăng ký, lấy thông tin me
│   ├── LeadController.ts     # CRUD Leads, chuyển đổi atomic Lead ➔ Opportunity
│   ├── OpportunityController.ts # CRUD Deals, chuyển stage Kanban
│   ├── CompanyController.ts  # CRUD Công ty
│   ├── ContactController.ts  # CRUD Người liên hệ
│   ├── CustomerController.ts # Quản lý Hồ sơ Khách hàng (Derived Customers)
│   ├── AutomationController.ts # Quản lý quy trình tự động hóa & Execution audit logs
│   ├── TaskController.ts     # CRUD Công việc & lọc Task quá hạn
│   ├── ActivityController.ts # Nhật ký tương tác Polymorphic (Call, Email, Meeting)
│   └── DashboardController.ts# Thống kê KPIs, Phễu bán hàng (Funnel), Pipeline
│
├── services/                 # Layer 2: Business Logic & Transaction Boundaries
│   ├── AuthService.ts        # Logic xác thực JWT, mã hóa password bcrypt
│   ├── LeadService.ts        # Business logic Lead & Atomic Transaction Conversion
│   ├── OpportunityService.ts # Business logic Deal & ghi vết Stage History
│   ├── AutomationService.ts  # Quản lý cấu hình Workflow Rules & Execution Logs
│   ├── TaskService.ts        # Logic tạo/cập nhật task & kiểm tra overdue
│   ├── ActivityService.ts    # Logic nhật ký hoạt động polymorphic
│   ├── DashboardService.ts   # Thống kê KPI & Aggregation Queries
│   └── seedEngine.ts         # Khởi tạo seed data 6 Automation Rules ban đầu
│
├── repositories/             # Layer 3: Direct Database Access via Prisma ORM
│   ├── LeadRepository.ts
│   ├── OpportunityRepository.ts
│   ├── CompanyRepository.ts
│   ├── ContactRepository.ts
│   ├── AutomationRepository.ts
│   ├── TaskRepository.ts
│   └── ActivityRepository.ts
│
├── automation/               # Core Metadata-Driven Automation Engine
│   ├── engine/
│   │   ├── AutomationEngine.ts   # Router chính nhận event & khớp rules
│   │   ├── ConditionEvaluator.ts # Bộ đánh giá cây điều kiện AND/OR
│   │   ├── ActionExecutor.ts     # Thực thi các hành động (CREATE_TASK, WEBHOOK...)
│   │   └── IdempotencyGuard.ts   # Chống lặp execution via SHA256 hash
│   ├── workers/
│   │   ├── outboxWorker.ts       # Worker đọc bảng outbox_events đẩy vào BullMQ
│   │   └── automationWorker.ts   # BullMQ Consumer gọi AutomationEngine
│   ├── triggers/                 # Các định nghĩa Event Triggers
│   ├── conditions/               # Các toán tử so sánh (=, !=, >, <, CONTAINS)
│   └── actions/                  # Cấu hình Action Types
│
├── events/                   # Event Types & Payload definitions
├── jobs/                     # Scheduled Jobs (Cron check Overdue Tasks, Stale Deals)
├── middleware/               # Auth Guard (JWT), Error Handler, Role Permission Guard
├── models/                   # TypeScript DTO Types & Interface definitions
├── queues/                   # BullMQ Queue instance (`automationQueue.ts`)
├── routes/                   # Router đính kèm các Controller endpoints (`apiRoutes.ts`)
├── utils/                    # JWT helpers, Password hashers, Logger
└── validators/               # Zod validation schemas cho DTOs
```

---

## 2. Frontend Codebase Map (`client/src/`)

```text
client/src/
├── main.tsx                  # Entry point React 18 render
├── App.tsx                   # React Router configuration & Global Providers
├── index.css                 # Tailwind CSS directives & Custom CSS
│
├── features/                 # Modules giao diện phân theo miền nghiệp vụ
│   ├── auth/                 # Form đăng nhập, Đổi mật khẩu
│   ├── leads/                # Danh sách Lead, Modal chuyển đổi Lead, Lead Detail
│   ├── opportunities/        # Bảng kéo thả Kanban Board, Table View, Stage Progress
│   ├── companies/            # Danh sách & Detail Công ty
│   ├── contacts/             # Danh sách & Detail Người liên hệ
│   ├── customers/            # Hồ sơ Khách hàng chính thức
│   ├── automations/          # Workflow Builder kéo thả, Xem nhật ký Execution Logs
│   ├── tasks/                # Danh sách Task, Bộ lọc Task Overdue
│   ├── activities/           # Timeline nhật ký cuộc gọi, email, họp
│   └── dashboard/            # BI Analytics, Funnel Chart (Recharts), KPI Cards
│
├── stores/                   # Quản lý State toàn cục bằng Zustand
│   ├── authStore.ts          # State user đăng nhập & Token JWT
│   ├── kanbanStore.ts        # State bảng Kanban & Optimistic Stage Dragging
│   ├── leadStore.ts          # State bộ lọc & danh sách Leads
│   └── automationStore.ts    # State cấu hình Workflow Builder
│
├── services/                 # Call REST APIs tới Backend (Axios Client)
│   ├── api.ts                # Axios instance cấu hình BaseURL & Interceptors (JWT)
│   ├── leadService.ts        # API wrapper cho Lead endpoints
│   ├── opportunityService.ts # API wrapper cho Opportunity & Stage endpoints
│   ├── automationService.ts # API wrapper cho Automation endpoints
│   └── dashboardService.ts  # API wrapper cho Dashboard stats
│
├── layouts/                  # AppLayout (Sidebar, Top Navigation Bar, Breadcrumb)
├── components/               # UI Components tái sử dụng (DataTable, Tag, Modal...)
├── types/                    # Interfaces & TypeScript Types chung
└── utils/                    # Currency formatters, Date formatters (dayjs)
```

---

## 3. Map Quy Trình Tìm Kiếm Khi Cần Sửa Code

- **Sửa API / Thêm Endpoint:**  
  `routes/apiRoutes.ts` ➔ `controllers/<Feature>Controller.ts` ➔ `validators/<Feature>Validator.ts` ➔ `services/<Feature>Service.ts`

- **Sửa Giao Diện UI / Form:**  
  `client/src/features/<feature>/` ➔ `client/src/stores/<feature>Store.ts` ➔ `client/src/services/<feature>Service.ts`

- **Sửa Automation Engine / Thêm Action mới:**  
  `server/src/automation/engine/ActionExecutor.ts` ➔ `server/src/automation/engine/AutomationEngine.ts`
