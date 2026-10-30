/**
 * public/app.js
 * -------------
 * Shared client-side library for the College Placement Portal frontend.
 * Provides authentication state management, API request helpers, UI notifications,
 * dynamic navbar rendering, and tab switching.
 * 
 * Viva explanation:
 * - JWT tokens and user profile metadata are stored in browser localStorage.
 * - Every API request sent to protected endpoints includes the HTTP header:
 *   "Authorization: Bearer <token>".
 * - checkAuth() implements frontend route guarding, redirecting unauthorized users
 *   or users with insufficient role permissions back to login.html.
 */

const API_BASE = '/api';

// ============================================================================
// 1. AUTHENTICATION HELPERS
// ============================================================================

const getToken = () => localStorage.getItem('placement_token');
const getUser = () => {
  try {
    const raw = localStorage.getItem('placement_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const setAuth = (token, user) => {
  localStorage.setItem('placement_token', token);
  localStorage.setItem('placement_user', JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem('placement_token');
  localStorage.removeItem('placement_user');
};

const logout = () => {
  clearAuth();
  window.location.href = 'login.html';
};

/**
 * Route Guard: Verifies token and role. Redirects if unauthorized.
 * @param {Array<string>} allowedRoles - e.g. ['student'], ['recruiter'], ['admin']
 */
const checkAuth = (allowedRoles = []) => {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return false;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate portal dashboard
    if (user.role === 'student') window.location.href = 'student.html';
    else if (user.role === 'recruiter') window.location.href = 'company.html';
    else if (user.role === 'admin') window.location.href = 'admin.html';
    else window.location.href = 'login.html';
    return false;
  }

  return true;
};

// ============================================================================
// 2. HTTP FETCH HELPER (apiCall)
// ============================================================================

/**
 * Reusable fetch wrapper for making API calls with automatic Bearer token injection.
 */
const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = getToken();
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await res.json().catch(() => ({}));

    return {
      ok: res.ok,
      status: res.status,
      data: data.data,
      message: data.message || (res.ok ? 'Success' : 'Request failed')
    };
  } catch (error) {
    console.error(`API Call Error (${method} ${endpoint}):`, error);
    return {
      ok: false,
      status: 500,
      data: null,
      message: 'Network connection error. Is the server running?'
    };
  }
};

// ============================================================================
// 3. UI NOTIFICATIONS & HELPERS (No alert popups)
// ============================================================================

/**
 * Displays clean inline feedback banner inside a target element.
 */
const showMessage = (elementId, text, type = 'error') => {
  const box = document.getElementById(elementId);
  if (!box) return;

  box.className = `msg-box msg-${type}`;
  box.textContent = text;
  box.style.display = 'block';

  // Smooth scroll into view if out of viewport
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const hideMessage = (elementId) => {
  const box = document.getElementById(elementId);
  if (box) box.style.display = 'none';
};

/**
 * Formats ISO date string to readable format: "Nov 15, 2026"
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Returns formatted HTML badge element for application status.
 */
const getStatusBadge = (status) => {
  const s = (status || 'applied').toLowerCase();
  let badgeClass = 'badge-applied';
  let label = 'Applied';

  if (s === 'shortlisted') {
    badgeClass = 'badge-shortlisted';
    label = 'Shortlisted';
  } else if (s === 'selected') {
    badgeClass = 'badge-selected';
    label = 'Selected (Placed)';
  } else if (s === 'rejected') {
    badgeClass = 'badge-rejected';
    label = 'Rejected';
  }

  return `<span class="badge ${badgeClass}">${label}</span>`;
};

// ============================================================================
// 4. SHARED NAVBAR RENDERER
// ============================================================================

/**
 * Renders the top navigation bar dynamically according to user session.
 */
const renderNavbar = (activePage = '') => {
  const user = getUser();
  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) return;

  let dashboardUrl = '#';
  let dashboardLabel = 'Dashboard';

  if (user) {
    if (user.role === 'student') {
      dashboardUrl = 'student.html';
      dashboardLabel = 'Student Portal';
    } else if (user.role === 'recruiter') {
      dashboardUrl = 'company.html';
      dashboardLabel = 'Company Portal';
    } else if (user.role === 'admin') {
      dashboardUrl = 'admin.html';
      dashboardLabel = 'Placement Cell (Admin)';
    }
  }

  navContainer.innerHTML = `
    <a href="index.html" class="brand-logo">
      <div class="brand-icon">🎓</div>
      <span>Campus Placement Portal</span>
    </a>
    <ul class="nav-links">
      <li><a href="index.html" class="${activePage === 'home' ? 'active' : ''}">Campus Drives</a></li>
      ${
        user
          ? `
        <li><a href="${dashboardUrl}" class="${activePage === 'dashboard' ? 'active' : ''}">${dashboardLabel}</a></li>
        <li class="user-badge">
          <span>👤 ${user.name}</span>
          <span style="opacity: 0.7; font-weight: 400;">(${user.role})</span>
        </li>
        <li><button onclick="logout()" class="btn btn-secondary btn-sm">Logout</button></li>
      `
          : `
        <li><a href="login.html" class="${activePage === 'login' ? 'active' : ''}">Login</a></li>
        <li><a href="register.html" class="btn btn-primary btn-sm ${activePage === 'register' ? 'active' : ''}">Register</a></li>
      `
      }
    </ul>
  `;
};

// ============================================================================
// 5. TABS SWITCHER
// ============================================================================

/**
 * Initializes tab switching behavior on buttons with [data-tab].
 */
const initTabs = (onTabChangeCallback) => {
  const buttons = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      // Update button active state
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update pane active state
      panes.forEach((pane) => {
        if (pane.id === targetId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      if (typeof onTabChangeCallback === 'function') {
        onTabChangeCallback(targetId);
      }
    });
  });
};
