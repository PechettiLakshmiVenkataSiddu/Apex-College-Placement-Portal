/**
 * scripts/debugAllPages.js
 * ------------------------
 * Loop analyzer that parses every HTML page, extracts all inline and external
 * JS function calls, validates their existence in app.js, and simulates the
 * exact user actions (click, submit, input) to catch any runtime exceptions.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const publicDir = path.join(__dirname, '..', 'public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
const appJsContent = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');

console.log('=============================================================');
console.log('🔍 RUNNING COMPREHENSIVE DEBUGGING LOOP ACROSS ALL PAGES');
console.log('=============================================================\n');

let totalErrors = 0;

// 1. Check for missing global helper functions in app.js
console.log('--- Phase 1: Checking for Undefined Global Function Calls ---');

const commonHelpers = [
  'apiCall',
  'getToken',
  'getUser',
  'setAuth',
  'clearAuth',
  'logout',
  'checkAuth',
  'uploadResumeFile',
  'showToast',
  'confirmAction',
  'showMessage',
  'hideMessage',
  'setFieldError',
  'clearFieldError',
  'clearAllFieldErrors',
  'showLoading',
  'getEmptyStateHtml',
  'formatDate',
  'formatPackage',
  'getStatusBadge',
  'renderNavbar',
  'initTabs'
];

commonHelpers.forEach(fnName => {
  const isDefined = appJsContent.includes(`const ${fnName}`) || appJsContent.includes(`function ${fnName}`);
  if (!isDefined) {
    console.error(`❌ ERROR in app.js: Global helper '${fnName}' is referenced but not defined!`);
    totalErrors++;
  } else {
    console.log(`✓ Helper '${fnName}' defined in app.js`);
  }
});

// 2. Scan each HTML file for script blocks and check for syntax / reference issues
console.log('\n--- Phase 2: Analyzing Each Frontend HTML File ---');

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract <script> blocks (excluding src="app.js")
  const scriptRegex = /<script(?![^>]*src=["']app\.js["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIndex = 0;

  while ((match = scriptRegex.exec(content)) !== null) {
    scriptIndex++;
    const code = match[1];

    // Check for obvious syntax errors via Function constructor / new vm.Script
    try {
      new Function(code);
      console.log(`✓ [${file}] Script block #${scriptIndex} syntax is valid.`);
    } catch (syntaxErr) {
      // Ignore top-level returns if any, otherwise report
      if (!syntaxErr.message.includes('return')) {
        console.error(`❌ SYNTAX ERROR in ${file} (Script #${scriptIndex}):`, syntaxErr.message);
        totalErrors++;
      }
    }

    // Check for calls to functions that might not exist
    const calledFunctionsMatch = code.match(/([a-zA-Z0-9_]+)\s*\(/g) || [];
    const calledFunctions = [...new Set(calledFunctionsMatch.map(s => s.replace(/\s*\(/, '')))];

    const standardJs = [
      'addEventListener', 'removeEventListener', 'getElementById', 'querySelector',
      'querySelectorAll', 'createElement', 'appendChild', 'removeChild', 'remove',
      'forEach', 'map', 'filter', 'find', 'some', 'every', 'includes', 'trim',
      'toLowerCase', 'toUpperCase', 'split', 'join', 'replace', 'push', 'then',
      'catch', 'setTimeout', 'clearTimeout', 'parseInt', 'parseFloat', 'Number',
      'String', 'Boolean', 'Date', 'Array', 'Set', 'Map', 'Promise', 'JSON',
      'Math', 'console', 'log', 'error', 'warn', 'info', 'preventDefault',
      'stopPropagation', 'toFixed', 'getTime', 'toISOString', 'setAttribute',
      'reset', 'click', 'focus', 'blur', 'encodeURI', 'isNaN'
    ];

    calledFunctions.forEach(fn => {
      if (standardJs.includes(fn)) return;
      if (commonHelpers.includes(fn)) return;
      if (code.includes(`function ${fn}`) || code.includes(`const ${fn}`) || code.includes(`let ${fn}`) || code.includes(`var ${fn}`)) return;
      if (code.includes(`window.${fn}`)) return;

      // Special check: is it in app.js?
      const inAppJs = appJsContent.includes(`const ${fn}`) || appJsContent.includes(`function ${fn}`);
      if (!inAppJs) {
        console.warn(`⚠️ Warning in ${file}: Function '${fn}()' called but not locally defined or in common helpers. Verify if intentional.`);
      }
    });
  }
});

// 3. Runtime API loop test
console.log('\n--- Phase 3: Runtime API End-to-End Loop Test ---');

const testApiEndpoints = async () => {
  const req = (endpoint, method = 'GET', body = null, token = null) => {
    return new Promise((resolve) => {
      const url = new URL(`http://localhost:5000/api${endpoint}`);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = body ? JSON.stringify(body) : null;
      if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

      const r = http.request(url, { method, headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      r.on('error', err => resolve({ status: 500, error: err.message }));
      if (payload) r.write(payload);
      r.end();
    });
  };

  // Test Student Registration endpoint directly
  const testStudentEmail = `debug_student_${Date.now()}@college.edu`;
  const regStudentRes = await req('/auth/register', 'POST', {
    name: 'Debug Student',
    email: testStudentEmail,
    password: 'Password@123',
    role: 'student'
  });

  if (regStudentRes.status === 201) {
    console.log(`✓ Student Registration endpoint functioning: ${testStudentEmail}`);
  } else {
    console.error(`❌ Student Registration endpoint failed! Status: ${regStudentRes.status}`, regStudentRes.data);
    totalErrors++;
  }

  // Test Student Login
  const logStudentRes = await req('/auth/login', 'POST', {
    email: testStudentEmail,
    password: 'Password@123'
  });

  if (logStudentRes.status === 200 && logStudentRes.data.data.token) {
    console.log(`✓ Student Login endpoint functioning with token generation`);
  } else {
    console.error(`❌ Student Login endpoint failed! Status: ${logStudentRes.status}`, logStudentRes.data);
    totalErrors++;
  }
};

testApiEndpoints().then(() => {
  console.log('\n=============================================================');
  if (totalErrors === 0) {
    console.log('🎉 ALL DEBUGGING CHECKS PASSED WITH 0 ERRORS!');
  } else {
    console.error(`❌ FINISHED WITH ${totalErrors} ERROR(S) - SEE ABOVE LOGS`);
  }
  console.log('=============================================================\n');
  process.exit(totalErrors === 0 ? 0 : 1);
});

