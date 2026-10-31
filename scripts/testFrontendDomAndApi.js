/**
 * scripts/testFrontendDomAndApi.js
 * --------------------------------
 * Comprehensive automated test suite that validates:
 * 1. Static asset and HTML page delivery from Express
 * 2. Complete browser DOM lifecycle simulation for register.html, login.html, etc.
 * 3. Exact button click, input validation, and API dispatch behavior
 * 4. Full placement cycle across Student, Recruiter, and Admin roles
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const publicDir = path.join(__dirname, '..', 'public');
const appJsCode = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
const registerHtml = fs.readFileSync(path.join(publicDir, 'register.html'), 'utf8');
const loginHtml = fs.readFileSync(path.join(publicDir, 'login.html'), 'utf8');

let totalPassed = 0;
let totalFailed = 0;

const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    totalFailed++;
  }
};

const makeHttpRequest = (method, endpoint, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`);
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const dataString = body ? JSON.stringify(body) : null;
    if (dataString) headers['Content-Length'] = Buffer.byteLength(dataString);

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
};

/**
 * Creates a lightweight browser DOM mock environment to run client-side JavaScript.
 */
function createMockBrowserEnvironment() {
  const elements = new Map();
  const listeners = new Map();

  class MockElement {
    constructor(id, tagName = 'div') {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this.value = '';
      this.textContent = '';
      this.innerHTML = '';
      this.type = 'text';
      this.disabled = false;
      this.style = {};
      this.classList = {
        classes: new Set(),
        add: (...cls) => cls.forEach(c => this.classList.classes.add(c)),
        remove: (...cls) => cls.forEach(c => this.classList.classes.delete(c)),
        contains: (c) => this.classList.classes.has(c)
      };
      this.children = [];
      this.parentElement = null;
    }

    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    }

    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    }

    remove() {
      if (this.parentElement) {
        this.parentElement.removeChild(this);
      }
    }

    closest(selector) {
      if (selector === '.form-group') return this;
      return null;
    }

    querySelector(selector) {
      if (selector === '.field-error') {
        let err = this.children.find(c => c.classList.contains('field-error'));
        if (!err) {
          err = new MockElement('', 'div');
          err.classList.add('field-error');
          this.appendChild(err);
        }
        return err;
      }
      if (selector === '.toast-close') {
        return new MockElement('', 'button');
      }
      return null;
    }

    querySelectorAll(selector) {
      return [];
    }

    addEventListener(event, fn) {
      const key = `${this.id || 'anonymous'}:${event}`;
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(fn);
    }

    dispatchEvent(event) {
      const key = `${this.id || 'anonymous'}:${event.type}`;
      const fns = listeners.get(key) || [];
      fns.forEach(fn => fn(event));
    }

    reset() {
      this.value = '';
    }
  }

  // Prepopulate elements found in register.html
  const registerElementIds = [
    'selectedRole',
    'roleToggleStudent',
    'roleToggleCompany',
    'nameLabel',
    'name',
    'emailLabel',
    'email',
    'password',
    'togglePasswordBtn',
    'submitBtn',
    'companyApprovalNotice',
    'registerMsg',
    'registerForm',
    'nameError',
    'emailError',
    'passwordError'
  ];

  registerElementIds.forEach(id => {
    elements.set(id, new MockElement(id, id === 'submitBtn' || id.includes('Toggle') ? 'button' : (id.includes('Form') ? 'form' : 'input')));
  });

  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();

  const documentMock = {
    addEventListener: (event, fn) => {
      const key = `document:${event}`;
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(fn);
    },
    getElementById: (id) => {
      if (!elements.has(id)) {
        elements.set(id, new MockElement(id));
      }
      return elements.get(id);
    },
    querySelector: (sel) => {
      if (sel === '.nav-container') return new MockElement('nav-container');
      if (sel === '.toast-container') return new MockElement('toast-container');
      return null;
    },
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockElement('', tag),
    body: new MockElement('body')
  };

  const windowMock = {
    location: { href: 'register.html' },
    setTimeout: (fn, ms) => { fn(); return 1; },
    clearTimeout: () => {},
    localStorage: localStorageMock
  };

  return {
    elements,
    listeners,
    documentMock,
    windowMock,
    localStorageMock,
    triggerEvent: (elementId, eventType, eventData = {}) => {
      const key = `${elementId}:${eventType}`;
      const fns = listeners.get(key) || [];
      const eventObj = {
        type: eventType,
        target: elements.get(elementId),
        preventDefault: () => {},
        ...eventData
      };
      return Promise.all(fns.map(fn => fn(eventObj)));
    }
  };
}

