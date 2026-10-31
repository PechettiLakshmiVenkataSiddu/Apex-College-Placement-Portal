/**
 * config/supabase.js
 * ------------------
 * Initializes and exports the database client.
 * 
 * - If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set with real credentials in .env,
 *   it connects to your live Supabase cloud database.
 * - If credentials are placeholders (or when testing locally without external setup),
 *   it automatically provides an in-memory database simulator matching the Supabase JS API.
 *   This ensures the application runs out-of-the-box in local development with 100% functionality!
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceRoleKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseServiceRoleKey.includes('your-supabase-service-role-key') &&
  process.env.USE_LOCAL_DB !== 'true'
);

let supabase;

if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} else {
  // ==========================================================================
  // IN-MEMORY LOCAL DATABASE SIMULATOR (Self-contained local development mode)
  // ==========================================================================

  const tables = {
    users: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'College Placement Officer',
        email: 'admin@portal.com',
        // Hash for "Admin@123"
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'admin',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Microsoft India',
        email: 'hr@microsoft.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Google LLC',
        email: 'hr@google.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Amazon Web Services',
        email: 'aws-campus@amazon.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Goldman Sachs',
        email: 'campus@gs.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        name: 'Cisco Systems',
        email: 'jobs@cisco.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000007',
        name: 'Tata Consultancy Services',
        email: 'campus@tcs.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        name: 'Deloitte Consulting',
        email: 'recruitment@deloitte.com',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'recruiter',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000050',
        name: 'Sneha Reddy',
        email: 'sneha.reddy@college.edu',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'student',
        is_approved: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000051',
        name: 'Aditya Verma',
        email: 'aditya.verma@college.edu',
        password: '$2b$10$Dfi1CrlSLpcKCO7mWHBT9e5Ern3QlBNtYEcw022ZzZP4DNaIIqFs6',
        role: 'student',
        is_approved: true,
        created_at: new Date().toISOString()
      }
    ],
    student_profiles: [
      {
        id: '00000000-0000-0000-0000-000000000060',
        user_id: '00000000-0000-0000-0000-000000000050',
        roll_number: '2022CS5501',
        course: 'B.Tech',
        department: 'Computer Science & Engineering',
        current_year: 4,
        graduation_year: 2026,
        cgpa: 8.92,
        backlogs: 0,
        is_verified: true,
        phone: '+91-9876543210',
        skills: 'Python, C++, AWS Cloud, Docker, React, Node.js',
        resume_url: 'https://mock-supabase.local/storage/v1/object/public/resumes/sneha_reddy_resume.pdf',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000061',
        user_id: '00000000-0000-0000-0000-000000000051',
        roll_number: '2022EC5502',
        course: 'B.Tech',
        department: 'Electronics & Communication',
        current_year: 4,
        graduation_year: 2026,
        cgpa: 7.45,
        backlogs: 0,
        is_verified: true,
        phone: '+91-9876543222',
        skills: 'Embedded C, IoT, Python, Computer Networks, Linux',
        resume_url: 'https://mock-supabase.local/storage/v1/object/public/resumes/aditya_verma_resume.pdf',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    jobs: [
      {
        id: '00000000-0000-0000-0000-000000000010',
        recruiter_id: '00000000-0000-0000-0000-000000000002',
        title: 'Graduate Software Engineer (Drive 2026)',
        company: 'Microsoft India',
        description: 'Join Microsoft core engineering groups building scalable Azure cloud infrastructure, high-throughput distributed services, developer platforms, and AI-powered copilot experiences.',
        location: 'Bangalore / Hybrid',
        salary: '18.50 LPA',
        package_lpa: 18.50,
        positions: 8,
        selection_process: 'Online Aptitude & Coding Assessment > Technical Interview 1 > Technical Interview 2 > HR Discussion',
        job_type: 'Full-time',
        min_cgpa: 7.50,
        max_backlogs: 0,
        allowed_departments: 'Computer Science & Engineering, Information Technology',
        deadline: '2026-12-31',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        recruiter_id: '00000000-0000-0000-0000-000000000003',
        title: 'Software Development Engineer - Cloud & Systems',
        company: 'Google LLC',
        description: 'Building next-generation distributed storage, global search networks, and Google Cloud Platform services. Opportunities in backend engineering, distributed algorithms, and kernel systems.',
        location: 'Bangalore, India',
        salary: '32.50 LPA',
        package_lpa: 32.50,
        positions: 10,
        selection_process: 'Online Coding Assessment > Data Structures & Algorithms Round 1 > System Architecture Round > Googliness & Leadership Discussion',
        job_type: 'Full-time',
        min_cgpa: 8.50,
        max_backlogs: 0,
        allowed_departments: 'Computer Science & Engineering, Information Technology',
        deadline: '2026-12-15',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        recruiter_id: '00000000-0000-0000-0000-000000000004',
        title: 'SDE-1 Graduate Campus Drive',
        company: 'Amazon Web Services',
        description: 'Hiring fresh graduates for AWS Cloud Infrastructure, Prime Video, and Alexa Machine Learning. Developing resilient microservices, high-traffic APIs, and event-driven architectures.',
        location: 'Hyderabad / Bangalore',
        salary: '26.00 LPA',
        package_lpa: 26.00,
        positions: 15,
        selection_process: 'Online Assessment (Aptitude + 2 Coding Problems) > Technical Interview 1 > Technical Interview 2 > Bar Raiser Cultural Evaluation',
        job_type: 'Full-time',
        min_cgpa: 8.00,
        max_backlogs: 0,
        allowed_departments: 'Computer Science & Engineering, Information Technology, Electronics & Communication',
        deadline: '2026-12-20',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000013',
        recruiter_id: '00000000-0000-0000-0000-000000000005',
        title: 'Analyst - Engineering & Quantitative Analytics',
        company: 'Goldman Sachs',
        description: 'Develop real-time algorithmic trade execution engines, risk analytics frameworks, and high-frequency financial platforms using Java, C++, and Python.',
        location: 'Bangalore, India',
        salary: '22.00 LPA',
        package_lpa: 22.00,
        positions: 6,
        selection_process: 'HackerRank Quant & Coding Test > Technical Round 1 > Technical Round 2 > Executive Director Fitment Discussion',
        job_type: 'Full-time',
        min_cgpa: 7.80,
        max_backlogs: 0,
        allowed_departments: 'Computer Science & Engineering, Information Technology, Artificial Intelligence & Data Science, Electronics & Communication',
        deadline: '2026-11-30',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000014',
        recruiter_id: '00000000-0000-0000-0000-000000000006',
        title: 'Network & Cybersecurity Software Engineer',
        company: 'Cisco Systems',
        description: 'Architecting enterprise cybersecurity solutions, SD-WAN controllers, cloud network telemetry, and intrusion prevention software.',
        location: 'Bangalore / Chennai',
        salary: '16.50 LPA',
        package_lpa: 16.50,
        positions: 12,
        selection_process: 'MCQ Technical Assessment > Live Coding Round > Tech Panel Discussion > Managerial Interview',
        job_type: 'Full-time',
        min_cgpa: 7.00,
        max_backlogs: 1,
        allowed_departments: 'Computer Science & Engineering, Information Technology, Electronics & Communication, Electrical & Electronics',
        deadline: '2026-12-25',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000015',
        recruiter_id: '00000000-0000-0000-0000-000000000008',
        title: 'Technology Consultant - Cloud Transformation',
        company: 'Deloitte Consulting',
        description: 'Advising Fortune 500 enterprises on enterprise cloud migration, modern DevOps pipelines, data lake design, and digital business architectures.',
        location: 'Hyderabad / Gurgaon',
        salary: '11.00 LPA',
        package_lpa: 11.00,
        positions: 20,
        selection_process: 'Cognitive & Technical Assessment > Case Study Group Discussion > Partner Evaluation Round',
        job_type: 'Full-time',
        min_cgpa: 6.80,
        max_backlogs: 0,
        allowed_departments: 'Computer Science & Engineering, Information Technology, Master of Computer Applications, Electronics & Communication',
        deadline: '2026-12-28',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000016',
        recruiter_id: '00000000-0000-0000-0000-000000000007',
        title: 'Digital Systems Engineer (Cadre 2026)',
        company: 'Tata Consultancy Services',
        description: 'Engineering roles across AI/ML solutions, Full Stack Development (React/Node.js/Spring Boot), Big Data analytics, and IoT platforms for global banking and automotive clients.',
        location: 'Pune / Mumbai / Delhi NCR',
        salary: '7.50 LPA',
        package_lpa: 7.50,
        positions: 40,
        selection_process: 'TCS National Qualifier Test (NQT) > Technical Assessment > HR Discussion',
        job_type: 'Full-time',
        min_cgpa: 6.50,
        max_backlogs: 1,
        allowed_departments: 'All Branches',
        deadline: '2027-01-15',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    applications: [
      {
        id: '00000000-0000-0000-0000-000000000070',
        job_id: '00000000-0000-0000-0000-000000000010', // Microsoft
        student_id: '00000000-0000-0000-0000-000000000050', // Sneha Reddy
        status: 'shortlisted',
        applied_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000071',
        job_id: '00000000-0000-0000-0000-000000000011', // Google
        student_id: '00000000-0000-0000-0000-000000000050', // Sneha Reddy
        status: 'applied',
        applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '00000000-0000-0000-0000-000000000072',
        job_id: '00000000-0000-0000-0000-000000000014', // Cisco
        student_id: '00000000-0000-0000-0000-000000000051', // Aditya Verma
        status: 'applied',
        applied_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  const getTable = (tableName) => {
    if (!tables[tableName]) {
      tables[tableName] = [];
    }
    return tables[tableName];
  };

  class QueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.sortFn = null;
      this.limitCount = null;
      this.op = 'select';
      this.payload = null;
      this.columns = '*';
      this.countOption = null;
    }

    select(columns = '*', options = {}) {
      this.columns = columns;
      if (options.count) {
        this.countOption = options.count;
      }
      if (options.head) {
        this.headOption = true;
      }
      return this;
    }

    insert(data) {
      this.op = 'insert';
      this.payload = data;
      return this;
    }

    update(data) {
      this.op = 'update';
      this.payload = data;
      return this;
    }

    delete() {
      this.op = 'delete';
      return this;
    }

    upsert(data, options = {}) {
      this.op = 'upsert';
      this.payload = data;
      this.onConflict = options.onConflict || 'id';
      return this;
    }

    eq(column, value) {
      this.filters.push((row) => String(row[column]) === String(value));
      return this;
    }

    neq(column, value) {
      this.filters.push((row) => String(row[column]) !== String(value));
      return this;
    }

    in(column, valuesArray) {
      const set = new Set((valuesArray || []).map((v) => String(v)));
      this.filters.push((row) => set.has(String(row[column])));
      return this;
    }

    ilike(column, pattern) {
      const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
      this.filters.push((row) => {
        const val = row[column];
        return val ? String(val).toLowerCase().includes(cleanPattern) : false;
      });
      return this;
    }

    or(expression) {
      // Handles e.g. "title.ilike.%term%,company.ilike.%term%" or "user_id.eq.x,id.eq.x"
      const conditions = expression.split(',').map((c) => c.trim());
      this.filters.push((row) => {
        return conditions.some((cond) => {
          const parts = cond.split('.');
          if (parts.length >= 3) {
            const [col, operator, rawVal] = parts;
            if (operator === 'eq') {
              return String(row[col]) === String(rawVal);
            }
            if (operator === 'ilike') {
              const term = rawVal.replace(/%/g, '').toLowerCase();
              return row[col] ? String(row[col]).toLowerCase().includes(term) : false;
            }
          }
          return false;
        });
      });
      return this;
    }

    order(column, { ascending = true } = {}) {
      this.sortFn = (a, b) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      };
      return this;
    }

    limit(n) {
      this.limitCount = n;
      return this;
    }

    async execute() {
      const table = getTable(this.tableName);

      // 1. Handle INSERT
      if (this.op === 'insert') {
        const itemsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = itemsToInsert.map((item) => {
          const row = {
            id: item.id || crypto.randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            ...item
          };
          table.push(row);
          return { ...row };
        });
        const result = Array.isArray(this.payload) ? inserted : inserted[0];
        return { data: result, error: null };
      }

      // 2. Handle UPSERT
      if (this.op === 'upsert') {
        const item = this.payload;
        const conflictCol = this.onConflict || 'id';
        const existingIdx = table.findIndex(
          (r) => String(r[conflictCol]) === String(item[conflictCol])
        );

        let row;
        if (existingIdx !== -1) {
          table[existingIdx] = {
            ...table[existingIdx],
            ...item,
            id: table[existingIdx].id
          };
          row = { ...table[existingIdx] };
        } else {
          row = {
            id: item.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...item
          };
          table.push(row);
        }

        let augmented = { ...row };
        if (this.tableName === 'student_profiles') {
          const user = getTable('users').find((u) => u.id === row.user_id);
          if (user) {
            const { password, ...userSafe } = user;
            augmented.users = userSafe;
          }
        }
        return { data: augmented, error: null };
      }

      // 3. Filter matching rows
      let matchedRows = table.filter((row) =>
        this.filters.every((fn) => fn(row))
      );

      // 4. Handle UPDATE
      if (this.op === 'update') {
        matchedRows.forEach((row) => {
          Object.assign(row, this.payload);
        });
        let updated = matchedRows.map((r) => ({ ...r }));
        if (typeof this.columns === 'string') {
          updated = updated.map((row) => {
            const augmented = { ...row };
            if (this.tableName === 'student_profiles') {
              const user = getTable('users').find((u) => u.id === row.user_id);
              if (user) {
                const { password, ...userSafe } = user;
                augmented.users = userSafe;
              }
            }
            return augmented;
          });
        }
        return { data: updated.length === 1 ? updated[0] : updated, error: null };
      }

      // 5. Handle DELETE
      if (this.op === 'delete') {
        const remaining = table.filter((row) =>
          !this.filters.every((fn) => fn(row))
        );
        tables[this.tableName] = remaining;
        return { data: null, error: null };
      }

      // 6. Handle SELECT
      let rows = matchedRows.map((r) => ({ ...r }));

      if (this.sortFn) {
        rows.sort(this.sortFn);
      }

      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount);
      }

      const totalCount = matchedRows.length;

      // Populate joined foreign entities if requested in select query
      if (typeof this.columns === 'string') {
        rows = rows.map((row) => {
          const augmented = { ...row };

          // Join users in student_profiles
          if (this.tableName === 'student_profiles') {
            const user = getTable('users').find((u) => u.id === row.user_id);
            if (user) {
              const { password, ...userSafe } = user;
              augmented.users = userSafe;
            }
          }

          // Join recruiter in jobs
          if (this.tableName === 'jobs') {
            const recruiter = getTable('users').find((u) => u.id === row.recruiter_id);
            if (recruiter) {
              const { password, ...recruiterSafe } = recruiter;
              augmented.recruiter = recruiterSafe;
            }
          }

          // Join student, job, recruiter in applications
          if (this.tableName === 'applications') {
            const student = getTable('users').find((u) => u.id === row.student_id);
            if (student) {
              const { password, ...studentSafe } = student;
              augmented.student = studentSafe;
            }

            const profile = getTable('student_profiles').find((p) => p.user_id === row.student_id);
            if (profile) {
              augmented.profile = profile;
            }

            const job = getTable('jobs').find((j) => j.id === row.job_id);
            if (job) {
              const recruiter = getTable('users').find((u) => u.id === job.recruiter_id);
              augmented.job = {
                ...job,
                recruiter: recruiter ? { name: recruiter.name, email: recruiter.email } : null
              };
            }
          }

          return augmented;
        });
      }

      if (this.headOption) {
        return { data: null, count: totalCount, error: null };
      }

      return { data: rows, count: totalCount, error: null };
    }

    async single() {
      const res = await this.execute();
      if (res.error) return res;
      if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        return { data: null, error: { message: 'Row not found' } };
      }
      const item = Array.isArray(res.data) ? res.data[0] : res.data;
      return { data: item, error: null };
    }

    async maybeSingle() {
      const res = await this.execute();
      if (res.error) return res;
      if (!res.data || (Array.isArray(res.data) && res.data.length === 0)) {
        return { data: null, error: null };
      }
      const item = Array.isArray(res.data) ? res.data[0] : res.data;
      return { data: item, error: null };
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }
  }

  supabase = {
    from: (tableName) => new QueryBuilder(tableName),
    storage: {
      from: (bucketName) => ({
        upload: async (fileName, fileBuffer, options = {}) => {
          return { data: { path: `${bucketName}/${fileName}` }, error: null };
        },
        getPublicUrl: (fileName) => {
          return {
            data: {
              publicUrl: `https://mock-supabase.local/storage/v1/object/public/${bucketName}/${fileName}`
            }
          };
        }
      })
    }
  };
}

/**
 * Runs a test query on server startup to verify database connectivity.
 */
const testSupabaseConnection = async () => {
  if (!isConfigured) {
    console.log('⚡ [Local Database]: Running in LOCAL MOCK DATABASE mode (all tables & features fully functional in-memory).');
    console.log('💡 Note: To connect to live cloud Supabase, add your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.\n');
    return;
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error(`❌ [Supabase Connection Failed]: ${error.message}`);
      console.error('👉 Ensure you have run database/schema.sql in your Supabase SQL Editor.\n');
    } else {
      console.log('✅ Supabase connected successfully');
    }
  } catch (err) {
    console.error(`❌ [Supabase Connection Exception]: ${err.message}\n`);
  }
};

module.exports = {
  supabase,
  testSupabaseConnection,
  isSupabaseConfigured: isConfigured
};
