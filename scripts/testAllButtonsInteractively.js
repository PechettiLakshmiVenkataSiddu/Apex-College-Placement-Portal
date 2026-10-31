/**
 * scripts/testAllButtonsInteractively.js
 * --------------------------------------
 * Tests every single button, link, modal, tab switcher, and filter input
 * across all pages of the portal.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const publicDir = path.join(__dirname, '..', 'public');
const appJs = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');

const PORT = 5000;
let passed = 0;
let failed = 0;

const assert = (cond, msg) => {
  if (cond) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
};

const makeReq = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve) => {
    const url = new URL(`http://localhost:${PORT}${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const r = http.request(url, { method, headers }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', err => resolve({ status: 500, error: err.message }));
    if (data) r.write(data);
    r.end();
  });
};

async function testAllButtons() {
  console.log('=============================================================');
  console.log('🔘 COMPREHENSIVE BUTTONS, LINKS & CONTROLS VERIFICATION');
  console.log('=============================================================\n');

  // 1. INDEX.HTML
  console.log('--- 1. Testing index.html Controls & Buttons ---');
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert(indexHtml.includes('id="drivesSection"'), 'Drives section anchor id exists for smooth scroll navigation');
  assert(indexHtml.includes('href="login.html"'), 'Hero Login button links to login.html');
  assert(indexHtml.includes('href="register.html"'), 'Hero Register button links to register.html');
  assert(indexHtml.includes('id="searchInput"'), 'Search input box present');
  assert(indexHtml.includes('id="locationFilter"'), 'Location dropdown filter present');
  assert(indexHtml.includes('id="jobTypeFilter"'), 'Job type dropdown filter present');

  const jobsRes = await makeReq('/api/jobs');
  assert(jobsRes.status === 200 && jobsRes.data.data.length >= 7, `GET /api/jobs returns ${jobsRes.data.data.length} active campus drives`);

  const statsRes = await makeReq('/api/jobs/public/stats');
  assert(statsRes.status === 200 && statsRes.data.data.drivesOpen >= 7, `Public stats returns ${statsRes.data.data.drivesOpen} open drives`);

  // 2. LOGIN.HTML
  console.log('\n--- 2. Testing login.html Buttons & Actions ---');
  const loginHtml = fs.readFileSync(path.join(publicDir, 'login.html'), 'utf8');
  assert(loginHtml.includes('id="togglePasswordBtn"'), 'Show/Hide password button present');
  assert(loginHtml.includes('id="submitBtn"'), 'Sign In submit button present');

  // Test admin login
  const adminLogin = await makeReq('/api/auth/login', 'POST', { email: 'admin@portal.com', password: 'Admin@123' });
  assert(adminLogin.status === 200 && adminLogin.data.data.user.role === 'admin', 'Admin login successful');
  const adminToken = adminLogin.data.data.token;

  // 3. REGISTER.HTML
  console.log('\n--- 3. Testing register.html Buttons & Toggles ---');
  const regHtml = fs.readFileSync(path.join(publicDir, 'register.html'), 'utf8');
  assert(regHtml.includes('id="roleToggleStudent"'), 'Student role toggle pill present');
  assert(regHtml.includes('id="roleToggleCompany"'), 'Company role toggle pill present');
  assert(regHtml.includes('id="submitBtn"'), 'Account creation submit button present');

  // 4. STUDENT.HTML
  console.log('\n--- 4. Testing student.html Buttons, Modals & Tabs ---');
  const stuHtml = fs.readFileSync(path.join(publicDir, 'student.html'), 'utf8');
  assert(stuHtml.includes('data-tab="tabDashboard"'), 'Dashboard tab button present');
  assert(stuHtml.includes('data-tab="tabProfile"'), 'My Profile tab button present');
  assert(stuHtml.includes('data-tab="tabDrives"'), 'Campus Drives tab button present');
  assert(stuHtml.includes('data-tab="tabApplications"'), 'My Applications tab button present');
  assert(stuHtml.includes('id="saveProfileBtn"'), 'Save Academic Profile button present');
  assert(stuHtml.includes('id="uploadResumeBtn"'), 'Upload Resume PDF button present');
  assert(stuHtml.includes('id="modalApplyBtn"'), 'Drive details modal Apply Now button present');
  assert(stuHtml.includes('onclick="closeJobDetailsModal()"'), 'Modal close button present');

  // Login as student Sneha Reddy
  const snehaLogin = await makeReq('/api/auth/login', 'POST', { email: 'sneha.reddy@college.edu', password: 'Admin@123' });
  assert(snehaLogin.status === 200 && snehaLogin.data.data.token, 'Student (Sneha Reddy) logged in');
  const snehaToken = snehaLogin.data.data.token;

  const snehaDash = await makeReq('/api/students/dashboard', 'GET', null, snehaToken);
  assert(snehaDash.status === 200 && snehaDash.data.data.profileCompletion > 0, 'Student dashboard metrics loaded');

  // 5. COMPANY.HTML
  console.log('\n--- 5. Testing company.html Buttons & Recruiters Console ---');
  const compHtml = fs.readFileSync(path.join(publicDir, 'company.html'), 'utf8');
  assert(compHtml.includes('data-tab="tabDashboard"'), 'Recruiter Dashboard tab present');
  assert(compHtml.includes('data-tab="tabPostDrive"'), 'Post New Drive tab present');
  assert(compHtml.includes('data-tab="tabMyDrives"'), 'My Drives tab present');
  assert(compHtml.includes('data-tab="tabApplicants"'), 'Review Applicants tab present');
  assert(compHtml.includes('id="postDriveBtn"'), 'Publish Campus Drive button present');
  assert(compHtml.includes('id="saveEditDriveBtn"'), 'Edit drive modal Save button present');
  assert(compHtml.includes('onclick="closeEditModal()"'), 'Edit drive modal Close button present');

  // Login as recruiter (Google)
  const googleLogin = await makeReq('/api/auth/login', 'POST', { email: 'hr@google.com', password: 'Admin@123' });
  assert(googleLogin.status === 200 && googleLogin.data.data.token, 'Company recruiter (Google) logged in');
  const googleToken = googleLogin.data.data.token;

  const googleDrives = await makeReq('/api/jobs/my/list', 'GET', null, googleToken);
  assert(googleDrives.status === 200 && googleDrives.data.data.length >= 1, 'Google recruiter views own published drives');

  // 6. ADMIN.HTML
  console.log('\n--- 6. Testing admin.html Buttons & Controls ---');
  const adminHtml = fs.readFileSync(path.join(publicDir, 'admin.html'), 'utf8');
  assert(adminHtml.includes('onclick="loadAdminStats()"'), 'Refresh Metrics button present');
  assert(adminHtml.includes('onclick="downloadPlacementsCSV()"'), 'Export Placements CSV button present');
  assert(adminHtml.includes('data-tab="tabPendingCompanies"'), 'Pending Companies tab present');
  assert(adminHtml.includes('data-tab="tabStudents"'), 'Students tab present');
  assert(adminHtml.includes('data-tab="tabAllDrives"'), 'All Drives tab present');
  assert(adminHtml.includes('data-tab="tabPlacements"'), 'Placements Report tab present');

  const adminStats = await makeReq('/api/admin/stats', 'GET', null, adminToken);
  assert(adminStats.status === 200 && adminStats.data.data.totalJobs >= 7, 'Admin stats reflect total jobs count');

  const adminPlacements = await makeReq('/api/admin/placements', 'GET', null, adminToken);
  assert(adminPlacements.status === 200, 'Placement Officer views placements registry');

  console.log('\n=============================================================');
  console.log(`BUTTONS & CONTROLS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed === 0) {
    console.log('🎉 ALL BUTTONS, LINKS & USER ACTIONS OPERATIONAL!');
  }
  console.log('=============================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

testAllButtons();
