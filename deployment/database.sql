-- MySQL schema for Hostinger. Run once in phpMyAdmin (or via api/install.php).

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'admin' | 'user'
  active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(50) NOT NULL DEFAULT 'Other',
  date DATE NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  profit_margin DECIMAL(10,2) NOT NULL DEFAULT 0,
  overhead_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  overhead_percent DECIMAL(10,2) NOT NULL DEFAULT 0,
  sales_tax_percent DECIMAL(10,2) NOT NULL DEFAULT 0,
  contingency_percent DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit_mode VARCHAR(10) NOT NULL DEFAULT 'margin',
  rounding_step INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  logo_path VARCHAR(255) NULL,
  materials_json LONGTEXT NULL,
  labor_json LONGTEXT NULL,
  other_json LONGTEXT NULL,
  total_materials DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_labor DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_other DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_overhead DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_sales_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_contingency DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by INT NULL,
  settings_json LONGTEXT NULL,
  measurement_json LONGTEXT NULL,
  yearly_breakdown_json LONGTEXT NULL,
  ghl_contact_id VARCHAR(64) NULL,
  ghl_opportunity_id VARCHAR(64) NULL,
  ghl_estimate_id VARCHAR(64) NULL,
  ghl_last_synced_at TIMESTAMP NULL,
  ghl_last_sync_error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobs_created_by (created_by)
);

-- If upgrading an existing install, add the new columns (safe to run once):
-- ALTER TABLE jobs
--   ADD COLUMN start_date DATE NULL,
--   ADD COLUMN end_date DATE NULL,
--   ADD COLUMN created_by INT NULL,
--   ADD COLUMN settings_json LONGTEXT NULL,
--   ADD COLUMN measurement_json LONGTEXT NULL,
--   ADD COLUMN yearly_breakdown_json LONGTEXT NULL,
--   ADD COLUMN grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
--   ADD COLUMN ghl_contact_id VARCHAR(64) NULL,
--   ADD COLUMN ghl_opportunity_id VARCHAR(64) NULL,
--   ADD COLUMN ghl_estimate_id VARCHAR(64) NULL,
--   ADD COLUMN ghl_last_synced_at TIMESTAMP NULL,
--   ADD COLUMN ghl_last_sync_error TEXT NULL,
--   ADD INDEX idx_jobs_created_by (created_by);

-- To create your admin login, temporarily create api/setup_config.php
-- from api/setup_config_example.php (or set UGX_SETUP_TOKEN), open
-- api/seed_admin.php once, then delete seed_admin.php and setup_config.php
-- if they do not self-delete. After that, manage users in admin.html.
