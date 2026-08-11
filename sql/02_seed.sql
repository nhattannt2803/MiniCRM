-- =============================================================================
-- CRM PRODUCTION SEED DATA FOR MYSQL 8.X
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED ROLES
-- -----------------------------------------------------------------------------
INSERT INTO roles (id, name, code, description) VALUES
(1, 'Administrator', 'ADMIN', 'Full system control and administrative permissions'),
(2, 'Sales Executive', 'SALES', 'Handles leads, opportunities, tasks, quotes, and activities'),
(3, 'Sales Manager', 'MANAGER', 'Oversees pipeline performance, sales forecasts, and automation rules');

-- -----------------------------------------------------------------------------
-- 2. SEED USERS (Password hashes are placeholder bcrypt hashes)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active) VALUES
(1, 'admin@minicrm.io', '$2b$12$eImiTXuWVxfM37uY4JANjO5E/8uJd7kO3H1Lp7O7Z2WzYg2H9Kk1u', 'System', 'Admin', '0901000001', 1),
(2, 'sales1@minicrm.io', '$2b$12$eImiTXuWVxfM37uY4JANjO5E/8uJd7kO3H1Lp7O7Z2WzYg2H9Kk1u', 'Alex', 'Nguyen', '0901000002', 1),
(3, 'sales2@minicrm.io', '$2b$12$eImiTXuWVxfM37uY4JANjO5E/8uJd7kO3H1Lp7O7Z2WzYg2H9Kk1u', 'Tran', 'Bao', '0901000003', 1),
(4, 'manager@minicrm.io', '$2b$12$eImiTXuWVxfM37uY4JANjO5E/8uJd7kO3H1Lp7O7Z2WzYg2H9Kk1u', 'David', 'Pham', '0901000004', 1);

INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1),
(2, 2),
(3, 2),
(4, 3);

-- -----------------------------------------------------------------------------
-- 3. SEED PIPELINE & PIPELINE STAGES
-- -----------------------------------------------------------------------------
INSERT INTO pipelines (id, name, is_default, is_active) VALUES
(1, 'Default Sales Pipeline', 1, 1);

INSERT INTO pipeline_stages (id, pipeline_id, name, code, order_no, probability, is_won, is_lost, is_active) VALUES
(1, 1, 'New', 'NEW', 1, 10.00, 0, 0, 1),
(2, 1, 'Qualified', 'QUALIFIED', 2, 25.00, 0, 0, 1),
(3, 1, 'Demo', 'DEMO', 3, 40.00, 0, 0, 1),
(4, 1, 'Proposal', 'PROPOSAL', 4, 60.00, 0, 0, 1),
(5, 1, 'Negotiation', 'NEGOTIATION', 5, 80.00, 0, 0, 1),
(6, 1, 'Won', 'WON', 6, 100.00, 1, 0, 1),
(7, 1, 'Lost', 'LOST', 7, 0.00, 0, 1, 1);

-- -----------------------------------------------------------------------------
-- 4. SEED PRODUCTS / SERVICES
-- -----------------------------------------------------------------------------
INSERT INTO products (id, name, code, type, description, unit_price, currency, is_active) VALUES
(1, 'CRM Basic', 'PROD-CRM-BSC', 'PRODUCT', 'Core CRM package for small teams up to 5 seats', 15000000.00, 'VND', 1),
(2, 'CRM Pro', 'PROD-CRM-PRO', 'PRODUCT', 'Enterprise CRM package with Workflow Engine and Unlimited seats', 50000000.00, 'VND', 1),
(3, 'HIS Module', 'PROD-HIS-MOD', 'PRODUCT', 'Hospital Information System Integration Module', 120000000.00, 'VND', 1),
(4, 'Implementation Service', 'SRV-IMPL', 'SERVICE', 'On-site installation, data migration, and team training (per day)', 10000000.00, 'VND', 1);

