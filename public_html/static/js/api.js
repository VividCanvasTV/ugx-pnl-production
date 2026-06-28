// Lightweight API client for auth + jobs persistence.
// All requests include the session cookie (credentials: 'include') and a 401
// transparently bounces the user back to the login page.
const API_BASE = 'api';

async function apiRequest(path, options = {}) {
  const url = `${API_BASE}/${path}`;
  const opts = Object.assign({ credentials: 'include' }, options);
  const resp = await fetch(url, opts);
  if (resp.status === 401) {
    // Session expired or not logged in — send the user back to login.
    if (!/login\.html$/.test(window.location.pathname)) {
      window.location.replace('login.html');
    }
    throw new Error('Not authenticated');
  }
  if (!resp.ok) {
    let text = '';
    try { text = await resp.text(); } catch (e) { /* ignore */ }
    throw new Error(`API error ${resp.status}: ${text}`);
  }
  return await resp.json();
}

// ---- Auth ----
async function apiLogin(email, password) {
  return apiRequest('auth.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

async function apiLogout() {
  return apiRequest('auth.php?action=logout', { method: 'POST' });
}

// Returns the user object or null (does NOT redirect on 401).
async function apiMe() {
  try {
    const resp = await fetch(`${API_BASE}/auth.php?action=me`, { credentials: 'include' });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.authenticated ? data.user : null;
  } catch (e) {
    return null;
  }
}

async function apiChangePassword(currentPassword, newPassword) {
  return apiRequest('auth.php?action=change_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

// ---- Admin: users ----
async function apiListUsers() {
  return apiRequest('users.php');
}
async function apiCreateUser(payload) {
  return apiRequest('users.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
async function apiUpdateUser(id, payload) {
  return apiRequest(`users.php?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
async function apiResetUserPassword(id, password) {
  return apiRequest(`users.php?action=reset_password&id=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}
async function apiDeactivateUser(id) {
  return apiRequest(`users.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---- Jobs ----
async function apiListJobs() {
  return apiRequest('jobs.php');
}
async function apiGetJob(id) {
  return apiRequest(`jobs.php?id=${encodeURIComponent(id)}`);
}
async function apiSaveJob(jobPayload) {
  return apiRequest('jobs.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobPayload),
  });
}
async function apiDeleteJob(id) {
  return apiRequest(`jobs.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}
async function apiHealthCheck() {
  return apiRequest('health.php');
}

// ---- GoHighLevel ----
async function apiGhlStatus() {
  return apiRequest('ghl.php?action=status');
}
async function apiSyncJobToGhl(jobPayload, options = {}) {
  const dryRun = options && options.dryRun ? '&dry_run=1' : '';
  const forceSync = !!(options && options.forceSync);
  return apiRequest(`ghl.php?action=sync_job${dryRun}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: jobPayload && jobPayload.id ? jobPayload.id : undefined,
      job: jobPayload,
      dryRun: !!(options && options.dryRun),
      forceSync,
    }),
  });
}

// Expose a namespaced API object. Pages call either the bare globals (admin.html)
// or via API.* (app.js, job_form.js); both must work, so publish both.
window.API = {
  apiLogin, apiLogout, apiMe, apiChangePassword,
  apiListUsers, apiCreateUser, apiUpdateUser, apiResetUserPassword, apiDeactivateUser,
  apiListJobs, apiGetJob, apiSaveJob, apiDeleteJob, apiHealthCheck,
  apiGhlStatus, apiSyncJobToGhl,
};
