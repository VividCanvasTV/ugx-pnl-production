// Server-backed authentication module.
// Auth state lives in an HttpOnly session cookie set by api/auth.php and is
// backed by the users table. This module is self-contained so login.html works
// without api.js.

const AUTH_API = 'api/auth.php';

let _currentUser = null;

async function authLogin(email, password) {
  const resp = await fetch(`${AUTH_API}?action=login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await resp.json().catch(() => ({}));
  if (resp.ok && data.success) {
    _currentUser = data.user;
    return { success: true, user: data.user };
  }
  return { success: false, error: data.error || 'Invalid email or password' };
}

async function authLogout() {
  try {
    await fetch(`${AUTH_API}?action=logout`, { method: 'POST', credentials: 'include' });
  } catch (e) { /* ignore network error on logout */ }
  _currentUser = null;
  window.location.replace('login.html');
}

// Returns the current user object, or null. Caches after first call.
async function getCurrentUser() {
  if (_currentUser) return _currentUser;
  try {
    const resp = await fetch(`${AUTH_API}?action=me`, { credentials: 'include' });
    if (!resp.ok) return null;
    const data = await resp.json();
    _currentUser = data && data.authenticated ? data.user : null;
    return _currentUser;
  } catch (e) {
    return null;
  }
}

// Page guard: redirect to login if not authenticated. Optionally require admin.
async function requireAuth(options = {}) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace('login.html');
    return null;
  }
  if (options.admin && user.role !== 'admin') {
    window.location.replace('job_form.html');
    return null;
  }
  return user;
}

// Expose globally for inline page scripts.
window.Auth = { authLogin, authLogout, getCurrentUser, requireAuth };
