// ─────────────────────────────────────────────────────────────────────────────
// api-client.js — Shared API utility for all dashboard pages
//
// Usage:
//   const session = getSession('Applicant');   // or 'Grama Niladhari', etc.
//   const data    = await authFetch('/api/applicant/payments');
//
// getSession()  — reads JWT from localStorage, decodes payload, enforces role.
//                 Redirects to login.html if token is missing/expired/wrong role.
// authFetch()   — wraps fetch() with Authorization: Bearer header.
//                 Redirects to login.html on 401.
// logout()      — clears localStorage and redirects to login.html.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decode a JWT payload without verifying the signature (client-side only).
 * Verification happens on the server for every API call.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Read the stored JWT, verify role, check expiry.
 * @param {string|string[]} requiredRole - e.g. 'Applicant' or ['Admin']
 * @returns {{ id, role, name, token }} or redirects to login.html
 */
function getSession(requiredRole) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('login.html');
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    localStorage.clear();
    window.location.replace('login.html');
    return null;
  }

  // Check token expiry (exp is in seconds)
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    localStorage.clear();
    window.location.replace('login.html');
    return null;
  }

  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  // Backend sets User_ID and Role (capital R) in the JWT payload
  if (!allowed.includes(payload.Role)) {
    window.location.replace('login.html');
    return null;
  }

  return {
    id:    payload.User_ID,
    role:  payload.Role,
    name:  payload.name || localStorage.getItem('name') || '',
    token,
  };
}

/**
 * Authenticated fetch — injects the JWT Bearer header.
 * Redirects to login.html on 401 Unauthorized.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>} parsed JSON body
 */
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Don't set Content-Type for FormData (multipart) — browser sets it with boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.clear();
    window.location.replace('login.html');
    return null;
  }

  return response.json();
}

/**
 * Clear session and go to login page.
 */
function logout() {
  localStorage.clear();
  window.location.replace('login.html');
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Settings Modal & Change Password Logic
// ─────────────────────────────────────────────────────────────────────────────
window.openProfileModal = function(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Clear previous inputs and errors
    document.getElementById('profile-form')?.reset();
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
    if (successEl) { successEl.textContent = ''; successEl.classList.add('hidden'); }
  }
};

window.closeProfileModal = function() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.add('hidden');
};

window.submitChangePassword = async function(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('profile-current-password').value;
  const newPassword = document.getElementById('profile-new-password').value;
  const confirmPassword = document.getElementById('profile-confirm-password').value;
  
  const errorEl = document.getElementById('profile-error');
  const successEl = document.getElementById('profile-success');
  const btn = document.getElementById('profile-submit-btn');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'New passwords do not match.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (newPassword.length < 8) {
    errorEl.textContent = 'New password must be at least 8 characters long.';
    errorEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const data = await authFetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (data && data.status === 'success') {
      successEl.textContent = data.message || 'Password updated successfully.';
      successEl.classList.remove('hidden');
      document.getElementById('profile-form').reset();
      setTimeout(closeProfileModal, 2000);
    } else {
      errorEl.textContent = (data && data.message) ? data.message : 'Failed to update password.';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'An error occurred. Please try again later.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Change Password';
  }
};