-- -----------------------------------------------------------------------------
-- 5. SEED CAMPAIGNS
-- -----------------------------------------------------------------------------
INSERT INTO campaigns (id, name, code, type, status, budget, actual_cost, expected_revenue, start_date, end_date, owner_id) VALUES
(1, 'Q3 Digital Growth Campaign', 'CAMP-2026-Q3-DIG', 'FB_ADS', 'ACTIVE', 50000000.00, 35000000.00, 300000000.00, '2026-07-01', '2026-09-30', 4),
(2, 'Tech Expo Vietnam 2026', 'CAMP-2026-EXPO', 'EVENT', 'COMPLETED', 80000000.00, 78000000.00, 500000000.00, '2026-06-10', '2026-06-12', 4);

-- -----------------------------------------------------------------------------
-- 6. SEED AUTOMATIONS (REQUIRED SAMPLE AUTOMATIONS)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- AUTOMATION 1: WHEN Lead Created THEN Assign Lead to Sales & Create Task ("Contact new lead", due +2h)
-- -----------------------------------------------------------------------------
INSERT INTO automations (id, name, description, is_active, trigger_type, priority, created_by) VALUES
(1, 'Auto Assign & Task on New Lead', 'When a new lead is created, assign to sales rep and create immediate follow-up task', 1, 'EVENT_BASED', 10, 1);

INSERT INTO automation_triggers (id, automation_id, trigger_event, entity_type, config) VALUES
(1, 1, 'RECORD_CREATED', 'LEAD', NULL);

INSERT INTO automation_actions (id, automation_id, action_type, config, step_order) VALUES
(1, 1, 'ASSIGN_OWNER', JSON_OBJECT('strategy', 'ROUND_ROBIN', 'role', 'SALES'), 1),
(2, 1, 'CREATE_TASK', JSON_OBJECT('title', 'Contact new lead', 'due_in_hours', 2, 'priority', 'HIGH', 'description', 'Call or email newly assigned lead to introduce services'), 2);

-- -----------------------------------------------------------------------------
-- AUTOMATION 2: WHEN Lead status becomes QUALIFIED THEN Create Opportunity
-- -----------------------------------------------------------------------------
INSERT INTO automations (id, name, description, is_active, trigger_type, priority, created_by) VALUES
(2, 'Auto Create Opportunity on Qualified Lead', 'Automatically create a pipeline opportunity when a lead reaches QUALIFIED status', 1, 'EVENT_BASED', 10, 1);

INSERT INTO automation_triggers (id, automation_id, trigger_event, entity_type, config) VALUES
(2, 2, 'STATUS_CHANGED', 'LEAD', JSON_OBJECT('to_status', 'QUALIFIED'));

INSERT INTO automation_actions (id, automation_id, action_type, config, step_order) VALUES
(3, 2, 'CREATE_OPPORTUNITY', JSON_OBJECT('pipeline_id', 1, 'stage_code', 'NEW', 'probability', 10.00), 1);

-- -----------------------------------------------------------------------------
-- AUTOMATION 3: WHEN Opportunity stage becomes PROPOSAL THEN Create Task ("Send quotation")
-- -----------------------------------------------------------------------------
INSERT INTO automations (id, name, description, is_active, trigger_type, priority, created_by) VALUES
(3, 'Auto Task on Proposal Stage', 'When opportunity moves to PROPOSAL stage, create task to prepare and send quote', 1, 'EVENT_BASED', 10, 1);

INSERT INTO automation_triggers (id, automation_id, trigger_event, entity_type, config) VALUES
(3, 3, 'STAGE_CHANGED', 'OPPORTUNITY', JSON_OBJECT('to_stage_code', 'PROPOSAL'));

INSERT INTO automation_actions (id, automation_id, action_type, config, step_order) VALUES
(4, 3, 'CREATE_TASK', JSON_OBJECT('title', 'Send quotation', 'due_in_hours', 24, 'priority', 'HIGH', 'description', 'Generate formal quotation and email to client contact'), 1);

-- -----------------------------------------------------------------------------
-- AUTOMATION 4: WHEN Opportunity has no Activity for 7 days THEN Notify owner & Create follow-up Task
-- -----------------------------------------------------------------------------
INSERT INTO automations (id, name, description, is_active, trigger_type, priority, created_by) VALUES
(4, 'Stale Opportunity Follow-up Alert', 'Triggered when open opportunity has zero logged activity for 7 consecutive days', 1, 'TIME_BASED', 20, 1);

