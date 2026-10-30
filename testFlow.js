/**
 * testFlow.js
 * -----------
 * Comprehensive automated verification script for the College Placement Portal Backend.
 * Tests every endpoint, business policy, and edge case.
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const request = (method, endpoint, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`);
    const headers = { 'Content-Type': 'application/json' };
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
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
};

const runAllTests = async () => {
  console.log('\n=============================================================');
  console.log('  COLLEGE PLACEMENT PORTAL - COMPREHENSIVE END-TO-END SUITE  ');
  console.log('=============================================================\n');

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.success, 'Server Health Check (GET /api/health)');

    // 2. Login Placement Officer (Admin default credentials)
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@portal.com',
      password: 'Admin@123'
    });
    assert(adminLogin.status === 200 && adminLogin.data.data.token, 'Placement Officer Login (POST /api/auth/login)');
    const adminToken = adminLogin.data.data.token;

    // 3. Register Company Recruiter (Acme Tech)
    const companyRegister = await request('POST', '/auth/register', {
      name: 'Acme Tech Solutions',
      email: 'hr@acmetech.com',
      password: 'Password@123',
      role: 'recruiter'
    });
    assert(
      companyRegister.status === 201 && companyRegister.data.data.user.is_approved === false,
      'Company Registration with is_approved=false (POST /api/auth/register)'
    );
    const companyId = companyRegister.data.data.user.id;

    // 4. Verify unapproved company cannot log in (403 Forbidden)
    const companyBlockedLogin = await request('POST', '/auth/login', {
      email: 'hr@acmetech.com',
      password: 'Password@123'
    });
    assert(
      companyBlockedLogin.status === 403,
      'Unapproved Company Login Blocked with HTTP 403 (POST /api/auth/login)'
    );

    // 5. Placement Officer views pending companies
    const pendingList = await request('GET', '/admin/recruiters/pending', null, adminToken);
    const hasCompany = pendingList.data.data.some((c) => c.id === companyId);
    assert(
      pendingList.status === 200 && hasCompany,
      'Placement Officer Views Pending Recruiters (GET /api/admin/recruiters/pending)'
    );

    // 6. Placement Officer approves company
    const approveCompany = await request('PUT', `/admin/recruiters/${companyId}/approve`, null, adminToken);
    assert(
      approveCompany.status === 200 && approveCompany.data.data.is_approved === true,
      'Placement Officer Approves Company (PUT /api/admin/recruiters/:id/approve)'
    );

    // 7. Approved Company logs in successfully
    const companyLogin = await request('POST', '/auth/login', {
      email: 'hr@acmetech.com',
      password: 'Password@123'
    });
    assert(companyLogin.status === 200 && companyLogin.data.data.token, 'Approved Company Login Successful (POST /api/auth/login)');
    const recruiterToken = companyLogin.data.data.token;

    // 8. Company posts Campus Drive with eligibility criteria
    const postJob = await request(
      'POST',
      '/jobs',
      {
        title: 'Graduate Software Engineer (Drive 2026)',
        company: 'Acme Tech Solutions',
        description: 'Hiring software engineers with high problem solving aptitude.',
        location: 'Bangalore',
        salary: 'INR 10,00,000 / year',
        job_type: 'Full-time',
        deadline: '2026-12-31',
        min_cgpa: 7.50,
        max_backlogs: 0,
        allowed_departments: 'Computer Science, Information Technology'
      },
      recruiterToken
    );
    assert(postJob.status === 201 && postJob.data.data.id, 'Company Posts Campus Drive with Criteria (POST /api/jobs)');
    const jobId = postJob.data.data.id;

    // 9. Public views active jobs
    const publicJobs = await request('GET', '/jobs');
    assert(publicJobs.status === 200 && publicJobs.data.data.length > 0, 'Public Browses Campus Drives (GET /api/jobs)');

    // 10. Register Student
    const studentRegister = await request('POST', '/auth/register', {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@college.edu',
      password: 'Password@123',
      role: 'student'
    });
    assert(studentRegister.status === 201 && studentRegister.data.data.user.role === 'student', 'Student Registration (POST /api/auth/register)');
    const studentUserId = studentRegister.data.data.user.id;

    // 11. Student logs in
    const studentLogin = await request('POST', '/auth/login', {
      email: 'rahul.sharma@college.edu',
      password: 'Password@123'
    });
    assert(studentLogin.status === 200 && studentLogin.data.data.token, 'Student Login (POST /api/auth/login)');
    const studentToken = studentLogin.data.data.token;

    // 12. Policy Check: Student tries to apply with INCOMPLETE profile -> 400 Bad Request
    const applyIncomplete = await request('POST', `/applications/${jobId}`, null, studentToken);
    assert(
      applyIncomplete.status === 400 && applyIncomplete.data.message.includes('Profile Incomplete'),
      'Incomplete Profile Application Rejection (POST /api/applications/:id)'
    );

    // 13. Policy Check: Student fills profile but with INELIGIBLE CGPA (e.g. 6.80 < 7.50)
    await request(
      'PUT',
      '/students/profile',
      {
        roll_number: '2022CS1042',
        course: 'B.Tech',
        department: 'Computer Science',
        current_year: 4,
        graduation_year: 2026,
        cgpa: 6.80,
        backlogs: 0
      },
      studentToken
    );

    const applyLowCgpa = await request('POST', `/applications/${jobId}`, null, studentToken);
    assert(
      applyLowCgpa.status === 400 && applyLowCgpa.data.message.includes('Minimum CGPA required'),
      'Eligibility Enforcement: Low CGPA Rejection (POST /api/applications/:id)'
    );

    // 14. Student updates profile to meet criteria (CGPA 8.65, 0 backlogs)
    const updateProfile = await request(
      'PUT',
      '/students/profile',
      {
        roll_number: '2022CS1042',
        course: 'B.Tech',
        department: 'Computer Science',
        current_year: 4,
        graduation_year: 2026,
        cgpa: 8.65,
        backlogs: 0,
        phone: '+91-9876543210',
        skills: 'Java, Python, Node.js, Express, PostgreSQL',
        resume_url: 'https://example.com/resumes/rahul.pdf'
      },
      studentToken
    );
    assert(updateProfile.status === 200, 'Student Completes Eligible Profile (PUT /api/students/profile)');

    // 15. Placement Officer verifies student academic credentials
    const verifyStudent = await request('PUT', `/admin/students/${studentUserId}/verify`, null, adminToken);
    assert(
      verifyStudent.status === 200 && verifyStudent.data.data.is_verified === true,
      'Placement Officer Verifies Student Profile (PUT /api/admin/students/:id/verify)'
    );

    // 16. Eligible student applies successfully
    const applySuccess = await request('POST', `/applications/${jobId}`, null, studentToken);
    assert(applySuccess.status === 201 && applySuccess.data.data.id, 'Eligible Student Applies to Drive (POST /api/applications/:id)');
    const applicationId = applySuccess.data.data.id;

    // 17. Duplicate application attempt blocked -> 409 Conflict
    const applyDuplicate = await request('POST', `/applications/${jobId}`, null, studentToken);
    assert(applyDuplicate.status === 409, 'Duplicate Application Blocked with HTTP 409 (POST /api/applications/:id)');

    // 18. Student checks their application list
    const myApps = await request('GET', '/applications/my', null, studentToken);
    assert(myApps.status === 200 && myApps.data.data.length === 1, 'Student Views Submitted Applications (GET /api/applications/my)');

    // 19. Company reviews applicants with student academic profile
    const driveApplicants = await request('GET', `/applications/job/${jobId}`, null, recruiterToken);
    assert(
      driveApplicants.status === 200 &&
      driveApplicants.data.data.applicants.length === 1 &&
      driveApplicants.data.data.applicants[0].profile.roll_number === '2022CS1042',
      'Company Views Applicants with Full Academic Profiles (GET /api/applications/job/:id)'
    );

    // 20. Company shortlists student
    const shortlist = await request('PUT', `/applications/${applicationId}/status`, { status: 'shortlisted' }, recruiterToken);
    assert(shortlist.status === 200 && shortlist.data.data.status === 'shortlisted', 'Company Shortlists Candidate (PUT /api/applications/:id/status)');

    // 21. Company selects student
    const selectCandidate = await request('PUT', `/applications/${applicationId}/status`, { status: 'selected' }, recruiterToken);
    assert(selectCandidate.status === 200 && selectCandidate.data.data.status === 'selected', 'Company Selects Candidate (PUT /api/applications/:id/status)');

    // 22. Policy Check: One-Student-One-Offer Rule
    // Post a 2nd campus drive (Job B)
    const postJob2 = await request(
      'POST',
      '/jobs',
      {
        title: 'Cloud DevOps Engineer',
        company: 'Acme Tech Solutions',
        description: 'DevOps & Cloud placement drive.',
        location: 'Hyderabad',
        job_type: 'Full-time',
        deadline: '2026-12-31',
        min_cgpa: 7.00
      },
      recruiterToken
    );
    const job2Id = postJob2.data.data.id;

    // Placed student tries to apply for Job 2 -> MUST BE BLOCKED
    const applyJob2 = await request('POST', `/applications/${job2Id}`, null, studentToken);
    assert(
      applyJob2.status === 400 && applyJob2.data.message.includes('One-Student-One-Offer'),
      'One-Student-One-Offer Rule Enforced (POST /api/applications/:id)'
    );

    // 23. Placement Officer views Campus Placements Report
    const placements = await request('GET', '/admin/placements', null, adminToken);
    assert(
      placements.status === 200 &&
      placements.data.data.length === 1 &&
      placements.data.data[0].student.name === 'Rahul Sharma',
      'Placement Officer Views Placements Report (GET /api/admin/placements)'
    );

    // 24. Placement Officer views updated stats and placement percentage
    const stats = await request('GET', '/admin/stats', null, adminToken);
    assert(
      stats.status === 200 &&
      stats.data.data.placedStudents === 1 &&
      stats.data.data.placementPercentage === '100.00%',
      'Placement Officer Views Stats & Placement Percentage (GET /api/admin/stats)'
    );

    console.log('\n=============================================================');
    console.log('🎉 ALL 24 TESTS PASSED! FULL COLLEGE PLACEMENT FLOW VERIFIED! ');
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  }
};

// Check if server is already running, or start it
const testServer = async () => {
  try {
    const health = await request('GET', '/health');
    if (health.status === 200) {
      console.log('🔗 Server is already running. Proceeding to tests...');
      await runAllTests();
      return;
    }
  } catch (e) {
    // Server not running yet, start it
    console.log('🚀 Starting server for local test suite...');
    require('./server');
    setTimeout(runAllTests, 1000);
  }
};

testServer();
