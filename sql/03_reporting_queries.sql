-- =============================================================================
-- CRM PRODUCTION REPORTING QUERIES (OPTIMIZED MYSQL 8.X SQL)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- REPORT 1: PIPELINE SUMMARY BY STAGE
-- Displays: Stage Name, Number of Opportunities, Total Amount, Weighted Amount
-- -----------------------------------------------------------------------------
SELECT 
    ps.id AS stage_id,
    ps.name AS stage_name,
    ps.order_no,
    ps.probability AS stage_probability,
    COUNT(o.id) AS total_opportunities,
    COALESCE(SUM(o.amount), 0.00) AS total_amount,
    COALESCE(SUM(o.amount * (o.probability / 100.0)), 0.00) AS weighted_amount
FROM pipeline_stages ps
LEFT JOIN opportunities o 
    ON ps.id = o.stage_id 
   AND o.deleted_at IS NULL
WHERE ps.pipeline_id = 1 AND ps.is_active = 1
GROUP BY ps.id, ps.name, ps.order_no, ps.probability
ORDER BY ps.order_no ASC;

-- -----------------------------------------------------------------------------
-- REPORT 2: SALES FUNNEL & CONVERSION RATES
-- Calculates: Total Leads, Qualified Leads, Created Opportunities, Won Deals, and Stage Conversion Rates
-- -----------------------------------------------------------------------------
WITH lead_stats AS (
    SELECT 
        COUNT(*) AS total_leads,
        COUNT(CASE WHEN status IN ('QUALIFIED', 'CONVERTED') THEN 1 END) AS qualified_leads
    FROM leads
    WHERE deleted_at IS NULL
),
opp_stats AS (
    SELECT 
        COUNT(*) AS total_opportunities,
        COUNT(CASE WHEN status = 'WON' THEN 1 END) AS won_opportunities
    FROM opportunities
    WHERE deleted_at IS NULL
)
SELECT 
    ls.total_leads,
    ls.qualified_leads,
    os.total_opportunities,
    os.won_opportunities,
    ROUND(IFNULL((ls.qualified_leads / NULLIF(ls.total_leads, 0)) * 100, 0), 2) AS lead_to_qualification_rate_pct,
    ROUND(IFNULL((os.total_opportunities / NULLIF(ls.qualified_leads, 0)) * 100, 0), 2) AS qualification_to_opp_rate_pct,
    ROUND(IFNULL((os.won_opportunities / NULLIF(os.total_opportunities, 0)) * 100, 0), 2) AS opp_win_rate_pct,
    ROUND(IFNULL((os.won_opportunities / NULLIF(ls.total_leads, 0)) * 100, 0), 2) AS overall_conversion_rate_pct
FROM lead_stats ls
CROSS JOIN opp_stats os;

-- -----------------------------------------------------------------------------
-- REPORT 3: STALE OPPORTUNITIES (NO ACTIVITY FOR X DAYS)
-- Identifies OPEN opportunities that have had no logged activity in the last 7 days (or X days)
-- -----------------------------------------------------------------------------
SET @inactivity_days = 7;

SELECT 
    o.id AS opportunity_id,
    o.name AS opportunity_name,
    o.amount,
    ps.name AS stage_name,
    CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
    u.email AS owner_email,
    MAX(a.created_at) AS last_activity_at,
    DATEDIFF(NOW(), COALESCE(MAX(a.created_at), o.created_at)) AS days_inactive
FROM opportunities o
JOIN pipeline_stages ps ON o.stage_id = ps.id
LEFT JOIN users u ON o.owner_id = u.id
LEFT JOIN activities a 
    ON a.related_type = 'OPPORTUNITY' 
   AND a.related_id = o.id
WHERE o.status = 'OPEN' 
  AND o.deleted_at IS NULL
GROUP BY o.id, o.name, o.amount, ps.name, u.first_name, u.last_name, u.email, o.created_at
HAVING days_inactive >= @inactivity_days
ORDER BY days_inactive DESC;

-- -----------------------------------------------------------------------------
-- REPORT 4: OVERDUE TASKS
-- Identifies tasks past their due_at date that are still pending completion
-- -----------------------------------------------------------------------------
SELECT 
    t.id AS task_id,
    t.title,
    t.priority,
    t.status,
    t.due_at,
    TIMESTAMPDIFF(HOUR, t.due_at, NOW()) AS hours_overdue,
    CONCAT(u.first_name, ' ', u.last_name) AS assignee_name,
    u.email AS assignee_email,
    t.related_type,
    t.related_id
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.id
WHERE t.status IN ('TODO', 'IN_PROGRESS')
  AND t.due_at < NOW()
ORDER BY t.due_at ASC;

-- -----------------------------------------------------------------------------
-- REPORT 5: MONTHLY SALES FORECAST BY OWNER & PIPELINE
-- Calculates weighted revenue (SUM(amount * probability)) grouped by Sales rep, Pipeline, and Close Month
-- -----------------------------------------------------------------------------
SELECT 
    DATE_FORMAT(o.expected_close_date, '%Y-%m') AS forecast_month,
    p.name AS pipeline_name,
    CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
    COUNT(o.id) AS open_deals_count,
    SUM(o.amount) AS unweighted_pipeline_value,
    SUM(o.amount * (o.probability / 100.0)) AS weighted_forecast_value
FROM opportunities o
JOIN pipelines p ON o.pipeline_id = p.id
LEFT JOIN users u ON o.owner_id = u.id
WHERE o.status = 'OPEN'
  AND o.expected_close_date IS NOT NULL
  AND o.deleted_at IS NULL
GROUP BY DATE_FORMAT(o.expected_close_date, '%Y-%m'), p.id, p.name, u.id, u.first_name, u.last_name
ORDER BY forecast_month ASC, weighted_forecast_value DESC;

-- -----------------------------------------------------------------------------
-- REPORT 6: AUTOMATION EXECUTION STATISTICS
-- Aggregates execution metrics: counts of success, failed, skipped, and average retries
-- -----------------------------------------------------------------------------
SELECT 
    a.id AS automation_id,
    a.name AS automation_name,
    COUNT(ae.id) AS total_executions,
    SUM(CASE WHEN ae.status = 'SUCCESS' THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN ae.status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count,
    SUM(CASE WHEN ae.status = 'SKIPPED' THEN 1 ELSE 0 END) AS skipped_count,
    SUM(CASE WHEN ae.status = 'RUNNING' THEN 1 ELSE 0 END) AS running_count,
    SUM(CASE WHEN ae.retry_count > 0 THEN 1 ELSE 0 END) AS retried_executions,
    ROUND(AVG(ae.retry_count), 2) AS avg_retry_count,
    MAX(ae.completed_at) AS last_executed_at
FROM automations a
LEFT JOIN automation_executions ae ON a.id = ae.automation_id
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name
ORDER BY total_executions DESC;