INSERT INTO automation_triggers (id, automation_id, trigger_event, entity_type, config) VALUES
(4, 4, 'NO_ACTIVITY_FOR', 'OPPORTUNITY', JSON_OBJECT('days', 7, 'opp_status', 'OPEN'));

INSERT INTO automation_actions (id, automation_id, action_type, config, step_order) VALUES
(5, 4, 'SEND_NOTIFICATION', JSON_OBJECT('title', 'Stale Opportunity Alert', 'template', 'Opportunity {{opportunity.name}} has had no activity for 7 days!'), 1),
(6, 4, 'CREATE_TASK', JSON_OBJECT('title', 'Re-engage stale opportunity', 'due_in_hours', 24, 'priority', 'URGENT', 'description', 'Reach out to check prospect status and update deal notes'), 2);

-- -----------------------------------------------------------------------------
-- AUTOMATION 5: WHEN Opportunity becomes WON THEN Create/activate Customer & Create onboarding Task
-- -----------------------------------------------------------------------------
INSERT INTO automations (id, name, description, is_active, trigger_type, priority, created_by) VALUES
(5, 'Auto Customer Activation & Onboarding on Deal Won', 'When opportunity is won, promote account to active Customer and schedule onboarding', 1, 'EVENT_BASED', 10, 1);

INSERT INTO automation_triggers (id, automation_id, trigger_event, entity_type, config) VALUES
(5, 5, 'STAGE_CHANGED', 'OPPORTUNITY', JSON_OBJECT('to_stage_code', 'WON'));

INSERT INTO automation_actions (id, automation_id, action_type, config, step_order) VALUES
(7, 5, 'CREATE_CUSTOMER', JSON_OBJECT('status', 'ACTIVE'), 1),
(8, 5, 'CREATE_TASK', JSON_OBJECT('title', 'Kick-off customer onboarding', 'due_in_hours', 48, 'priority', 'HIGH', 'description', 'Schedule initial setup session and issue invoice'), 2);

-- -----------------------------------------------------------------------------
-- AUTOMATION 6: WHEN Task becomes overdue THEN Send notification to assigned user
-- -----------------------------------------------------------------------------
INSERT INTO automations (id, name, description, is_active, trigger_type, priority, created_by) VALUES
(6, 'Overdue Task Alert Notification', 'Triggered when task passes due_at without completion', 1, 'TIME_BASED', 5, 1);

INSERT INTO automation_triggers (id, automation_id, trigger_event, entity_type, config) VALUES
(6, 6, 'TASK_OVERDUE', 'TASK', NULL);

INSERT INTO automation_actions (id, automation_id, action_type, config, step_order) VALUES
(9, 6, 'SEND_NOTIFICATION', JSON_OBJECT('title', 'Task Overdue Notice', 'template', 'Task "{{task.title}}" is past due date! Please resolve immediately.'), 1);


-- -----------------------------------------------------------------------------
-- 7. DEMO BUSINESS DATA (COMPANIES, CONTACTS, LEADS, OPPORTUNITIES)
-- -----------------------------------------------------------------------------
INSERT INTO companies (id, name, tax_code, email, phone, website, address, owner_id, status, is_customer) VALUES
(1, 'FPT Information System', '0100109106', 'contact@fpt.com.vn', '02473007300', 'https://fpt-is.com', 'Tower 10, Duy Tan, Cau Giay, Hanoi', 2, 'ACTIVE', 1),
(2, 'VNG Corporation', '0303517001', 'info@vng.com.vn', '02839623888', 'https://vng.com.vn', 'Z06 Street 13, Tan Thuan EPZ, Dist 7, HCMC', 3, 'PROSPECT', 0);

INSERT INTO contacts (id, company_id, first_name, last_name, email, phone, position, department, is_primary, owner_id, is_customer) VALUES
(1, 1, 'Minh', 'Nguyen', 'minh.nguyen@fpt.com.vn', '0912345678', 'CTO', 'Technology', 1, 2, 1),
(2, 2, 'Lan', 'Hoang', 'lan.hoang@vng.com.vn', '0987654321', 'Procurement Manager', 'Operations', 1, 3, 0);

