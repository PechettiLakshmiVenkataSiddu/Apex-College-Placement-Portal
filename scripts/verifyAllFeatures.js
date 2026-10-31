/**
 * scripts/verifyAllFeatures.js
 * ----------------------------
 * End-to-end integration and frontend feature verification script.
 * Verifies every page, static file, API endpoint, and the full placement cycle.
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const dataString = body ? JSON.stringify(body) : null;
    if (dataString) headers['Content-Length'] = Buffer.byteLength(dataString);

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(responseBody);
          } catch (e) {
            parsed = responseBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
};

const uploadFileRequest = (endpoint, fileName, fileBuffer, mimeType, token = null) => {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`);

    const header = `--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(header, 'utf8'),
      fileBuffer,
      Buffer.from(footer, 'utf8')
    ]);

    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
};

const assert = (cond, msg) => {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
};

const run = async () => {
  console.log('\n=============================================================');
  console.log('   FULL FEATURE VERIFICATION: BACKEND + FRONTEND INTEGRATION ');
  console.log('=============================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: STATIC FRONTEND PAGES & ASSETS
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing Static Frontend Delivery ---');
    const pages = [
      { path: '/', expectedType: 'text/html' },
      { path: '/index.html', expectedType: 'text/html' },
      { path: '/login.html', expectedType: 'text/html' },
      { path: '/register.html', expectedType: 'text/html' },
      { path: '/student.html', expectedType: 'text/html' },
      { path: '/company.html', expectedType: 'text/html' },
      { path: '/admin.html', expectedType: 'text/html' },
      { path: '/style.css', expectedType: 'text/css' },
      { path: '/app.js', expectedType: 'application/javascript' }
    ];

    for (const p of pages) {
      const res = await request('GET', p.path);
      assert(res.status === 200, `Page delivery ${p.path} (HTTP 200)`);
      assert(
        res.headers['content-type'] && res.headers['content-type'].includes(p.expectedType),
        `Correct Content-Type for ${p.path} (${p.expectedType})`
      );
    }

    // ------------------------------------------------------------------------
    // SECTION 2: PUBLIC STATS & DRIVES ON LANDING PAGE
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Landing Page Endpoints ---');
    const pubStats = await request('GET', '/api/jobs/public/stats');
    assert(pubStats.status === 200 && pubStats.data.success, 'Public placement stats summary (GET /api/jobs/public/stats)');
    assert(
      pubStats.data.data.companiesVisiting >= 1 && pubStats.data.data.drivesOpen >= 1,
      'Live stats reflect initial seed companies & drives'
    );

    const activeJobs = await request('GET', '/api/jobs');
    assert(activeJobs.status === 200 && activeJobs.data.data.length >= 1, 'Active campus drives fetched (GET /api/jobs)');
    const seedJob = activeJobs.data.data[0];
    assert(seedJob.package_lpa !== undefined, 'Job includes package_lpa numeric column');

    // ------------------------------------------------------------------------
    // SECTION 3: RECRUITER REGISTRATION & ADMIN APPROVAL FLOW
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Recruiter Registration & Admin Approval ---');
    // Admin login
    const adminLog = await request('POST', '/api/auth/login', { email: 'admin@portal.com', password: 'Admin@123' });
    assert(adminLog.status === 200 && adminLog.data.data.token, 'Placement Officer login (POST /api/auth/login)');
    const adminToken = adminLog.data.data.token;

    // Register Amazon recruiter
    const regRecruiter = await request('POST', '/api/auth/register', {
      name: 'Amazon Development Centre',
      email: 'recruiter@amazon.com',
      password: 'Password@123',
      role: 'recruiter'
    });
    assert(
      regRecruiter.status === 201 && regRecruiter.data.data.user.is_approved === false,
      'Company registers with is_approved=false (POST /api/auth/register)'
    );
    const amazonId = regRecruiter.data.data.user.id;

    // Unapproved recruiter blocked
    const blockedLog = await request('POST', '/api/auth/login', { email: 'recruiter@amazon.com', password: 'Password@123' });
    assert(blockedLog.status === 403, 'Unapproved company blocked with HTTP 403 (POST /api/auth/login)');

    // Admin approves recruiter
    const approve = await request('PUT', `/api/admin/recruiters/${amazonId}/approve`, null, adminToken);
    assert(approve.status === 200 && approve.data.data.is_approved === true, 'Admin approves company (PUT /api/admin/recruiters/:id/approve)');

    // Approved recruiter logs in
    const amazonLog = await request('POST', '/api/auth/login', { email: 'recruiter@amazon.com', password: 'Password@123' });
    assert(amazonLog.status === 200 && amazonLog.data.data.token, 'Approved company logs in successfully');
    const amazonToken = amazonLog.data.data.token;

    // ------------------------------------------------------------------------
    // SECTION 4: COMPANY POSTS & MANAGES CAMPUS DRIVE
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Campus Drive Posting with New Fields ---');
    const postDrive = await request(
      'POST',
      '/api/jobs',
      {
        title: 'SDE-1 Graduate Campus Drive',
        company: 'Amazon Development Centre',
        description: 'Hiring software development engineers for AWS Cloud infrastructure and Prime Video.',
        location: 'Bangalore / Hyderabad',
        package_lpa: 24.5,
        positions: 15,
        selection_process: 'Online Assessment > Technical Interview 1 > Technical Interview 2 > Bar Raiser',
        job_type: 'Full-time',
        last_date_to_apply: '2026-12-31',
        min_cgpa: 8.0,
        max_backlogs: 0,
        allowed_departments: 'Computer Science & Engineering, Information Technology'
      },
      amazonToken
    );
    assert(
      postDrive.status === 201 && postDrive.data.data.package_lpa === 24.5 && postDrive.data.data.positions === 15,
      'Company posts drive with package_lpa, positions, selection_process (POST /api/jobs)'
    );
    const driveId = postDrive.data.data.id;

    // Recruiter lists own jobs
    const myJobs = await request('GET', '/api/jobs/my/list', null, amazonToken);
    assert(myJobs.status === 200 && myJobs.data.data.length >= 1, 'Recruiter views own drives (GET /api/jobs/my/list)');

    // ------------------------------------------------------------------------
    // SECTION 5: STUDENT LIFECYCLE, PROFILE, RESUME UPLOAD & ELIGIBILITY
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Student Lifecycle, Resume Upload & Eligibility ---');
    // Register student
    const regStudent = await request('POST', '/api/auth/register', {
      name: 'Priya Patel',
      email: 'priya.patel@college.edu',
      password: 'Password@123',
      role: 'student'
    });
    assert(regStudent.status === 201, 'Student registers account (POST /api/auth/register)');
    const studentUserId = regStudent.data.data.user.id;

    // Student logs in
    const studentLog = await request('POST', '/api/auth/login', { email: 'priya.patel@college.edu', password: 'Password@123' });
    assert(studentLog.status === 200 && studentLog.data.data.token, 'Student logs in (POST /api/auth/login)');
    const studentToken = studentLog.data.data.token;

    // Dashboard check before profile is filled
    const initialDash = await request('GET', '/api/students/dashboard', null, studentToken);
    assert(initialDash.status === 200, 'Student dashboard metrics (GET /api/students/dashboard)');

    // Check eligibility before profile completed -> must be ineligible
    const eligCheck1 = await request('GET', `/api/jobs/${driveId}/eligibility`, null, studentToken);
    assert(
      eligCheck1.status === 200 && eligCheck1.data.data.eligible === false && eligCheck1.data.data.isProfileMissing,
      'Eligibility endpoint returns false with isProfileMissing=true (GET /api/jobs/:id/eligibility)'
    );

    // Update academic profile
    const updateProf = await request(
      'PUT',
      '/api/students/profile',
      {
        roll_number: '2022CS2089',
        course: 'B.Tech',
        department: 'Computer Science & Engineering',
        current_year: 4,
        graduation_year: 2026,
        cgpa: 9.15,
        backlogs: 0,
        phone: '+91-9876543211',
        skills: 'C++, Java, Distributed Systems, Algorithms, AWS'
      },
      studentToken
    );
    assert(updateProf.status === 200, 'Student updates academic profile (PUT /api/students/profile)');

    // Test Resume Upload:
    // a) Wrong format rejection
    const txtBuffer = Buffer.from('Not a PDF file');
    const txtUpload = await uploadFileRequest('/api/students/resume', 'test.txt', txtBuffer, 'text/plain', studentToken);
    assert(txtUpload.status === 400, 'Resume upload rejects non-PDF files with HTTP 400');

    // b) Valid PDF upload
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Priya Patel Resume) >>\nendobj\ntrailer\n<<>>\n%%EOF');
    const pdfUpload = await uploadFileRequest('/api/students/resume', 'priya_patel_resume.pdf', pdfBuffer, 'application/pdf', studentToken);
    assert(
      pdfUpload.status === 200 && pdfUpload.data.data.resume_url,
      'Resume PDF uploaded and saved in student_profiles.resume_url (POST /api/students/resume)'
    );

    // Re-check dashboard stats
    const updatedDash = await request('GET', '/api/students/dashboard', null, studentToken);
    assert(
      updatedDash.status === 200 && updatedDash.data.data.profileCompletion === 100 && updatedDash.data.data.eligibleDrivesCount >= 2,
      'Student dashboard reflects 100% profile completion and positive eligible drives count'
    );

    // Re-check eligibility -> now fully eligible!
    const eligCheck2 = await request('GET', `/api/jobs/${driveId}/eligibility`, null, studentToken);
    assert(
      eligCheck2.status === 200 && eligCheck2.data.data.eligible === true && eligCheck2.data.data.reasons.length === 0,
      'Student eligibility confirmed: eligible=true (GET /api/jobs/:id/eligibility)'
    );

    // ------------------------------------------------------------------------
    // SECTION 6: STUDENT APPLIES, RECRUITER EVALUATES & SELECTS
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Application, Review & Candidate Selection ---');
    // Student applies to Amazon drive
    const applyRes = await request('POST', `/api/applications/${driveId}`, null, studentToken);
    assert(applyRes.status === 201 && applyRes.data.data.id, 'Student submits application (POST /api/applications/:id)');
    const appId = applyRes.data.data.id;

    // Student views submitted applications
    const myApps = await request('GET', '/api/applications/my', null, studentToken);
    assert(myApps.status === 200 && myApps.data.data.length === 1, 'Student views applications list (GET /api/applications/my)');

    // Recruiter views applicants with full profile & resume
    const appList = await request('GET', `/api/applications/job/${driveId}`, null, amazonToken);
    assert(
      appList.status === 200 &&
      appList.data.data.applicants.length === 1 &&
      appList.data.data.applicants[0].profile.resume_url &&
      appList.data.data.applicants[0].profile.cgpa === 9.15,
      'Recruiter reviews applicant with academic metrics & resume link (GET /api/applications/job/:id)'
    );

    // Recruiter shortlists candidate
    const shortlist = await request('PUT', `/api/applications/${appId}/status`, { status: 'shortlisted' }, amazonToken);
    assert(shortlist.status === 200 && shortlist.data.data.status === 'shortlisted', 'Recruiter shortlists candidate');

    // Recruiter selects candidate (hires)
    const select = await request('PUT', `/api/applications/${appId}/status`, { status: 'selected' }, amazonToken);
    assert(select.status === 200 && select.data.data.status === 'selected', 'Recruiter selects candidate (offer extended)');

    // ------------------------------------------------------------------------
    // SECTION 7: ONE-STUDENT-ONE-OFFER ENFORCEMENT & ADMIN PLACEMENT METRICS
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing One-Student-One-Offer & Admin Placements Registry ---');
    // Placed student tries to apply to Microsoft drive -> blocked!
    const msJobId = seedJob.id;
    const blockedApply = await request('POST', `/api/applications/${msJobId}`, null, studentToken);
    assert(
      blockedApply.status === 400 && blockedApply.data.message.includes('One-Student-One-Offer'),
      'One-Student-One-Offer blocks placed student from applying further (POST /api/applications/:id)'
    );

    // Admin verifies student academic standing
    const verifySt = await request('PUT', `/api/admin/students/${studentUserId}/verify`, null, adminToken);
    assert(verifySt.status === 200 && verifySt.data.data.is_verified === true, 'Placement Officer verifies student credentials');

    // Admin views placements registry
    const placements = await request('GET', '/api/admin/placements', null, adminToken);
    assert(
      placements.status === 200 &&
      placements.data.data.some(p => p.student && p.student.name === 'Priya Patel'),
      'Placement Officer views official placed candidate registry with package (GET /api/admin/placements)'
    );

    // Admin checks overall statistics
    const adminStats = await request('GET', '/api/admin/stats', null, adminToken);
    assert(
      adminStats.status === 200 &&
      adminStats.data.data.placedStudents >= 1 &&
      parseFloat(adminStats.data.data.placementPercentage) > 0,
      'Admin statistics reflect placement percentage calculation (GET /api/admin/stats)'
    );

    console.log('\n=============================================================');
    console.log('🎉 ALL INTEGRATION & FEATURE VERIFICATIONS PASSED 100%!       ');
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification error:', err);
    process.exit(1);
  }
};

const start = async () => {
  try {
    const health = await request('GET', '/api/health');
    if (health.status === 200) {
      console.log('🔗 Server is already active on port ' + PORT);
      await run();
      return;
    }
  } catch (e) {
    console.log('🚀 Starting server on port ' + PORT + '...');
    require('../server');
    setTimeout(run, 1200);
  }
};

start();
