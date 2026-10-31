-- ============================================================================
-- COLLEGE PLACEMENT PORTAL - SCHEMA UPDATE SCRIPT 2 (update2.sql)
-- ============================================================================
-- Instructions:
-- 1. Log in to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Open the "SQL Editor"
-- 3. Run this script to add package_lpa, positions, and selection_process to the jobs table.
-- Note: 'last_date_to_apply' uses the existing 'deadline' column in the jobs table.
-- ============================================================================

-- 1. Add new job posting columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS package_lpa NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS positions INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS selection_process TEXT;

-- 2. Create index on package_lpa for fast filtering and range queries
CREATE INDEX IF NOT EXISTS idx_jobs_package_lpa ON jobs(package_lpa);

