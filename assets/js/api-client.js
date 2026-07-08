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
