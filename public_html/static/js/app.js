/*
 * Main script for the index page.
 * Handles listing of saved jobs, creation of new jobs, and deletion.
 */

// Number formatting function with comma separation
window.formatNumber = function(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  const parts = Number(num).toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Safe parser for numbers that may include commas or currency symbols
window.parseNumber = function(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

// Retrieve jobs from localStorage (offline cache)
function loadJobs() {
  const raw = localStorage.getItem('jobs');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse jobs from localStorage', e);
    return [];
  }
}

// Save jobs array back to localStorage (offline cache)
function saveJobs(jobs) {
  localStorage.setItem('jobs', JSON.stringify(jobs));
}

function safeText(value) {
  return value == null ? '' : String(value);
}

function parseDateOnly(value) {
  if (!value) return null;
  const parts = safeText(value).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDateOnly(value, options) {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString('en-US', options) : '';
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'disabled' && value) node.setAttribute('disabled', '');
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  children.forEach((child) => {
    if (child == null) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

function setStatusBadge(kind, iconClass, text) {
  const statusBadge = document.getElementById('syncStatus');
  if (!statusBadge) return;
  statusBadge.className = `status-badge ${kind}`;
  statusBadge.replaceChildren(el('i', { class: `bi ${iconClass}` }), text);
}

// Navigate to create a new job
function createNew() {
  // Clear potential unsaved ID in sessionStorage
  window.location.href = 'job_form.html';
}

// Navigate to edit an existing job by id
function editJob(id) {
  window.location.href = `job_form.html?id=${id}`;
}

// Delete job with confirmation
async function deleteJob(id) {
  if (!confirm('Are you sure you want to delete this job?')) return;
  const removeLocalJob = () => {
    let jobs = loadJobs();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx >= 0) {
      jobs.splice(idx, 1);
      saveJobs(jobs);
    }
  };
  try {
    if (window.API && typeof API.apiDeleteJob === 'function') {
      await API.apiDeleteJob(id);
    }
    removeLocalJob();
    renderJobs(searchTerm);
  } catch (err) {
    const message = safeText(err && err.message);
    const deleteLocalOnly = confirm(
      'The server delete did not finish. Remove this job from this browser anyway?\n\n'
      + 'If the job still exists in the database, it may show up again after sync.'
      + (message ? `\n\nServer message: ${message}` : '')
    );
    if (!deleteLocalOnly) return;
    removeLocalJob();
    renderJobs(searchTerm);
  }
}

// Handle search input
function handleSearch(value) {
  searchTerm = value;
  renderJobs(searchTerm);
}

// Format date range for display
function formatDateRange(job) {
  if (job.startDate && job.endDate && job.startDate !== job.endDate) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${formatDateOnly(job.startDate, options)} - ${formatDateOnly(job.endDate, options)}`;
  } else if (job.startDate) {
    return formatDateOnly(job.startDate, { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (job.date) {
    return formatDateOnly(job.date, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return '';
}

// Global search term
let searchTerm = '';
let clientSortMode = 'jobs_desc';
let currentUser = null;
let calendarViewMode = 'month';
let calendarCursorDate = new Date();
let calendarCustomStart = '';
let calendarCustomEnd = '';

function getJobRevenue(job) {
  const price = parseNumber(job.price);
  if (price > 0) return price;
  const grandTotal = parseNumber(job.grandTotal);
  const salesTax = parseNumber(job.totalSalesTax || job.total_sales_tax);
  return grandTotal > 0 ? Math.max(0, grandTotal - salesTax) : 0;
}

function getJobMargin(cost, revenue) {
  return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
}

function normalizeClientName(value) {
  const name = safeText(value).trim();
  return name || 'Unassigned Client';
}

function latestJobDateValue(job) {
  const date = parseDateOnly(job.updatedAt || job.updated_at || job.endDate || job.startDate || job.date);
  return date ? date.getTime() : 0;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addYears(date, years) {
  return new Date(date.getFullYear() + years, 0, 1);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getJobStart(job) {
  return parseDateOnly(job.startDate || job.date);
}

function getJobEnd(job) {
  const start = getJobStart(job);
  const end = parseDateOnly(job.endDate || job.startDate || job.date);
  if (!start) return end;
  if (!end || end < start) return start;
  return end;
}

function jobOverlapsRange(job, rangeStart, rangeEnd) {
  const start = getJobStart(job);
  const end = getJobEnd(job);
  return !!(start && end && start <= rangeEnd && end >= rangeStart);
}

function getCalendarRange() {
  const cursor = startOfDay(calendarCursorDate);
  if (calendarViewMode === 'year') {
    return {
      start: new Date(cursor.getFullYear(), 0, 1),
      end: new Date(cursor.getFullYear(), 11, 31),
      title: String(cursor.getFullYear()),
    };
  }
  if (calendarViewMode === 'custom') {
    const start = parseDateOnly(calendarCustomStart) || startOfDay(new Date());
    const end = parseDateOnly(calendarCustomEnd) || addDays(start, 30);
    return {
      start: end < start ? end : start,
      end: end < start ? start : end,
      title: `${formatDateOnly(end < start ? end : start, { month: 'short', day: 'numeric', year: 'numeric' })} - ${formatDateOnly(end < start ? start : end, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  return {
    start,
    end,
    title: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

function getJobScheduleStatus(job, today = startOfDay(new Date())) {
  const start = getJobStart(job);
  const end = getJobEnd(job);
  if (!start || !end) return 'unscheduled';
  if (start <= today && end >= today) return 'active';
  if (start > today && start <= addDays(today, 14)) return 'soon';
  if (start > today) return 'scheduled';
  return 'completed';
}

function getScheduleStats(jobs, range) {
  const today = startOfDay(new Date());
  return jobs.reduce((stats, job) => {
    const status = getJobScheduleStatus(job, today);
    if (status === 'active') stats.active += 1;
    if (status === 'soon') stats.soon += 1;
    if (status === 'unscheduled') stats.unscheduled += 1;
    if (jobOverlapsRange(job, range.start, range.end)) {
      stats.inRange += 1;
      stats.rangeRevenue += getJobRevenue(job);
      stats.rangeProfit += parseNumber(job.netProfit) || (getJobRevenue(job) - parseNumber(job.totalCost));
    }
    return stats;
  }, { active: 0, soon: 0, unscheduled: 0, inRange: 0, rangeRevenue: 0, rangeProfit: 0 });
}

function buildOperationsStats(jobs) {
  const totals = {
    jobs: jobs.length,
    clients: 0,
    cost: 0,
    revenue: 0,
    profit: 0,
  };
  const clientMap = new Map();
  const typeMap = new Map();

  jobs.forEach((job) => {
    const cost = parseNumber(job.totalCost);
    const revenue = getJobRevenue(job);
    const profit = parseNumber(job.netProfit) || (revenue - cost);
    const clientName = normalizeClientName(job.companyName);
    const typeName = safeText(job.jobType || 'Other') || 'Other';
    const latest = latestJobDateValue(job);

    totals.cost += cost;
    totals.revenue += revenue;
    totals.profit += profit;

    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        name: clientName,
        jobs: [],
        count: 0,
        cost: 0,
        revenue: 0,
        profit: 0,
        latest: 0,
        types: new Map(),
      });
    }
    const client = clientMap.get(clientName);
    client.jobs.push(job);
    client.count += 1;
    client.cost += cost;
    client.revenue += revenue;
    client.profit += profit;
    client.latest = Math.max(client.latest, latest);
    client.types.set(typeName, (client.types.get(typeName) || 0) + 1);

    if (!typeMap.has(typeName)) {
      typeMap.set(typeName, { name: typeName, count: 0, cost: 0, revenue: 0, profit: 0 });
    }
    const type = typeMap.get(typeName);
    type.count += 1;
    type.cost += cost;
    type.revenue += revenue;
    type.profit += profit;
  });

  const clients = Array.from(clientMap.values()).map((client) => ({
    ...client,
    margin: getJobMargin(client.cost, client.revenue),
    types: Array.from(client.types.entries()).map(([name, count]) => ({ name, count })),
    jobs: client.jobs.slice().sort((a, b) => latestJobDateValue(b) - latestJobDateValue(a)),
  }));
  const types = Array.from(typeMap.values()).map((type) => ({
    ...type,
    margin: getJobMargin(type.cost, type.revenue),
  })).sort((a, b) => b.profit - a.profit);
  totals.clients = clients.length;
  totals.margin = getJobMargin(totals.cost, totals.revenue);

  return { totals, clients, types };
}

function sortClientStats(clients) {
  const sorted = clients.slice();
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (clientSortMode === 'profit_desc') sorted.sort((a, b) => b.profit - a.profit || byName(a, b));
  else if (clientSortMode === 'revenue_desc') sorted.sort((a, b) => b.revenue - a.revenue || byName(a, b));
  else if (clientSortMode === 'margin_desc') sorted.sort((a, b) => b.margin - a.margin || byName(a, b));
  else if (clientSortMode === 'recent_desc') sorted.sort((a, b) => b.latest - a.latest || byName(a, b));
  else if (clientSortMode === 'name_asc') sorted.sort(byName);
  else sorted.sort((a, b) => b.count - a.count || b.profit - a.profit || byName(a, b));
  return sorted;
}

function renderOperationsSummary(totals) {
  const container = document.getElementById('operationsSummary');
  if (!container) return;
  const items = [
    { label: 'Total Jobs', value: formatNumber(totals.jobs, 0), icon: 'bi-briefcase', tone: 'neutral' },
    { label: 'Clients', value: formatNumber(totals.clients, 0), icon: 'bi-buildings', tone: 'teal' },
    { label: 'Total Quoted', value: `$${formatNumber(totals.revenue)}`, icon: 'bi-receipt', tone: 'blue' },
    { label: 'True Cost', value: `$${formatNumber(totals.cost)}`, icon: 'bi-tools', tone: 'amber' },
    { label: 'Net Profit', value: `$${formatNumber(totals.profit)}`, icon: 'bi-graph-up-arrow', tone: 'green' },
    { label: 'Margin', value: `${totals.margin.toFixed(1)}%`, icon: 'bi-percent', tone: 'ink' },
  ];
  container.replaceChildren(el('div', { class: 'ops-kpi-grid' }, items.map((item) => (
    el('div', { class: `ops-kpi tone-${item.tone}` }, [
      el('i', { class: `bi ${item.icon}` }),
      el('span', { text: item.label }),
      el('strong', { text: item.value }),
    ])
  ))));
}

function newJobForClient(clientName) {
  window.location.href = `job_form.html?client=${encodeURIComponent(clientName)}`;
}

function renderClientProfiles(clients) {
  const container = document.getElementById('clientProfiles');
  if (!container) return;
  if (!clients.length) {
    container.replaceChildren(el('p', { class: 'text-muted mb-0', text: 'No client profiles yet. Saved jobs will appear here grouped by client.' }));
    return;
  }
  const cards = sortClientStats(clients).map((client) => {
    const jobLinks = client.jobs.slice(0, 5).map((job) => el('button', {
      class: 'client-job-row',
      onclick: () => editJob(job.id),
      title: 'Open job',
    }, [
      el('span', { text: safeText(job.jobName || 'Untitled Job') }),
      el('small', { text: `${safeText(job.jobType || 'Other')} - $${formatNumber(getJobRevenue(job))}` }),
    ]));
    const typeChips = client.types.slice(0, 4).map((type) => el('span', { class: 'client-type-chip', text: `${type.name} ${type.count}` }));
    return el('article', { class: 'client-profile-card' }, [
      el('div', { class: 'client-profile-head' }, [
        el('div', {}, [
          el('h4', { text: client.name }),
          el('p', { text: `${client.count} job${client.count === 1 ? '' : 's'} saved` }),
        ]),
        el('button', { class: 'modern-btn ghost icon-only', title: 'New job for client', onclick: () => newJobForClient(client.name) }, [
          el('i', { class: 'bi bi-plus-lg' }),
        ]),
      ]),
      el('div', { class: 'client-profile-numbers' }, [
        el('div', {}, [el('span', { text: 'Quoted' }), el('strong', { text: `$${formatNumber(client.revenue)}` })]),
        el('div', {}, [el('span', { text: 'Cost' }), el('strong', { text: `$${formatNumber(client.cost)}` })]),
        el('div', {}, [el('span', { text: 'Profit' }), el('strong', { text: `$${formatNumber(client.profit)}` })]),
        el('div', {}, [el('span', { text: 'Margin' }), el('strong', { text: `${client.margin.toFixed(1)}%` })]),
      ]),
      el('div', { class: 'client-type-list' }, typeChips),
      el('div', { class: 'client-job-list' }, jobLinks),
    ]);
  });
  container.replaceChildren(el('div', { class: 'client-profile-grid' }, cards));
}

function renderJobTypeSummary(types) {
  const container = document.getElementById('jobTypeSummary');
  if (!container) return;
  if (!types.length) {
    container.replaceChildren(el('p', { class: 'text-muted mb-0', text: 'Job type totals will appear after jobs are saved.' }));
    return;
  }
  const rows = types.map((type) => el('div', { class: 'job-type-row' }, [
    el('div', {}, [
      el('strong', { text: type.name }),
      el('span', { text: `${type.count} job${type.count === 1 ? '' : 's'}` }),
    ]),
    el('div', { class: 'job-type-money' }, [
      el('strong', { text: `$${formatNumber(type.profit)}` }),
      el('span', { text: `${type.margin.toFixed(1)}% margin` }),
    ]),
  ]));
  container.replaceChildren(el('div', { class: 'job-type-list' }, rows));
}

function renderPermissionTools(user) {
  const container = document.getElementById('permissionTools');
  if (!container) return;
  const isAdmin = user && user.role === 'admin';
  container.replaceChildren(el('div', { class: `permission-card ${isAdmin ? 'admin' : 'user'}` }, [
    el('div', { class: 'permission-icon' }, [
      el('i', { class: `bi ${isAdmin ? 'bi-shield-check' : 'bi-person-check'}` }),
    ]),
    el('div', { class: 'permission-copy' }, [
      el('strong', { text: isAdmin ? 'Admin Dashboard' : 'User Dashboard' }),
      el('span', { text: isAdmin ? 'Shared job visibility, user management, schedule exports, and all dashboard tools.' : 'Shared server jobs are visible to every signed-in user. Use Publish Device Jobs once on a phone that still has local-only work.' }),
    ]),
    el('div', { class: 'permission-actions' }, [
      el('button', { class: 'modern-btn ghost', onclick: openCalendarOverlay }, [
        el('i', { class: 'bi bi-calendar-week' }),
        'Open Calendar',
      ]),
      el('button', { class: 'modern-btn ghost', onclick: exportScheduleCSV }, [
        el('i', { class: 'bi bi-file-earmark-spreadsheet' }),
        'Export Schedule',
      ]),
      el('button', { class: 'modern-btn ghost', onclick: publishLocalJobsToServer }, [
        el('i', { class: 'bi bi-cloud-arrow-up' }),
        'Publish Device Jobs',
      ]),
      isAdmin ? el('a', { class: 'modern-btn primary', href: 'admin.html' }, [
        el('i', { class: 'bi bi-people' }),
        'Manage Users',
      ]) : null,
    ]),
  ]));
}

function renderScheduleSummary(jobs, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  const range = getCalendarRange();
  const stats = getScheduleStats(jobs, range);
  const cards = [
    { label: 'Calendar Range', value: range.title, icon: 'bi-calendar-range' },
    { label: 'Jobs In Range', value: formatNumber(stats.inRange, 0), icon: 'bi-clipboard-check' },
    { label: 'Active Today', value: formatNumber(stats.active, 0), icon: 'bi-lightning-charge' },
    { label: 'Starting Soon', value: formatNumber(stats.soon, 0), icon: 'bi-alarm' },
    { label: 'Needs Dates', value: formatNumber(stats.unscheduled, 0), icon: 'bi-exclamation-triangle' },
    { label: 'Range Profit', value: `$${formatNumber(stats.rangeProfit)}`, icon: 'bi-graph-up' },
  ];
  container.replaceChildren(...cards.map((card) => el('div', { class: 'schedule-kpi' }, [
    el('i', { class: `bi ${card.icon}` }),
    el('span', { text: card.label }),
    el('strong', { text: card.value }),
  ])));
}

function renderJobBoard(jobs, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  const lanes = [
    { key: 'active', title: 'Active Now', icon: 'bi-play-circle' },
    { key: 'soon', title: 'Starts Next 14 Days', icon: 'bi-alarm' },
    { key: 'scheduled', title: 'Scheduled Later', icon: 'bi-calendar-event' },
    { key: 'completed', title: 'Completed', icon: 'bi-check-circle' },
    { key: 'unscheduled', title: 'Needs Dates', icon: 'bi-exclamation-circle' },
  ];
  const grouped = Object.fromEntries(lanes.map((lane) => [lane.key, []]));
  const today = startOfDay(new Date());
  jobs.forEach((job) => grouped[getJobScheduleStatus(job, today)].push(job));
  Object.values(grouped).forEach((list) => list.sort((a, b) => (getJobStart(a)?.getTime() || Infinity) - (getJobStart(b)?.getTime() || Infinity)));

  container.replaceChildren(...lanes.map((lane) => el('section', { class: `job-lane lane-${lane.key}` }, [
    el('div', { class: 'job-lane-head' }, [
      el('span', {}, [el('i', { class: `bi ${lane.icon}` }), lane.title]),
      el('strong', { text: formatNumber(grouped[lane.key].length, 0) }),
    ]),
    el('div', { class: 'job-lane-list' }, grouped[lane.key].slice(0, 8).map((job) => renderScheduleJobCard(job)).concat(
      grouped[lane.key].length > 8 ? [el('div', { class: 'lane-more', text: `+${grouped[lane.key].length - 8} more` })] : []
    )),
  ])));
}

function renderScheduleJobCard(job) {
  const revenue = getJobRevenue(job);
  const profit = parseNumber(job.netProfit) || (revenue - parseNumber(job.totalCost));
  const id = safeText(job.id);
  const status = getJobScheduleStatus(job);
  return el('button', { class: 'schedule-job-card', disabled: !id, onclick: () => editJob(id), title: 'Open job' }, [
    el('span', { class: `schedule-status-dot status-${status}` }),
    el('strong', { text: safeText(job.jobName || 'Untitled Job') }),
    el('span', { text: normalizeClientName(job.companyName) }),
    el('small', { text: `${safeText(job.jobType || 'Other')} | ${formatDateRange(job) || 'No dates'}` }),
    el('em', { text: `$${formatNumber(revenue)} quoted | $${formatNumber(profit)} profit` }),
  ]);
}

function renderCalendarSurface(jobs, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  const range = getCalendarRange();
  if (calendarViewMode === 'year') {
    renderYearCalendar(jobs, container, range);
  } else if (calendarViewMode === 'custom') {
    renderTimelineCalendar(jobs, container, range);
  } else {
    renderMonthCalendar(jobs, container, range);
  }
}

function renderMonthCalendar(jobs, container, range) {
  const gridStart = addDays(range.start, -range.start.getDay());
  const gridEnd = addDays(range.end, 6 - range.end.getDay());
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));
  const todayKey = toDateInputValue(new Date());
  container.replaceChildren(el('div', { class: 'calendar-title-row' }, [
    el('h3', { text: range.title }),
    el('span', { text: `${formatNumber(jobs.filter((job) => jobOverlapsRange(job, range.start, range.end)).length, 0)} scheduled job(s)` }),
  ]), el('div', { class: 'month-calendar-grid' }, [
    ...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => el('div', { class: 'calendar-weekday', text: day })),
    ...days.map((day) => {
      const dayJobs = jobs.filter((job) => {
        const start = getJobStart(job);
        const end = getJobEnd(job);
        return start && end && start <= day && end >= day;
      });
      const isMuted = day < range.start || day > range.end;
      return el('div', { class: `calendar-day ${isMuted ? 'muted' : ''} ${toDateInputValue(day) === todayKey ? 'today' : ''}` }, [
        el('div', { class: 'calendar-day-number', text: String(day.getDate()) }),
        ...dayJobs.slice(0, 3).map((job) => el('button', { class: `calendar-job-chip type-${safeText(job.jobType || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, onclick: () => editJob(job.id), title: safeText(job.jobName) }, [
          safeText(job.jobName || 'Untitled'),
        ])),
        dayJobs.length > 3 ? el('div', { class: 'calendar-more', text: `+${dayJobs.length - 3} more` }) : null,
      ]);
    }),
  ]));
}

function renderYearCalendar(jobs, container, range) {
  const months = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(range.start.getFullYear(), index, 1);
    const end = new Date(range.start.getFullYear(), index + 1, 0);
    const monthJobs = jobs.filter((job) => jobOverlapsRange(job, start, end));
    const profit = monthJobs.reduce((sum, job) => sum + (parseNumber(job.netProfit) || (getJobRevenue(job) - parseNumber(job.totalCost))), 0);
    return el('button', { class: 'year-month-card', onclick: () => { calendarCursorDate = start; handleCalendarView('month'); } }, [
      el('strong', { text: start.toLocaleDateString('en-US', { month: 'long' }) }),
      el('span', { text: `${monthJobs.length} job${monthJobs.length === 1 ? '' : 's'}` }),
      el('em', { text: `$${formatNumber(profit)} profit` }),
    ]);
  });
  container.replaceChildren(el('div', { class: 'calendar-title-row' }, [
    el('h3', { text: range.title }),
    el('span', { text: 'Click a month to drill in' }),
  ]), el('div', { class: 'year-calendar-grid' }, months));
}

function renderTimelineCalendar(jobs, container, range) {
  const rangeDays = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
  const scheduled = jobs
    .filter((job) => jobOverlapsRange(job, range.start, range.end))
    .sort((a, b) => (getJobStart(a)?.getTime() || 0) - (getJobStart(b)?.getTime() || 0));
  const rows = scheduled.map((job) => {
    const start = getJobStart(job);
    const end = getJobEnd(job);
    const offset = Math.max(0, Math.round((start - range.start) / 86400000));
    const duration = Math.max(1, Math.round((Math.min(end, range.end) - Math.max(start, range.start)) / 86400000) + 1);
    return el('button', { class: 'timeline-row', onclick: () => editJob(job.id) }, [
      el('div', { class: 'timeline-job-copy' }, [
        el('strong', { text: safeText(job.jobName || 'Untitled Job') }),
        el('span', { text: `${normalizeClientName(job.companyName)} | ${formatDateRange(job)}` }),
      ]),
      el('div', { class: 'timeline-track' }, [
        el('div', { class: 'timeline-bar', style: `left:${(offset / rangeDays) * 100}%;width:${Math.max(2, (duration / rangeDays) * 100)}%;` }, [
          el('span', { text: safeText(job.jobType || 'Job') }),
        ]),
      ]),
    ]);
  });
  container.replaceChildren(el('div', { class: 'calendar-title-row' }, [
    el('h3', { text: range.title }),
    el('span', { text: `${scheduled.length} scheduled job(s)` }),
  ]), rows.length ? el('div', { class: 'timeline-calendar' }, rows) : el('div', { class: 'empty-state compact' }, [
    el('div', { class: 'empty-state-title', text: 'No jobs in this custom range' }),
    el('p', { class: 'empty-state-text', text: 'Change the dates or add job start/end dates.' }),
  ]));
}

function setCalendarControlState() {
  ['Month', 'Year', 'Custom'].forEach((label) => {
    const key = label.toLowerCase();
    const inline = document.getElementById(`calendarMode${label}`);
    const overlay = document.getElementById(`overlayMode${label}`);
    if (inline) inline.classList.toggle('active', calendarViewMode === key);
    if (overlay) overlay.classList.toggle('active', calendarViewMode === key);
  });
  const rangeVisible = calendarViewMode === 'custom';
  ['calendarRangeInputs', 'overlayRangeInputs'].forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.style.display = rangeVisible ? 'flex' : 'none';
  });
  [['calendarCustomStart', calendarCustomStart], ['calendarCustomEnd', calendarCustomEnd], ['overlayCustomStart', calendarCustomStart], ['overlayCustomEnd', calendarCustomEnd]]
    .forEach(([id, value]) => { const input = document.getElementById(id); if (input) input.value = value; });
}

function renderScheduleDashboard(jobs = loadJobs()) {
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  setCalendarControlState();
  renderScheduleSummary(safeJobs, 'scheduleSummary');
  renderJobBoard(safeJobs, 'jobBoard');
  renderCalendarSurface(safeJobs, 'jobCalendar');
  if (document.getElementById('calendarOverlay')?.classList.contains('open')) {
    renderScheduleSummary(safeJobs, 'overlayScheduleSummary');
    renderJobBoard(safeJobs, 'overlayJobBoard');
    renderCalendarSurface(safeJobs, 'overlayJobCalendar');
  }
}

function handleCalendarView(value) {
  calendarViewMode = value || 'month';
  if (calendarViewMode === 'custom' && (!calendarCustomStart || !calendarCustomEnd)) {
    const range = getCalendarRange();
    calendarCustomStart = toDateInputValue(range.start);
    calendarCustomEnd = toDateInputValue(range.end);
  }
  renderScheduleDashboard();
}

function handleCustomCalendarRange(fromOverlay = false) {
  const startEl = document.getElementById(fromOverlay ? 'overlayCustomStart' : 'calendarCustomStart');
  const endEl = document.getElementById(fromOverlay ? 'overlayCustomEnd' : 'calendarCustomEnd');
  calendarCustomStart = startEl ? startEl.value : calendarCustomStart;
  calendarCustomEnd = endEl ? endEl.value : calendarCustomEnd;
  calendarViewMode = 'custom';
  renderScheduleDashboard();
}

function shiftCalendarRange(direction) {
  if (calendarViewMode === 'year') calendarCursorDate = addYears(calendarCursorDate, direction);
  else if (calendarViewMode === 'custom') {
    const range = getCalendarRange();
    const days = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
    calendarCustomStart = toDateInputValue(addDays(range.start, direction * days));
    calendarCustomEnd = toDateInputValue(addDays(range.end, direction * days));
    calendarCursorDate = parseDateOnly(calendarCustomStart) || calendarCursorDate;
  } else calendarCursorDate = addMonths(calendarCursorDate, direction);
  renderScheduleDashboard();
}

function jumpCalendarToday() {
  calendarCursorDate = new Date();
  if (calendarViewMode === 'custom') {
    calendarCustomStart = toDateInputValue(startOfDay(new Date()));
    calendarCustomEnd = toDateInputValue(addDays(startOfDay(new Date()), 30));
  }
  renderScheduleDashboard();
}

function openCalendarOverlay() {
  const overlay = document.getElementById('calendarOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('calendar-overlay-open');
  renderScheduleDashboard();
}

function closeCalendarOverlay() {
  const overlay = document.getElementById('calendarOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('calendar-overlay-open');
}

function exportScheduleCSV() {
  const rows = [['Job Name', 'Client', 'Type', 'Start Date', 'End Date', 'Status', 'Quoted', 'True Cost', 'Profit']];
  const today = startOfDay(new Date());
  loadJobs().forEach((job) => {
    rows.push([
      safeText(job.jobName),
      normalizeClientName(job.companyName),
      safeText(job.jobType || 'Other'),
      getJobStart(job) ? toDateInputValue(getJobStart(job)) : '',
      getJobEnd(job) ? toDateInputValue(getJobEnd(job)) : '',
      getJobScheduleStatus(job, today),
      getJobRevenue(job),
      parseNumber(job.totalCost),
      parseNumber(job.netProfit) || (getJobRevenue(job) - parseNumber(job.totalCost)),
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ugx_schedule_${toDateInputValue(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderOperationsDashboard(jobs = loadJobs()) {
  const stats = buildOperationsStats(Array.isArray(jobs) ? jobs : []);
  renderPermissionTools(currentUser);
  renderOperationsSummary(stats.totals);
  renderClientProfiles(stats.clients);
  renderJobTypeSummary(stats.types);
  renderScheduleDashboard(jobs);
}

function handleClientSort(value) {
  clientSortMode = value || 'jobs_desc';
  renderOperationsDashboard();
}
window.handleClientSort = handleClientSort;
window.handleCalendarView = handleCalendarView;
window.handleCustomCalendarRange = handleCustomCalendarRange;
window.shiftCalendarRange = shiftCalendarRange;
window.jumpCalendarToday = jumpCalendarToday;
window.openCalendarOverlay = openCalendarOverlay;
window.closeCalendarOverlay = closeCalendarOverlay;
window.exportScheduleCSV = exportScheduleCSV;

// Render the list of jobs on the page
function renderJobs(filter = '') {
  const container = document.getElementById('jobsList');
  let jobs = loadJobs();
  if (!container) return;
  renderOperationsDashboard(loadJobs());
  
  // Apply search filter
  if (filter) {
    const lowerFilter = filter.toLowerCase();
    jobs = jobs.filter(job =>
      [
        job.jobName,
        job.companyName,
        job.jobType,
        job.date,
        job.startDate,
        job.endDate,
      ].some((value) => safeText(value).toLowerCase().includes(lowerFilter))
    );
  }
  if (jobs.length === 0) {
    container.replaceChildren(el('div', { class: 'empty-state' }, [
      el('div', { class: 'empty-state-icon' }, [el('i', { class: 'bi bi-folder-x' })]),
      el('h3', { class: 'empty-state-title', text: 'No projects yet' }),
      el('p', { class: 'empty-state-text', text: 'Create your first project to start tracking profit and loss' }),
      el('button', { class: 'modern-btn primary', onclick: createNew }, [
        el('i', { class: 'bi bi-plus' }),
        'Create New Job',
      ]),
    ]));
    return;
  }

  const cards = jobs.map((job) => {
    const id = safeText(job.id);
    const price = getJobRevenue(job);
    const cost = parseNumber(job.totalCost);
    const profit = parseNumber(job.netProfit) || (price - cost);
    const pct = price > 0 ? ((price - cost) / price) * 100 : 0;
    const status = getJobScheduleStatus(job);
    return el('article', { class: `active-job-card status-${status}` }, [
      el('div', { class: 'active-job-main' }, [
        el('div', { class: 'active-job-meta' }, [
          el('span', { class: 'job-type-pill', text: safeText(job.jobType || 'Other') }),
          el('span', { text: formatDateRange(job) || 'No dates set' }),
        ]),
        el('h3', { text: safeText(job.jobName || 'Untitled Job') }),
        el('p', { text: normalizeClientName(job.companyName) }),
      ]),
      el('div', { class: 'active-job-metrics' }, [
        el('div', {}, [el('span', { text: 'Cost' }), el('strong', { text: `$${formatNumber(cost)}` })]),
        el('div', {}, [el('span', { text: 'Quoted' }), el('strong', { text: `$${formatNumber(price)}` })]),
        el('div', { class: profit >= 0 ? 'metric-profit' : 'metric-loss' }, [el('span', { text: 'Profit' }), el('strong', { text: `$${formatNumber(profit)}` })]),
        el('div', {}, [el('span', { text: 'Margin' }), el('strong', { text: `${pct.toFixed(1)}%` })]),
      ]),
      el('div', { class: 'active-job-actions' }, [
        el('button', { class: 'modern-btn ghost icon-only', title: 'Edit job', disabled: !id, onclick: () => editJob(id) }, [
          el('i', { class: 'bi bi-pencil' }),
        ]),
        el('button', { class: 'modern-btn ghost icon-only danger-action', title: 'Delete job', disabled: !id, onclick: () => deleteJob(id) }, [
          el('i', { class: 'bi bi-trash' }),
        ]),
      ]),
    ]);
  });
  container.replaceChildren(el('div', { class: 'active-job-list' }, cards));
}

// Sync from API and update offline cache
async function syncNow() {
  try {
    const health = await API.apiHealthCheck();
    if (health && health.status === 'ok') {
      setStatusBadge('info', 'bi-arrow-clockwise', 'Syncing...');
    }
    const result = await API.apiListJobs();
    if (result && result.success && Array.isArray(result.jobs)) {
      // Transform to local shape and merge with local
      const remoteJobs = result.jobs.map((j) => ({
        id: j.id,
        jobName: j.job_name,
        companyName: j.company_name,
        jobType: j.job_type,
        date: j.date || j.start_date,
        startDate: j.start_date || j.date,
        endDate: j.end_date || j.date,
        yearlyBreakdown: j.yearly_breakdown || {},
        totalCost: j.total_cost,
        price: j.price,
        netProfit: j.net_profit,
        grandTotal: j.grand_total,
        totalSalesTax: j.total_sales_tax,
        ghlContactId: j.ghl_contact_id || '',
        ghlOpportunityId: j.ghl_opportunity_id || '',
        ghlEstimateId: j.ghl_estimate_id || '',
        ghlLastSyncedAt: j.ghl_last_synced_at || '',
        ghlLastSyncError: j.ghl_last_sync_error || '',
        updatedAt: j.updated_at,
      }));
      const localJobs = loadJobs();
      const idToJob = new Map();
      localJobs.forEach((j) => idToJob.set(j.id, j));
      remoteJobs.forEach((rj) => idToJob.set(rj.id, { ...idToJob.get(rj.id), ...rj }));
      const merged = Array.from(idToJob.values());
      saveJobs(merged);
      setStatusBadge('success', 'bi-cloud-check', 'Synced');
      renderJobs(searchTerm);
    } else {
      throw new Error('Bad response');
    }
  } catch (e) {
    setStatusBadge('secondary', 'bi-wifi-off', 'Offline');
  }
}

// Push all jobs saved in this browser/device cache to the shared server.
// This is the recovery path for phone-created jobs that were saved locally only.
async function publishLocalJobsToServer() {
  const localJobs = loadJobs().filter((job) => job && job.id);
  if (!localJobs.length) {
    alert('No device-saved jobs were found in this browser.');
    return;
  }
  if (!window.API || typeof API.apiSaveJob !== 'function') {
    alert('The server API is not available right now.');
    return;
  }
  const ok = confirm(
    `Publish ${localJobs.length} job${localJobs.length === 1 ? '' : 's'} from this device to the shared server?\n\n`
    + 'This will not delete jobs from this device or remove jobs already on the server.'
  );
  if (!ok) return;

  setStatusBadge('info', 'bi-cloud-arrow-up', 'Publishing...');
  let saved = 0;
  const failed = [];
  for (const job of localJobs) {
    try {
      await API.apiSaveJob(job);
      saved += 1;
    } catch (err) {
      failed.push(job.jobName || job.id || 'Untitled job');
    }
  }

  if (failed.length) {
    setStatusBadge('warning', 'bi-exclamation-triangle', 'Partial publish');
    alert(`Published ${saved} job${saved === 1 ? '' : 's'}.\n\nCould not publish:\n${failed.join('\n')}`);
  } else {
    setStatusBadge('success', 'bi-cloud-check', 'Published');
    alert(`Published ${saved} job${saved === 1 ? '' : 's'} to the shared server.`);
  }
  await syncNow();
}

// Show the signed-in user, reveal the admin link for admins, wire logout.
function setupNav(user) {
  const userEl = document.getElementById('navUser');
  if (userEl && user) {
    userEl.textContent = user.name || user.email;
    userEl.style.display = '';
  }
  if (user && user.role === 'admin') {
    const adminLink = document.getElementById('navAdminLink');
    if (adminLink) adminLink.style.display = '';
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Require a logged-in user; Auth.requireAuth redirects to login if not.
  const user = window.Auth ? await Auth.requireAuth() : null;
  if (window.Auth && !user) return; // redirecting to login
  currentUser = user;
  setupNav(user);
  // Render local cache immediately, then sync from the server.
  renderJobs();
  syncNow();
});
