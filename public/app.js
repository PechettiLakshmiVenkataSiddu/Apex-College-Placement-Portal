/**
 * public/app.js
 * -------------
 * Shared client-side library for the College Placement Portal frontend.
 * Provides JWT token management, API fetch wrappers, toast notifications,
 * accessible modal confirmation dialogs, loading states, form validation helpers,
 * dynamic navbar rendering, and tab switching.
 * 
 * Viva explanation:
 * - JWT tokens and user metadata are saved in browser localStorage upon login.
 * - Every API request sent to protected endpoints carries:
 *   "Authorization: Bearer <token>".
 * - checkAuth() acts as a client-side route guard, checking for token existence
 *   and role authorization before rendering protected pages.
 * - Native alert() popups are completely replaced with modern floating toast messages.
 */

const API_BASE = '/api';

// ============================================================================
// 1. AUTHENTICATION & LOCALSTORAGE HELPERS
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
  showToast('Logged out successfully.', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
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
// 2. HTTP FETCH HELPERS (apiCall & uploadResumeFile)
// ============================================================================

/**
 * Reusable fetch wrapper for making JSON API calls with automatic Bearer token injection.
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

/**
 * Upload resume PDF using multipart/form-data with Bearer token.
 */
const uploadResumeFile = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('resume', file);

  try {
    const res = await fetch(`${API_BASE}/students/resume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data: data.data,
      message: data.message || (res.ok ? 'Upload successful' : 'Upload failed')
    };
  } catch (error) {
    console.error('Resume Upload Error:', error);
    return {
      ok: false,
      status: 500,
      data: null,
      message: 'Network error while uploading resume.'
    };
  }
};

// ============================================================================
// 3. TOAST NOTIFICATIONS & INLINE MESSAGES
// ============================================================================

/**
 * Displays clean inline feedback banner inside a target element.
 */
const showMessage = (elementId, text, type = 'error') => {
  const box = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (!box) return;

  box.className = `msg-box msg-${type}`;
  box.textContent = text;
  box.style.display = 'block';

  try {
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {}
};

/**
 * Hides an inline feedback banner.
 */
const hideMessage = (elementId) => {
  const box = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (box) {
    box.style.display = 'none';
    box.textContent = '';
  }
};

/**
 * Ensure the toast container exists in the DOM.
 */
const getToastContainer = () => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
};

/**
 * Shows a modern floating toast notification.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast visual variant
 * @param {number} duration - Auto dismiss time in ms (default 3500)
 */
const showToast = (message, type = 'info', duration = 3500) => {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon" style="font-weight: bold; font-size: 1.1rem;">${iconMap[type] || 'ℹ'}</span>
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  let timer = null;

  const dismissToast = (el) => {
    if (timer) clearTimeout(timer);
    el.classList.add('toast-hiding');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  };

  // Close button click (null safe)
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dismissToast(toast);
    });
  }

  container.appendChild(toast);

  // Auto dismiss timer
  timer = setTimeout(() => {
    dismissToast(toast);
  }, duration);
};

// ============================================================================
// 4. CONFIRMATION DIALOG (No window.confirm popups)
// ============================================================================

/**
 * Displays a clean custom modal confirmation dialog before delete or status change.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 */
const confirmAction = ({
  title = 'Please Confirm',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
} = {}) => {
  return new Promise((resolve) => {
    // Remove any existing modal
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="toast-close modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm modal-cancel-btn">${cancelText}</button>
          <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} btn-sm modal-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    const closeDialog = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('.modal-confirm-btn').addEventListener('click', () => closeDialog(true));
    overlay.querySelector('.modal-cancel-btn').addEventListener('click', () => closeDialog(false));
    overlay.querySelector('.modal-close-btn').addEventListener('click', () => closeDialog(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog(false);
    });

    document.body.appendChild(overlay);
  });
};

// ============================================================================
// 5. FORM VALIDATION HELPERS
// ============================================================================

/**
 * Shows an inline validation error message directly next to / beneath the input.
 */
const setFieldError = (fieldId, errorText) => {
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.classList.add('input-invalid');

  // Look for dedicated error element by ID, or within form-group, or create one
  let errorEl = document.getElementById(`${fieldId}Error`) ||
                (input.closest('.form-group') && input.closest('.form-group').querySelector('.field-error')) ||
                input.parentElement.querySelector('.field-error');

  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    if (input.closest('.form-group')) {
      input.closest('.form-group').appendChild(errorEl);
    } else {
      input.parentElement.appendChild(errorEl);
    }
  }

  errorEl.textContent = errorText;
  errorEl.classList.add('active');
  errorEl.style.display = 'block';
};

/**
 * Clears validation error from a specific input field.
 */
const clearFieldError = (fieldId) => {
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.classList.remove('input-invalid');

  const errorEl = document.getElementById(`${fieldId}Error`) ||
                  (input.closest('.form-group') && input.closest('.form-group').querySelector('.field-error')) ||
                  input.parentElement.querySelector('.field-error');

  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('active');
    errorEl.style.display = 'none';
  }
};

/**
 * Clears all field validation errors inside a form.
 */
const clearAllFieldErrors = (formElement) => {
  if (!formElement) return;
  formElement.querySelectorAll('.input-invalid').forEach((input) => input.classList.remove('input-invalid'));
  formElement.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('active');
  });
};

// ============================================================================
// 6. LOADING SPINNERS & EMPTY STATES
// ============================================================================

/**
 * Displays a clean loading spinner inside a target container.
 */
const showLoading = (containerId, message = 'Loading details...') => {
  const el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!el) return;

  el.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p style="font-size: 0.9rem; color: var(--text-muted);">${message}</p>
    </div>
  `;
};

/**
 * Generates an accessible, friendly empty state markup.
 */
const getEmptyStateHtml = (icon = '💼', title = 'No drives yet', desc = 'Check back soon for new campus placement drives.') => {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3 class="empty-title">${title}</h3>
      <p class="empty-desc">${desc}</p>
    </div>
  `;
};

// ============================================================================
// 7. FORMATTING & STATUS BADGES
// ============================================================================

/**
 * Formats ISO date string to readable format: "Nov 15, 2026"
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formats package to "X.XX LPA"
 */
const formatPackage = (lpa, salary) => {
  if (lpa !== null && lpa !== undefined && lpa !== '') {
    return `${parseFloat(lpa).toFixed(2)} LPA`;
  }
  if (salary) return salary;
  return 'Not Disclosed';
};

/**
 * Returns formatted HTML badge element for application status:
 * - Applied = blue (badge-applied)
 * - Shortlisted = orange (badge-shortlisted)
 * - Selected = green (badge-selected)
 * - Rejected = red (badge-rejected)
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
// 8. SHARED NAVBAR RENDERER
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
      dashboardLabel = 'Placement Officer';
    }
  }

  navContainer.innerHTML = `
    <a href="index.html" class="brand-logo">
      <div class="brand-icon">🎓</div>
      <span>Apex Placement Portal</span>
    </a>
    <ul class="nav-links">
      <li><a href="index.html#drivesSection" class="${activePage === 'home' ? 'active' : ''}">Campus Drives</a></li>
      ${
        user
          ? `
        <li><a href="${dashboardUrl}" class="${activePage === 'dashboard' ? 'active' : ''}">${dashboardLabel}</a></li>
        <li class="user-badge">
          <span>👤 ${user.name}</span>
          <span style="opacity: 0.75; font-size: 0.78rem; font-weight: 500; text-transform: uppercase;">[${user.role}]</span>
        </li>
        <li><button onclick="logout()" class="btn btn-secondary btn-sm" style="padding: 0.4rem 0.8rem;">Logout</button></li>
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
// 9. TABS SWITCHER
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

// ============================================================================
// 10. STRING UTILS & HTML SANITIZATION
// ============================================================================

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Sanitized HTML safe string
 */
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Expose all core helpers on window object for universal script and inline HTML access
window.apiCall = apiCall;
window.uploadResumeFile = uploadResumeFile;
window.getToken = getToken;
window.getUser = getUser;
window.setAuth = setAuth;
window.clearAuth = clearAuth;
window.logout = logout;
window.checkAuth = checkAuth;
window.showToast = showToast;
window.confirmAction = confirmAction;
window.showMessage = showMessage;
window.hideMessage = hideMessage;
window.setFieldError = setFieldError;
window.clearFieldError = clearFieldError;
window.clearAllFieldErrors = clearAllFieldErrors;
window.showLoading = showLoading;
window.getEmptyStateHtml = getEmptyStateHtml;
window.formatDate = formatDate;
window.formatPackage = formatPackage;
window.getStatusBadge = getStatusBadge;
window.renderNavbar = renderNavbar;
window.initTabs = initTabs;
window.escapeHtml = escapeHtml;



