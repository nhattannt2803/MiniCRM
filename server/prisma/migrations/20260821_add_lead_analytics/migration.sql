-- Migration Patch: Add Lead Analytics Fields & Pre-Aggregate Daily Summary Table
-- Project: MiniCRM SaaS Multi-Tenant

-- 1. Add analytics fields (score, cost, utm) to `leads` table
ALTER TABLE `leads`
  ADD COLUMN `score` INT NULL DEFAULT 50 AFTER `fb_page_name`,
  ADD COLUMN `cost` DECIMAL(12, 4) NULL AFTER `score`,
  ADD COLUMN `utm` JSON NULL AFTER `cost`;

-- 2. Add Composite Indexes for high-performance tenant time-range queries
ALTER TABLE `leads`
  ADD INDEX `idx_leads_biz_fb_page_created` (`biz_id`, `fb_page_id`, `created_at`),
  ADD INDEX `idx_leads_biz_status_created` (`biz_id`, `status`, `created_at`);

-- 3. Create Pre-aggregate Summary Table `leads_daily_summary` for fast Dashboard queries
CREATE TABLE IF NOT EXISTS `leads_daily_summary` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `biz_id` BIGINT UNSIGNED NOT NULL,
  `day` DATE NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  `fb_page_id` VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  `fb_page_name` VARCHAR(200) NULL,
  `ad_id` VARCHAR(191) NOT NULL DEFAULT 'UNKNOWN',
  `ad_name` VARCHAR(255) NULL,
  `leads_count` INT NOT NULL DEFAULT 0,
  `converted_count` INT NOT NULL DEFAULT 0,
  `cost_sum` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `clicks_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `uk_lds_biz_day_source_page_ad` UNIQUE (`biz_id`, `day`, `source`, `fb_page_id`, `ad_id`),
  CONSTRAINT `fk_lds_business` FOREIGN KEY (`biz_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create Indexes on `leads_daily_summary`
CREATE INDEX `idx_lds_biz_day` ON `leads_daily_summary` (`biz_id`, `day`);
CREATE INDEX `idx_lds_biz_ad_day` ON `leads_daily_summary` (`biz_id`, `ad_id`, `day`);
CREATE INDEX `idx_lds_biz_page_day` ON `leads_daily_summary` (`biz_id`, `fb_page_id`, `day`);
