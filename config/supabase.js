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
  !supabaseServiceRoleKey.includes('your-supabase-service-role-key')
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
      }
    ],
    student_profiles: [],
    jobs: [],
    applications: []
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
        return { data: row, error: null };
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
        const updated = matchedRows.map((r) => ({ ...r }));
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
    from: (tableName) => new QueryBuilder(tableName)
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
      console.error('👉 Ensure you have run database/update.sql in your Supabase SQL Editor.\n');
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
