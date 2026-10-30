-- ============================================================================
-- COLLEGE PLACEMENT & RECRUITMENT PORTAL - FULL DATABASE SCHEMA
-- ============================================================================
-- Instructions for Fresh Setup:
-- 1. Log in to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Open the "SQL Editor"
-- 3. Paste the entire contents of this file and click "Run"
-- ============================================================================

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores accounts for students, recruiters (companies), and placement officer (admin).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'recruiter', 'admin')),
    is_approved BOOLEAN DEFAULT true NOT NULL, -- Recruiters require admin approval (false upon registration)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

-- ----------------------------------------------------------------------------
-- 2. STUDENT PROFILES TABLE
-- Contains college academic credentials, verification status, and resume.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roll_number TEXT UNIQUE,
    course TEXT,                      -- e.g., 'B.Tech', 'MCA', 'B.Sc'
    department TEXT,                  -- e.g., 'Computer Science', 'Mechanical'
    current_year INTEGER,             -- e.g., 3 or 4
    graduation_year INTEGER,          -- e.g., 2026
    cgpa NUMERIC(3,2),                -- e.g., 8.75
    backlogs INTEGER DEFAULT 0,       -- Active backlogs
    is_verified BOOLEAN DEFAULT false,-- Placement officer verified
    phone TEXT,
    skills TEXT,
    resume_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_roll_number ON student_profiles(roll_number);
CREATE INDEX IF NOT EXISTS idx_student_profiles_is_verified ON student_profiles(is_verified);

-- ----------------------------------------------------------------------------
-- 3. JOBS TABLE
-- Stores campus drives / job postings posted by approved recruiters.
-- Includes placement eligibility criteria (min_cgpa, max_backlogs, allowed_departments).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    salary TEXT,
    job_type TEXT NOT NULL,           -- e.g. 'Full-time', 'Internship'
    min_cgpa NUMERIC(3,2) DEFAULT 0,  -- Minimum CGPA required
    max_backlogs INTEGER DEFAULT 0,   -- Maximum active backlogs permitted
    allowed_departments TEXT,         -- Comma-separated: 'CSE, IT, ECE' (empty = all)
    deadline DATE NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_min_cgpa ON jobs(min_cgpa);

-- ----------------------------------------------------------------------------
-- 4. APPLICATIONS TABLE
-- Student applications with status tracking.
-- Unique constraint enforces one application per job per student.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'applied' NOT NULL CHECK (status IN ('applied', 'shortlisted', 'rejected', 'selected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_job_student UNIQUE (job_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ----------------------------------------------------------------------------
-- 5. SEED INITIAL PLACEMENT OFFICER (ADMIN)
-- Email: admin@portal.com
-- Password: Admin@123
-- ----------------------------------------------------------------------------
INSERT INTO users (name, email, password, role, is_approved)
VALUES (
    'Placement Officer',
    'admin@portal.com',
    '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE SET is_approved = true, role = 'admin';
