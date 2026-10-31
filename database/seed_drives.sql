-- ============================================================================
-- APEX PLACEMENT PORTAL - EXAMPLE CAMPUS DRIVES SEED DATA
-- ============================================================================
-- Execute this SQL in your Supabase SQL Editor to populate realistic campus
-- placement drives across premier tech, finance, and consulting companies.
-- ============================================================================

-- 1. Insert Approved Recruiter Accounts (Password: Admin@123 for all demo accounts)
-- Bcrypt Hash for "Admin@123": $2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6

INSERT INTO users (id, name, email, password, role, is_approved, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000002', 'Microsoft India', 'hr@microsoft.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now()),
    ('00000000-0000-0000-0000-000000000003', 'Google LLC', 'hr@google.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now()),
    ('00000000-0000-0000-0000-000000000004', 'Amazon Development Centre', 'recruiter@amazon.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now()),
    ('00000000-0000-0000-0000-000000000005', 'Goldman Sachs', 'campus@gs.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now()),
    ('00000000-0000-0000-0000-000000000006', 'Cisco Systems', 'jobs@cisco.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now()),
    ('00000000-0000-0000-0000-000000000007', 'Tata Consultancy Services', 'campus@tcs.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now()),
    ('00000000-0000-0000-0000-000000000008', 'Deloitte Consulting', 'recruitment@deloitte.com', '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6', 'recruiter', true, now())
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Comprehensive Example Campus Recruitment Drives
INSERT INTO jobs (
    id,
    recruiter_id,
    title,
    company,
    description,
    location,
    salary,
    package_lpa,
    positions,
    selection_process,
    job_type,
    min_cgpa,
    max_backlogs,
    allowed_departments,
    deadline,
    is_active,
    created_at
)
VALUES
    (
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000002',
        'Graduate Software Engineer (Drive 2026)',
        'Microsoft India',
        'Join Microsoft core engineering groups building scalable Azure cloud infrastructure, high-throughput distributed services, developer platforms, and AI-powered copilot experiences.',
        'Bangalore / Hybrid',
        '18.50 LPA',
        18.50,
        8,
        'Online Aptitude & Coding Assessment > Technical Interview 1 > Technical Interview 2 > HR Discussion',
        'Full-time',
        7.50,
        0,
        'Computer Science & Engineering, Information Technology',
        '2026-12-31',
        true,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000003',
        'Software Development Engineer - Cloud & Systems',
        'Google LLC',
        'Building next-generation distributed storage, global search networks, and Google Cloud Platform services. Opportunities in backend engineering, distributed algorithms, and kernel systems.',
        'Bangalore, India',
        '32.50 LPA',
        32.50,
        10,
        'Online Coding Assessment > Data Structures & Algorithms Round 1 > System Architecture Round > Googliness & Leadership Discussion',
        'Full-time',
        8.50,
        0,
        'Computer Science & Engineering, Information Technology',
        '2026-12-15',
        true,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000004',
        'SDE-1 Graduate Campus Drive',
        'Amazon Development Centre',
        'Hiring fresh graduates for AWS Cloud Infrastructure, Prime Video, and Alexa Machine Learning. Developing resilient microservices, high-traffic APIs, and event-driven architectures.',
        'Hyderabad / Bangalore',
        '26.00 LPA',
        26.00,
        15,
        'Online Assessment (Aptitude + 2 Coding Problems) > Technical Interview 1 > Technical Interview 2 > Bar Raiser Cultural Evaluation',
        'Full-time',
        8.00,
        0,
        'Computer Science & Engineering, Information Technology, Electronics & Communication',
        '2026-12-20',
        true,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000013',
        '00000000-0000-0000-0000-000000000005',
        'Analyst - Engineering & Quantitative Analytics',
        'Goldman Sachs',
        'Develop real-time algorithmic trade execution engines, risk analytics frameworks, and high-frequency financial platforms using Java, C++, and Python.',
        'Bangalore, India',
        '22.00 LPA',
        22.00,
        6,
        'HackerRank Quant & Coding Test > Technical Round 1 > Technical Round 2 > Executive Director Fitment Discussion',
        'Full-time',
        7.80,
        0,
        'Computer Science & Engineering, Information Technology, Artificial Intelligence & Data Science, Electronics & Communication',
        '2026-11-30',
        true,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000014',
        '00000000-0000-0000-0000-000000000006',
        'Network & Cybersecurity Software Engineer',
        'Cisco Systems',
        'Architecting enterprise cybersecurity solutions, SD-WAN controllers, cloud network telemetry, and intrusion prevention software.',
        'Bangalore / Chennai',
        '16.50 LPA',
        16.50,
        12,
        'MCQ Technical Assessment > Live Coding Round > Tech Panel Discussion > Managerial Interview',
        'Full-time',
        7.00,
        1,
        'Computer Science & Engineering, Information Technology, Electronics & Communication, Electrical & Electronics',
        '2026-12-25',
        true,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000015',
        '00000000-0000-0000-0000-000000000008',
        'Technology Consultant - Cloud Transformation',
        'Deloitte Consulting',
        'Advising Fortune 500 enterprises on enterprise cloud migration, modern DevOps pipelines, data lake design, and digital business architectures.',
        'Hyderabad / Gurgaon',
        '11.00 LPA',
        11.00,
        20,
        'Cognitive & Technical Assessment > Case Study Group Discussion > Partner Evaluation Round',
        'Full-time',
        6.80,
        0,
        'Computer Science & Engineering, Information Technology, Master of Computer Applications, Electronics & Communication',
        '2026-12-28',
        true,
        now()
    ),
    (
        '00000000-0000-0000-0000-000000000016',
        '00000000-0000-0000-0000-000000000007',
        'Digital Systems Engineer (Cadre 2026)',
        'Tata Consultancy Services',
        'Engineering roles across AI/ML solutions, Full Stack Development (React/Node.js/Spring Boot), Big Data analytics, and IoT platforms for global banking and automotive clients.',
        'Pune / Mumbai / Delhi NCR',
        '7.50 LPA',
        7.50,
        40,
        'TCS National Qualifier Test (NQT) > Technical Assessment > HR Discussion',
        'Full-time',
        6.50,
        1,
        'All Branches',
        '2027-01-15',
        true,
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    company = EXCLUDED.company,
    description = EXCLUDED.description,
    package_lpa = EXCLUDED.package_lpa,
    positions = EXCLUDED.positions,
    selection_process = EXCLUDED.selection_process,
    min_cgpa = EXCLUDED.min_cgpa,
    max_backlogs = EXCLUDED.max_backlogs,
    allowed_departments = EXCLUDED.allowed_departments,
    deadline = EXCLUDED.deadline;

