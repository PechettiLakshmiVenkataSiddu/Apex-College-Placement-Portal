-- ============================================================================
-- COLLEGE PLACEMENT PORTAL - SCHEMA UPDATE SCRIPT (ALTER Statements)
-- ============================================================================
-- Instructions:
-- 1. Log in to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Open the "SQL Editor"
-- 3. Paste this script and click "Run" to update your existing tables without data loss.
-- ============================================================================

-- 1. USERS TABLE UPDATES
-- Add is_approved flag:
-- - Students and Admins are approved by default (true).
-- - Recruiters (Companies) must be approved by the Placement Officer (default false for recruiters).
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;

-- Ensure existing recruiters are set according to desired baseline (or kept as approved if existing)
UPDATE users 
SET is_approved = true 
WHERE role IN ('student', 'admin') AND is_approved IS NULL;

-- 2. STUDENT PROFILES TABLE UPDATES
-- Add college-specific academic details and placement verification status
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS roll_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS course TEXT,
ADD COLUMN IF NOT EXISTS current_year INTEGER,
ADD COLUMN IF NOT EXISTS backlogs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create index on roll_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_roll_number ON student_profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_student_profiles_is_verified ON student_profiles(is_verified);

-- 3. JOBS TABLE UPDATES
-- Add eligibility criteria columns for company job postings
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS min_cgpa NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_backlogs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS allowed_departments TEXT; -- comma-separated list, e.g. "Computer Science, Information Technology". Empty or NULL means open to all.

-- Create index for min_cgpa
CREATE INDEX IF NOT EXISTS idx_jobs_min_cgpa ON jobs(min_cgpa);