async function runTestSuite() {
  console.log('=============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE RECRUITMENT PORTAL VERIFICATION LOOP');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: STATIC ASSETS DELIVERY OVER HTTP
  // --------------------------------------------------------------------------
  console.log('--- Test Group 1: Static HTML & Asset Delivery (GET) ---');

  const filesToCheck = [
    { path: '/', type: 'text/html' },
    { path: '/index.html', type: 'text/html' },
    { path: '/login.html', type: 'text/html' },
    { path: '/register.html', type: 'text/html' },
    { path: '/student.html', type: 'text/html' },
    { path: '/company.html', type: 'text/html' },
    { path: '/admin.html', type: 'text/html' },
    { path: '/style.css', type: 'text/css' },
    { path: '/app.js', type: 'application/javascript' }
  ];

  for (const item of filesToCheck) {
    const res = await makeHttpRequest('GET', item.path);
    assert(res.status === 200, `Delivered ${item.path} with HTTP 200`);
    assert(
      res.headers['content-type'] && res.headers['content-type'].includes(item.type),
      `Content-Type matches ${item.type}`
    );
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: BROWSER DOM SIMULATION FOR register.html
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 2: DOM Simulation for register.html ---');

  const mockEnv = createMockBrowserEnvironment();

  // Extract inline script from register.html
  const scriptMatch = registerHtml.match(/<script>([\s\S]*?)<\/script>/i);
  assert(scriptMatch && scriptMatch[1], 'Extracted register.html inline script');

  const combinedClientCode = `
    ${appJsCode}
    ${scriptMatch[1]}
  `;

  // Create isolated context with mock globals
  const sandbox = {
    document: mockEnv.documentMock,
    window: mockEnv.windowMock,
    localStorage: mockEnv.localStorageMock,
    fetch: async (url, opts = {}) => {
      // Forward fetch to real running server on port 5000
      const method = opts.method || 'GET';
      const body = opts.body ? JSON.parse(opts.body) : null;
      const endpoint = url.replace('/api', '');
      const token = opts.headers && opts.headers['Authorization']
        ? opts.headers['Authorization'].replace('Bearer ', '')
        : null;

      const res = await makeHttpRequest(method, `/api${endpoint}`, body, token);
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        json: async () => res.data
      };
    },
    console: {
      log: () => {},
      warn: () => {},
      error: console.error
    },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    FormData: class {
      constructor() { this.entries = {}; }
      append(k, v) { this.entries[k] = v; }
    }
  };

  vm.createContext(sandbox);

  // Execute app.js and register script in sandbox
  try {
    vm.runInContext(combinedClientCode, sandbox);
    assert(true, 'Executed app.js and register.html scripts with no syntax errors');
  } catch (err) {
    assert(false, `Execution error in register script: ${err.message}`);
  }

  // Simulate DOMContentLoaded
  await mockEnv.triggerEvent('document', 'DOMContentLoaded');
  assert(true, 'Triggered DOMContentLoaded successfully');

  // Verify default role is student
  const roleInput = mockEnv.elements.get('selectedRole');
  const submitBtn = mockEnv.elements.get('submitBtn');
  assert(roleInput.value === 'student', 'Default role is initialized to "student"');
  assert(submitBtn.textContent.includes('Student'), 'Submit button text reads "Create Student Account"');

  // Test Role Toggle: Switch to Recruiter
  await mockEnv.triggerEvent('roleToggleCompany', 'click');
  assert(roleInput.value === 'recruiter', 'Toggled role to "recruiter"');
  assert(submitBtn.textContent.includes('Company'), 'Submit button updated to "Register Company Recruiter"');
  assert(mockEnv.elements.get('companyApprovalNotice').style.display === 'block', 'Approval notice displayed for recruiter');

  // Switch back to Student
  await mockEnv.triggerEvent('roleToggleStudent', 'click');
  assert(roleInput.value === 'student', 'Toggled role back to "student"');
  assert(mockEnv.elements.get('companyApprovalNotice').style.display === 'none', 'Approval notice hidden for student');

  // Test Validation: Submit with empty fields
  await mockEnv.triggerEvent('registerForm', 'submit');
  const nameError = mockEnv.elements.get('nameError');
  const emailError = mockEnv.elements.get('emailError');
  const passwordError = mockEnv.elements.get('passwordError');
  assert(nameError.textContent.length > 0, 'Empty name triggers validation error message');
  assert(emailError.textContent.length > 0, 'Empty email triggers validation error message');
  assert(passwordError.textContent.length > 0, 'Empty password triggers validation error message');

  // Test Valid Student Registration via DOM form submit
  const studentEmail = `student_dom_${Date.now()}@college.edu`;
  mockEnv.elements.get('name').value = 'Test Student Runner';
  mockEnv.elements.get('email').value = studentEmail;
  mockEnv.elements.get('password').value = 'Password@123';

  await mockEnv.triggerEvent('registerForm', 'submit');
  assert(submitBtn.disabled === false, 'Submit button remains active and not permanently stuck');

  // Check that redirect was triggered
  assert(
    mockEnv.windowMock.location.href === 'login.html',
    'Student registration successfully redirects to login.html'
  );

  // Test Duplicate Registration via DOM (should show 409 error)
  mockEnv.windowMock.location.href = 'register.html';
  mockEnv.elements.get('name').value = 'Duplicate Runner';
  mockEnv.elements.get('email').value = studentEmail; // Already registered
  mockEnv.elements.get('password').value = 'Password@123';

  await mockEnv.triggerEvent('registerForm', 'submit');
  assert(
    mockEnv.elements.get('emailError').textContent.includes('already exists'),
    'Duplicate email registration displays inline 409 error on email field'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: END-TO-END PLACEMENT & RECRUITMENT WORKFLOW (HTTP API)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 3: End-to-End Placement Workflow API Loop ---');

  // 1. Student logs in
  const stuLogin = await makeHttpRequest('POST', '/api/auth/login', {
    email: studentEmail,
    password: 'Password@123'
  });
  assert(stuLogin.status === 200 && stuLogin.data.data.token, 'Student logged in successfully');
  const studentToken = stuLogin.data.data.token;

  // 2. Fetch student dashboard
  const stuDash = await makeHttpRequest('GET', '/api/students/dashboard', null, studentToken);
  assert(stuDash.status === 200, 'Student dashboard endpoint responded 200 OK');
  assert(typeof stuDash.data.data.profileCompletion === 'number', 'Profile completion percentage returned');

  // 3. Update student academic profile
  const testRollNumber = `2022CS${Math.floor(1000 + Math.random() * 9000)}`;
  const profUpdate = await makeHttpRequest('PUT', '/api/students/profile', {
    roll_number: testRollNumber,
    course: 'B.Tech',
    department: 'Computer Science & Engineering',
    current_year: 4,
    graduation_year: 2026,
    cgpa: 9.0,
    backlogs: 0,
    phone: '+91-9876543200',
    skills: 'JavaScript, Node.js, Python, SQL'
  }, studentToken);
  assert(profUpdate.status === 200, 'Student profile updated successfully');

  // Fetch active job to test eligibility requirement
  const jobsListRes = await makeHttpRequest('GET', '/api/jobs');
  const targetJobId = jobsListRes.data && jobsListRes.data.data && jobsListRes.data.data[0]
    ? jobsListRes.data.data[0].id
    : '00000000-0000-0000-0000-000000000010';

  // Verify missing resume check
  const preResumeElig = await makeHttpRequest('GET', `/api/jobs/${targetJobId}/eligibility`, null, studentToken);
  assert(
    preResumeElig.status === 200 && preResumeElig.data.data.isResumeMissing === true,
    'Eligibility correctly requires resume upload before application'
  );

  // Upload student resume PDF
  const resumeBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test Resume) >>\nendobj\ntrailer\n<<>>\n%%EOF');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const multipartBody = Buffer.concat([Buffer.from(header), resumeBuffer, Buffer.from(footer)]);

  const resumeUploadRes = await new Promise((resolve) => {
    const req = http.request(
      `http://localhost:${PORT}/api/students/resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': multipartBody.length,
          'Authorization': `Bearer ${studentToken}`
        }
      },
      (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d || '{}') }));
      }
    );
    req.write(multipartBody);
    req.end();
  });
  assert(resumeUploadRes.status === 200 && resumeUploadRes.data.data.resume_url, 'Resume PDF uploaded to Supabase storage mock');

  // 4. Register a new company recruiter
  const recruiterEmail = `hr_${Date.now()}@google.com`;
  const compReg = await makeHttpRequest('POST', '/api/auth/register', {
    name: 'Google LLC',
    email: recruiterEmail,
    password: 'Password@123',
    role: 'recruiter'
  });
  assert(compReg.status === 201 && compReg.data.data.user.is_approved === false, 'Company registered with is_approved=false');
  const recruiterUserId = compReg.data.data.user.id;

  // 5. Unapproved company login is blocked (403)
  const unapprovedLog = await makeHttpRequest('POST', '/api/auth/login', {
    email: recruiterEmail,
    password: 'Password@123'
  });
  assert(unapprovedLog.status === 403, 'Unapproved company blocked with HTTP 403');

  // 6. Admin logs in and approves company
  const adminLog = await makeHttpRequest('POST', '/api/auth/login', {
    email: 'admin@portal.com',
    password: 'Admin@123'
  });
  assert(adminLog.status === 200, 'Placement Officer (Admin) login successful');
  const adminToken = adminLog.data.data.token;

  const approveRes = await makeHttpRequest('PUT', `/api/admin/recruiters/${recruiterUserId}/approve`, null, adminToken);
  assert(approveRes.status === 200, 'Placement Officer approved company recruiter account');

  // 7. Approved recruiter logs in
  const approvedLog = await makeHttpRequest('POST', '/api/auth/login', {
    email: recruiterEmail,
    password: 'Password@123'
  });
  assert(approvedLog.status === 200 && approvedLog.data.data.token, 'Approved recruiter logged in successfully');
  const recruiterToken = approvedLog.data.data.token;

  // 8. Recruiter posts a campus recruitment drive
  const jobPost = await makeHttpRequest('POST', '/api/jobs', {
    title: 'Software Engineer - University Graduate 2026',
    company: 'Google LLC',
    description: 'Developing high-throughput cloud infrastructure and search backend systems.',
    location: 'Bangalore, India',
    package_lpa: 32.0,
    positions: 8,
    selection_process: 'Online Assessment > Technical Coding 1 > Technical Coding 2 > Googliness',
    job_type: 'Full-time',
    last_date_to_apply: '2026-12-31',
    min_cgpa: 8.5,
    max_backlogs: 0,
    allowed_departments: 'Computer Science & Engineering, Information Technology'
  }, recruiterToken);
  assert(jobPost.status === 201 && jobPost.data.data.id, 'Recruiter posted campus drive with new package_lpa and selection_process fields');
  const jobId = jobPost.data.data.id;

  // 9. Student checks eligibility
  const eligCheck = await makeHttpRequest('GET', `/api/jobs/${jobId}/eligibility`, null, studentToken);
  assert(eligCheck.status === 200, 'Drive eligibility checked for student');
  assert(eligCheck.data.data.eligible === true, 'Student meets all cutoffs (CGPA 9.0 >= 8.5, Backlogs 0 <= 0, CSE allowed)');

  // 10. Student submits application
  const applyRes = await makeHttpRequest('POST', `/api/applications/${jobId}`, null, studentToken);
  assert(applyRes.status === 201, 'Student submitted application to Google drive');
  const applicationId = applyRes.data.data.id;

  // 11. Recruiter reviews applicants
  const appList = await makeHttpRequest('GET', `/api/applications/job/${jobId}`, null, recruiterToken);
  assert(appList.status === 200 && appList.data.data.applicants.length >= 1, 'Recruiter viewed drive applicants list');

  // 12. Recruiter updates status: Shortlisted -> Selected
  const shortRes = await makeHttpRequest('PUT', `/api/applications/${applicationId}/status`, { status: 'shortlisted' }, recruiterToken);
  assert(shortRes.status === 200 && shortRes.data.data.status === 'shortlisted', 'Recruiter marked applicant as shortlisted');

  const selectRes = await makeHttpRequest('PUT', `/api/applications/${applicationId}/status`, { status: 'selected' }, recruiterToken);
  assert(selectRes.status === 200 && selectRes.data.data.status === 'selected', 'Recruiter marked applicant as selected (offer extended)');

  // 13. Student dashboard now displays is_selected = true
  const finalStuDash = await makeHttpRequest('GET', '/api/students/dashboard', null, studentToken);
  assert(finalStuDash.status === 200 && finalStuDash.data.data.is_selected === true, 'Student dashboard displays congratulation state (is_selected=true)');

  // 14. Admin verifies student
  const verifyStu = await makeHttpRequest('PUT', `/api/admin/students/${stuLogin.data.data.user.id}/verify`, null, adminToken);
  assert(verifyStu.status === 200, 'Placement Officer verified student academic credentials');

  // 15. Admin views placements report
  const placementsRep = await makeHttpRequest('GET', '/api/admin/reports/placements', null, adminToken);
  assert(placementsRep.status === 200 && placementsRep.data.data.length >= 1, 'Placement Officer generated institutional placements report');

  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  if (totalFailed === 0) {
    console.log('🎉 100% OF FEATURES, DOM ACTIONS & API CHECKS PASSED!');
  } else {
    console.error(`⚠️ ${totalFailed} TESTS ENCOUNTERED AN ISSUE.`);
  }
  console.log('=============================================================\n');

  process.exit(totalFailed === 0 ? 0 : 1);
}

runTestSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
