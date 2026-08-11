-- =============================================================================
-- CRM PRODUCTION DATABASE SCHEMA FOR MYSQL 8.X
-- Engine: InnoDB
-- Charset: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS automation_execution_logs;
DROP TABLE IF EXISTS automation_executions;
DROP TABLE IF EXISTS automation_actions;
DROP TABLE IF EXISTS automation_conditions;
DROP TABLE IF EXISTS automation_triggers;
DROP TABLE IF EXISTS automations;
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS opportunity_products;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS opportunity_stage_histories;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS pipeline_stages;
DROP TABLE IF EXISTS pipelines;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. USERS & ROLES
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_user_role (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. CAMPAIGNS
-- -----------------------------------------------------------------------------
CREATE TABLE campaigns (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL COMMENT 'FB_ADS, GOOGLE_ADS, TIKTOK, WEBSITE, EVENT, REFERRAL, EMAIL',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' COMMENT 'PLANNING, ACTIVE, COMPLETED, PAUSED, CANCELLED',
    budget DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    actual_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    expected_revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    start_date DATE NULL,
    end_date DATE NULL,
    owner_id BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_campaign_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_campaigns_status (status),
    INDEX idx_campaigns_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. COMPANIES / ACCOUNTS
-- -----------------------------------------------------------------------------
CREATE TABLE companies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    tax_code VARCHAR(50) NULL,
    email VARCHAR(191) NULL,
    phone VARCHAR(30) NULL,
    website VARCHAR(255) NULL,
    address TEXT NULL,
    owner_id BIGINT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROSPECT' COMMENT 'PROSPECT, ACTIVE, INACTIVE',
    is_customer TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_company_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_companies_owner (owner_id),
    INDEX idx_companies_name (name),
    INDEX idx_companies_tax_code (tax_code),
    INDEX idx_companies_is_customer (is_customer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. CONTACTS
-- -----------------------------------------------------------------------------
CREATE TABLE contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NULL,
    phone VARCHAR(30) NULL,
    position VARCHAR(100) NULL,
    department VARCHAR(100) NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    owner_id BIGINT UNSIGNED NULL,
    is_customer TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_contact_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    CONSTRAINT fk_contact_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_contacts_company (company_id),
    INDEX idx_contacts_owner (owner_id),
    INDEX idx_contacts_email (email),
    INDEX idx_contacts_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. CUSTOMERS
-- -----------------------------------------------------------------------------
CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    entity_type VARCHAR(20) NOT NULL COMMENT 'COMPANY, CONTACT',
    company_id BIGINT UNSIGNED NULL,
    contact_id BIGINT UNSIGNED NULL,
    owner_id BIGINT UNSIGNED NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, INACTIVE, CHURNED',
    customer_since DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    lifetime_value DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_customer_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    CONSTRAINT fk_customer_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_customer_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_customer_entity CHECK (
        (entity_type = 'COMPANY' AND company_id IS NOT NULL) OR
        (entity_type = 'CONTACT' AND contact_id IS NOT NULL)
    ),
    INDEX idx_customers_company (company_id),
    INDEX idx_customers_contact (contact_id),
    INDEX idx_customers_owner (owner_id),
    INDEX idx_customers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. LEADS
-- -----------------------------------------------------------------------------
CREATE TABLE leads (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    contact_id BIGINT UNSIGNED NULL,
    campaign_id BIGINT UNSIGNED NULL,
    owner_id BIGINT UNSIGNED NULL,
    source VARCHAR(50) NOT NULL COMMENT 'WEBSITE, REFERRAL, FB_ADS, GOOGLE_ADS, TIKTOK, EVENT, OUTBOUND, OTHER',
    status VARCHAR(30) NOT NULL DEFAULT 'NEW' COMMENT 'NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED, LOST',
    rating VARCHAR(20) NOT NULL DEFAULT 'WARM' COMMENT 'HOT, WARM, COLD',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NULL,
    phone VARCHAR(30) NULL,
    company_name VARCHAR(200) NULL,
    job_title VARCHAR(100) NULL,
    notes TEXT NULL,
    converted_opportunity_id BIGINT UNSIGNED NULL,
    converted_customer_id BIGINT UNSIGNED NULL,
    converted_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_lead_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    CONSTRAINT fk_lead_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_lead_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    CONSTRAINT fk_lead_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leads_status (status),
    INDEX idx_leads_owner (owner_id),
    INDEX idx_leads_source (source),
    INDEX idx_leads_created_at (created_at),
    INDEX idx_leads_email (email),
    INDEX idx_leads_campaign (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. PIPELINES & PIPELINE STAGES
-- -----------------------------------------------------------------------------
CREATE TABLE pipelines (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pipeline_stages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pipeline_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    order_no INT NOT NULL DEFAULT 1,
    probability DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '0.00 to 100.00 percentage',
    is_won TINYINT(1) NOT NULL DEFAULT 0,
    is_lost TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ps_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
    UNIQUE KEY uk_pipeline_stage_code (pipeline_id, code),
    INDEX idx_ps_pipeline_order (pipeline_id, order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. OPPORTUNITIES & STAGE HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE opportunities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NULL,
    contact_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NULL,
    lead_id BIGINT UNSIGNED NULL,
    campaign_id BIGINT UNSIGNED NULL,
    owner_id BIGINT UNSIGNED NULL,
    pipeline_id BIGINT UNSIGNED NOT NULL,
    stage_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    probability DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    expected_close_date DATE NULL,
    source VARCHAR(50) NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN' COMMENT 'OPEN, WON, LOST',
    lost_reason VARCHAR(255) NULL,
    won_at DATETIME(3) NULL,
    lost_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_opp_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE RESTRICT,
    CONSTRAINT fk_opp_stage FOREIGN KEY (stage_id) REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
    INDEX idx_opp_stage_id (stage_id),
    INDEX idx_opp_owner_id (owner_id),
    INDEX idx_opp_status (status),
    INDEX idx_opp_expected_close (expected_close_date),
    INDEX idx_opp_company (company_id),
    INDEX idx_opp_customer (customer_id),
    INDEX idx_opp_campaign (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Circular reference resolve for leads conversion
ALTER TABLE leads ADD CONSTRAINT fk_lead_opp FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;
ALTER TABLE leads ADD CONSTRAINT fk_lead_customer FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL;

CREATE TABLE opportunity_stage_histories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT UNSIGNED NOT NULL,
    from_stage_id BIGINT UNSIGNED NULL,
    to_stage_id BIGINT UNSIGNED NOT NULL,
    changed_by BIGINT UNSIGNED NULL,
    changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    duration_in_seconds BIGINT UNSIGNED NULL COMMENT 'Time spent in previous stage',
    CONSTRAINT fk_osh_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT fk_osh_from_stage FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    CONSTRAINT fk_osh_to_stage FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
    CONSTRAINT fk_osh_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_osh_opp_changed (opportunity_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. PRODUCTS & OPPORTUNITY PRODUCTS
-- -----------------------------------------------------------------------------
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(30) NOT NULL DEFAULT 'PRODUCT' COMMENT 'PRODUCT, SERVICE',
    description TEXT NULL,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    INDEX idx_products_code (code),
    INDEX idx_products_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE opportunity_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_op_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT fk_op_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_op_opp_id (opportunity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. QUOTES & QUOTE ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE quotes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT UNSIGNED NOT NULL,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1,
    company_id BIGINT UNSIGNED NULL,
    contact_id BIGINT UNSIGNED NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED',
    valid_until DATE NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_quote_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT fk_quote_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    CONSTRAINT fk_quote_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_quote_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_quotes_opp (opportunity_id),
    INDEX idx_quotes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quote_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    quote_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    item_description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_qi_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_qi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_qi_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. ACTIVITIES & TASKS
-- -----------------------------------------------------------------------------
CREATE TABLE activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL COMMENT 'CALL, EMAIL, MEETING, NOTE, DEMO, SMS, OTHER',
    subject VARCHAR(200) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' COMMENT 'SCHEDULED, COMPLETED, CANCELLED',
    owner_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    due_at DATETIME(3) NULL,
    completed_at DATETIME(3) NULL,
    related_type VARCHAR(30) NOT NULL COMMENT 'LEAD, COMPANY, CONTACT, CUSTOMER, OPPORTUNITY',
    related_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_act_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_act_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_act_related (related_type, related_id),
    INDEX idx_act_owner (owner_id),
    INDEX idx_act_created (created_at),
    INDEX idx_act_due (due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' COMMENT 'LOW, MEDIUM, HIGH, URGENT',
    status VARCHAR(30) NOT NULL DEFAULT 'TODO' COMMENT 'TODO, IN_PROGRESS, COMPLETED, CANCELLED',
    assigned_to BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    due_at DATETIME(3) NOT NULL,
    completed_at DATETIME(3) NULL,
    related_type VARCHAR(30) NOT NULL COMMENT 'LEAD, COMPANY, CONTACT, CUSTOMER, OPPORTUNITY',
    related_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_task_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tasks_assigned_status_due (assigned_to, status, due_at),
    INDEX idx_tasks_related (related_type, related_id),
    INDEX idx_tasks_due_status (due_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. NOTIFICATIONS & AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id BIGINT UNSIGNED NULL,
    read_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, read_at),
    INDEX idx_notif_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_actor (actor_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. EVENT OUTBOX (TRANSACTIONAL OUTBOX PATTERN)
-- -----------------------------------------------------------------------------
CREATE TABLE outbox_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    payload JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, PROCESSING, PROCESSED, FAILED',
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    processed_at DATETIME(3) NULL,
    INDEX idx_outbox_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. AUTOMATION ENGINE TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE automations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    trigger_type VARCHAR(50) NOT NULL COMMENT 'EVENT_BASED, TIME_BASED',
    priority INT NOT NULL DEFAULT 10,
    created_by BIGINT UNSIGNED NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,
    CONSTRAINT fk_auto_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_auto_active_trigger (is_active, trigger_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE automation_triggers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    automation_id BIGINT UNSIGNED NOT NULL,
    trigger_event VARCHAR(50) NOT NULL COMMENT 'RECORD_CREATED, RECORD_UPDATED, STATUS_CHANGED, STAGE_CHANGED, ACTIVITY_CREATED, TASK_CREATED, TASK_OVERDUE, TIME_DELAY, SCHEDULE, NO_ACTIVITY_FOR, DUE_DATE_APPROACHING',
    entity_type VARCHAR(50) NOT NULL COMMENT 'LEAD, OPPORTUNITY, TASK, ACTIVITY, CUSTOMER',
    config JSON NULL COMMENT 'Specific trigger payload filters e.g. {"to_status": "QUALIFIED"} or {"days_inactive": 7}',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_at_automation FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
    INDEX idx_at_event_entity (trigger_event, entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE automation_conditions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    automation_id BIGINT UNSIGNED NOT NULL,
    parent_id BIGINT UNSIGNED NULL COMMENT 'For nested condition groups (AND/OR tree)',
    logic_operator VARCHAR(10) NOT NULL DEFAULT 'AND' COMMENT 'AND, OR',
    field VARCHAR(100) NULL COMMENT 'e.g. lead.status, opportunity.amount',
    operator VARCHAR(20) NULL COMMENT '=, !=, >, >=, <, <=, IN, NOT_IN, CONTAINS, IS_NULL, IS_NOT_NULL',
    value JSON NULL COMMENT 'Scalar value, array of values, or object',
    order_no INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ac_automation FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
    CONSTRAINT fk_ac_parent FOREIGN KEY (parent_id) REFERENCES automation_conditions(id) ON DELETE CASCADE,
    INDEX idx_ac_automation (automation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE automation_actions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    automation_id BIGINT UNSIGNED NOT NULL,
    action_type VARCHAR(50) NOT NULL COMMENT 'CREATE_TASK, CREATE_ACTIVITY, ASSIGN_OWNER, CHANGE_STATUS, CHANGE_STAGE, SEND_NOTIFICATION, SEND_EMAIL, CREATE_OPPORTUNITY, CREATE_CUSTOMER, CALL_WEBHOOK',
    config JSON NOT NULL COMMENT 'Action payload config template',
    step_order INT NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_aa_automation FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
    INDEX idx_aa_automation_step (automation_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE automation_executions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    automation_id BIGINT UNSIGNED NOT NULL,
    trigger_id BIGINT UNSIGNED NULL,
    event_id VARCHAR(64) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, RUNNING, SUCCESS, FAILED, SKIPPED',
    idempotency_key VARCHAR(191) NOT NULL UNIQUE,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_message TEXT NULL,
    started_at DATETIME(3) NULL,
    completed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ae_automation FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
    CONSTRAINT fk_ae_trigger FOREIGN KEY (trigger_id) REFERENCES automation_triggers(id) ON DELETE SET NULL,
    INDEX idx_ae_status (status),
    INDEX idx_ae_entity (entity_type, entity_id),
    INDEX idx_ae_event (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE automation_execution_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    execution_id BIGINT UNSIGNED NOT NULL,
    step_no INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL COMMENT 'SUCCESS, FAILED, SKIPPED',
    input_payload JSON NULL,
    output_payload JSON NULL,
    error_message TEXT NULL,
    executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_ael_execution FOREIGN KEY (execution_id) REFERENCES automation_executions(id) ON DELETE CASCADE,
    INDEX idx_ael_execution (execution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