INSERT INTO customers (id, customer_code, entity_type, company_id, contact_id, owner_id, status, lifetime_value) VALUES
(1, 'CUST-2026-0001', 'COMPANY', 1, 1, 2, 'ACTIVE', 170000000.00);

INSERT INTO leads (id, company_id, contact_id, campaign_id, owner_id, source, status, rating, first_name, last_name, email, phone, company_name, job_title, notes) VALUES
(1, NULL, NULL, 1, 2, 'FB_ADS', 'NEW', 'HOT', 'Bao', 'Vu', 'bao.vu@techcorp.vn', '0933112233', 'TechCorp Ltd', 'CEO', 'Interested in CRM Pro + HIS module integration'),
(2, 2, 2, 2, 3, 'EVENT', 'QUALIFIED', 'WARM', 'Lan', 'Hoang', 'lan.hoang@vng.com.vn', '0987654321', 'VNG Corporation', 'Procurement Manager', 'Met at Tech Expo, wants formal proposal');

INSERT INTO opportunities (id, company_id, contact_id, customer_id, lead_id, campaign_id, owner_id, pipeline_id, stage_id, name, amount, probability, expected_close_date, source, status) VALUES
(1, 1, 1, 1, NULL, 1, 2, 1, 6, 'FPT CRM Pro Licensing Deal', 170000000.00, 100.00, '2026-08-01', 'FB_ADS', 'WON'),
(2, 2, 2, NULL, 2, 2, 3, 1, 4, 'VNG Enterprise CRM & Implementation', 200000000.00, 60.00, '2026-09-15', 'EVENT', 'OPEN');

INSERT INTO opportunity_stage_histories (opportunity_id, from_stage_id, to_stage_id, changed_by, changed_at, duration_in_seconds) VALUES
(1, 1, 2, 2, '2026-07-05 09:00:00', 86400),
(1, 2, 4, 2, '2026-07-10 14:00:00', 432000),
(1, 4, 5, 2, '2026-07-20 10:00:00', 864000),
(1, 5, 6, 2, '2026-08-01 16:30:00', 1036800),
(2, 1, 2, 3, '2026-07-15 11:00:00', 172800),
(2, 2, 3, 3, '2026-07-22 09:30:00', 604800),
(2, 3, 4, 3, '2026-08-05 15:00:00', 1209600);

INSERT INTO opportunity_products (opportunity_id, product_id, quantity, unit_price, discount_amount, total_price) VALUES
(1, 2, 1, 50000000.00, 0.00, 50000000.00),
(1, 3, 1, 120000000.00, 0.00, 120000000.00),
(2, 2, 1, 50000000.00, 0.00, 50000000.00),
(2, 3, 1, 120000000.00, 0.00, 120000000.00),
(2, 4, 3, 10000000.00, 0.00, 30000000.00);

INSERT INTO activities (type, subject, description, status, owner_id, created_by, related_type, related_id, due_at, completed_at) VALUES
('CALL', 'Initial Discovery Call', 'Discussed cloud deployment vs on-premise requirements', 'COMPLETED', 2, 2, 'LEAD', 1, '2026-08-10 10:00:00', '2026-08-10 10:30:00'),
('MEETING', 'VNG Onsite Proposal Review', 'Presented technical architecture & SLA terms', 'COMPLETED', 3, 3, 'OPPORTUNITY', 2, '2026-08-06 14:00:00', '2026-08-06 15:30:00');

INSERT INTO tasks (title, description, priority, status, assigned_to, created_by, due_at, related_type, related_id) VALUES
('Contact new lead', 'Call or email newly assigned lead to introduce services', 'HIGH', 'TODO', 2, 1, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'LEAD', 1),
('Send quotation', 'Generate formal quotation and email to client contact', 'HIGH', 'TODO', 3, 1, DATE_ADD(NOW(), INTERVAL 24 HOUR), 'OPPORTUNITY', 2);
