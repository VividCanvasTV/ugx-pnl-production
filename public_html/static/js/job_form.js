/*
 * Script for the job creation/editing page.
 * Provides dynamic addition/removal of materials, labor and other items,
 * performs cost calculations, persists data to localStorage, and handles
 * exporting to Excel and PDF formats.
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

// Helper functions to load and save jobs to localStorage
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

function saveJobs(jobs) {
  localStorage.setItem('jobs', JSON.stringify(jobs));
}

// Get query parameter from URL
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Generate unique ID for a new job
function generateId() {
  return 'job_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Notification System
let notificationContainer = null;

function showNotification(type, title, message, duration = 5000) {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };

  const icon = document.createElement('i');
  icon.className = `bi ${icons[type] || icons.info} notification-icon`;

  const content = document.createElement('div');
  content.className = 'notification-content';

  const titleEl = document.createElement('div');
  titleEl.className = 'notification-title';
  titleEl.textContent = title || '';
  content.appendChild(titleEl);

  if (message) {
    const messageEl = document.createElement('p');
    messageEl.className = 'notification-message';
    messageEl.textContent = String(message).replace(/<br\s*\/?>/gi, '\n');
    content.appendChild(messageEl);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'notification-close';
  closeButton.setAttribute('aria-label', 'Dismiss notification');
  closeButton.addEventListener('click', () => notification.remove());
  const closeIcon = document.createElement('i');
  closeIcon.className = 'bi bi-x';
  closeButton.appendChild(closeIcon);

  notification.appendChild(icon);
  notification.appendChild(content);
  notification.appendChild(closeButton);
  
  notificationContainer.appendChild(notification);
  
  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      notification.remove();
    }, duration);
  }
}

// Auto-save indicator
let autoSaveIndicator = null;

function showAutoSaveIndicator(status) {
  if (!autoSaveIndicator) {
    autoSaveIndicator = document.createElement('div');
    autoSaveIndicator.className = 'auto-save-indicator';
    autoSaveIndicator.innerHTML = `
      <i class="bi bi-arrow-repeat"></i>
      <span>Saving...</span>
    `;
    document.body.appendChild(autoSaveIndicator);
  }
  
  const icon = autoSaveIndicator.querySelector('i');
  const text = autoSaveIndicator.querySelector('span');
  
  if (status === 'saving') {
    autoSaveIndicator.className = 'auto-save-indicator visible saving';
    icon.className = 'bi bi-arrow-repeat';
    text.textContent = 'Saving...';
  } else if (status === 'saved') {
    autoSaveIndicator.className = 'auto-save-indicator visible saved';
    icon.className = 'bi bi-check-circle';
    text.textContent = 'Saved';
    setTimeout(() => {
      autoSaveIndicator.classList.remove('visible');
    }, 2000);
  }
}

// Global variables for current job and logo data
let currentJobId = null;
let logoDataUrl = null;
let currentJobType = 'Custom Home';
let yearlyBreakdown = {};
let measurementData = null;
window.markFormClean = window.markFormClean || function() {};

function normalizeMeasurementKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\u00b2/g, '2')
    .replace(/\u00b3/g, '3')
    .replace(/[^a-z0-9]/g, '');
}

function createMeasurementIndex(source) {
  const normalized = {};
  if (!source || typeof source !== 'object') return '';
  Object.keys(source).forEach((key) => {
    normalized[normalizeMeasurementKey(key)] = { key, value: source[key] };
  });
  return normalized;
}

function pickMeasurementPair(source, keys) {
  const normalized = createMeasurementIndex(source);
  for (const key of keys) {
    const pair = normalized[normalizeMeasurementKey(key)];
    if (pair && pair.value !== undefined && pair.value !== null && pair.value !== '') return pair;
  }
  return { key: '', value: '' };
}

function pickMeasurementValue(source, keys) {
  return pickMeasurementPair(source, keys).value;
}

function measurementNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const text = String(value);
  if (!/[0-9]/.test(text)) return NaN;
  const num = parseNumber(value);
  return Number.isFinite(num) ? num : NaN;
}

function flattenMeasurementRecord(entry) {
  const flat = {};
  const copyScalars = (source) => {
    if (!source || typeof source !== 'object') return;
    Object.keys(source).forEach((key) => {
      const value = source[key];
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object' && !Array.isArray(value)) return;
      flat[key] = value;
    });
  };

  copyScalars(entry);
  ['properties', 'attributes', 'fields', 'measurement', 'dimensions', 'takeoff', 'data'].forEach((key) => {
    if (entry && entry[key] && typeof entry[key] === 'object' && !Array.isArray(entry[key])) {
      copyScalars(entry[key]);
    }
  });

  if (entry && entry.geometry && typeof entry.geometry === 'object') {
    flat.geometryType = entry.geometry.type || flat.geometryType;
    if (entry.geometry.coordinates) flat.coordinates = entry.geometry.coordinates;
  }
  return flat;
}

function measurementUnitText(pair, explicitUnit = '') {
  return `${pair && pair.key ? pair.key : ''} ${pair && pair.value != null ? pair.value : ''} ${explicitUnit || ''}`.toLowerCase();
}

function measurementUnitKey(pair, explicitUnit = '') {
  return normalizeMeasurementKey(`${pair && pair.key ? pair.key : ''} ${explicitUnit || ''}`);
}

function valueLooksMetric(rawText, keyText) {
  return /meters?|metres?|\(m\)|\bm\b/.test(rawText)
    || keyText.endsWith('m')
    || keyText.includes('meters')
    || keyText.includes('metres');
}

function convertLinearMeasurement(value, pair = {}, explicitUnit = '') {
  const num = measurementNumber(value);
  if (!Number.isFinite(num)) return 0;
  const rawText = measurementUnitText(pair, explicitUnit);
  const keyText = measurementUnitKey(pair, explicitUnit);
  if (/millimeters?|\bmm\b/.test(rawText) || keyText.endsWith('mm')) return num / 304.8;
  if (/centimeters?|\bcm\b/.test(rawText) || keyText.endsWith('cm')) return num / 30.48;
  if (/inches?|\bin\b/.test(rawText) || keyText.endsWith('in') || keyText.includes('inches')) return num / 12;
  if (/yards?|\byd\b/.test(rawText) || keyText.endsWith('yd') || keyText.endsWith('yards')) return num * 3;
  if (valueLooksMetric(rawText, keyText)) return num * 3.280839895;
  return num;
}

function convertAreaMeasurement(value, pair = {}, explicitUnit = '') {
  const num = measurementNumber(value);
  if (!Number.isFinite(num)) return 0;
  const rawText = measurementUnitText(pair, explicitUnit);
  const keyText = measurementUnitKey(pair, explicitUnit);
  if (/square\s*meters?|sq\s*m|\bm2\b|sqm/.test(rawText) || keyText.includes('m2') || keyText.includes('sqm')) {
    return num * 10.76391041671;
  }
  if (/square\s*inches?|sq\s*in|\bin2\b/.test(rawText) || keyText.includes('in2')) return num / 144;
  if (/square\s*yards?|sq\s*yd|\byd2\b/.test(rawText) || keyText.includes('yd2') || keyText.includes('sqyd')) return num * 9;
  if (!/square\s*feet|sq\s*ft|\bft2\b|sqft|\bsf\b/.test(rawText) && valueLooksMetric(rawText, keyText)) {
    return num * 10.76391041671;
  }
  return num;
}

function convertVolumeMeasurement(value, pair = {}, explicitUnit = '') {
  const num = measurementNumber(value);
  if (!Number.isFinite(num)) return 0;
  const rawText = measurementUnitText(pair, explicitUnit);
  const keyText = measurementUnitKey(pair, explicitUnit);
  if (/cubic\s*meters?|\bm3\b/.test(rawText) || keyText.includes('m3')) return num * 1.307950619;
  if (/cubic\s*feet|\bft3\b|\bcf\b/.test(rawText) || keyText.includes('ft3') || keyText.includes('cubicfeet')) return num / 27;
  if (/cubic\s*inches|\bin3\b/.test(rawText) || keyText.includes('in3')) return num / 46656;
  return num;
}

function convertDepthMeasurement(pair = {}, explicitUnit = '') {
  const num = measurementNumber(pair.value);
  if (!Number.isFinite(num)) return { feet: 0, inches: 0 };
  const rawText = measurementUnitText(pair, explicitUnit);
  const keyText = measurementUnitKey(pair, explicitUnit);
  const looksLikeUnlabeledThickness = /thickness|slab|asphaltdepth|repairdepth|removedepth|filldepth/.test(keyText)
    && !/(feet|foot|\bft\b|meters?|metres?|\bm\b|yards?|\byd\b|inches?|\bin\b)/.test(rawText)
    && num > 0
    && num <= 36;
  if (/inches?|\bin\b/.test(rawText) || keyText.endsWith('in') || looksLikeUnlabeledThickness) {
    return { feet: num / 12, inches: num };
  }
  const feet = convertLinearMeasurement(pair.value, pair, explicitUnit);
  return { feet, inches: feet * 12 };
}

function getMeasurementPoints(record) {
  const raw = pickMeasurementValue(record, ['points', 'polygon', 'polyline', 'path', 'vertices', 'coordinates']);
  const parsePoint = (point) => {
    if (Array.isArray(point) && point.length >= 2) {
      const x = measurementNumber(point[0]);
      const y = measurementNumber(point[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
    if (point && typeof point === 'object') {
      const x = measurementNumber(point.x != null ? point.x : point.lng != null ? point.lng : point.lon);
      const y = measurementNumber(point.y != null ? point.y : point.lat);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
    return null;
  };
  const normalizeArray = (value) => {
    if (!Array.isArray(value)) return [];
    if (value.length && Array.isArray(value[0]) && value[0].length && Array.isArray(value[0][0])) {
      return normalizeArray(value[0]);
    }
    return value.map(parsePoint).filter(Boolean);
  };

  if (Array.isArray(raw)) return normalizeArray(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const text = raw.trim();
    if (/^\[/.test(text)) {
      try { return normalizeArray(JSON.parse(text)); } catch (e) {}
    }
    return text
      .split(/[;|]/)
      .map((part) => part.split(/[\s,]+/).filter(Boolean))
      .map(parsePoint)
      .filter(Boolean);
  }
  return [];
}

function scaleMeasurementPoints(points, unit) {
  const factor = convertLinearMeasurement(1, { key: 'unit', value: unit }, unit);
  return points.map((point) => ({ x: point.x * factor, y: point.y * factor }));
}

function polylineLength(points, closed = false) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  if (closed && points.length > 2) {
    total += Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
  }
  return total;
}

function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += (point.x * next.y) - (next.x * point.y);
  });
  return Math.abs(sum) / 2;
}

function extractMeasurementEntries(input) {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== 'object') return [];
  if (Array.isArray(input.features)) return input.features;
  const candidate = input.entries
    || input.measurements
    || input.items
    || input.surfaces
    || input.rooms
    || input.objects
    || input.takeoffs
    || input.results
    || input.data;
  return Array.isArray(candidate) ? candidate : [input];
}

function normalizeMeasurementEntry(entry, index = 0) {
  const record = flattenMeasurementRecord(entry || {});
  const rawName = pickMeasurementValue(record, ['name', 'label', 'title', 'room', 'room name', 'area name', 'surface', 'object', 'item', 'layer', 'description']);
  const name = rawName || `Measurement ${index + 1}`;
  const type = pickMeasurementValue(record, ['type', 'category', 'measurement type', 'surface type', 'trade', 'kind', 'class', 'classification', 'geometry type', 'layer']) || '';
  const unit = pickMeasurementValue(record, ['unit', 'units', 'measurement unit', 'measurement units', 'unit of measure', 'uom', 'coordinate unit']) || '';
  const lengthPair = pickMeasurementPair(record, ['length', 'length ft', 'length feet', 'length_ft', 'length_feet', 'length m', 'length_m', 'length in', 'length_in', 'lf', 'linear feet', 'linear ft', 'linear_feet', 'linear_ft', 'perimeter', 'perimeter ft', 'perimeter_ft', 'perimeter m', 'perimeter_m', 'total length', 'distance']);
  const widthPair = pickMeasurementPair(record, ['width', 'width ft', 'width feet', 'width_ft', 'width_feet', 'width m', 'width_m', 'width in', 'width_in', 'avg width', 'average width']);
  const depthPair = pickMeasurementPair(record, ['depth', 'depth ft', 'depth_ft', 'depth feet', 'depth in', 'depth_in', 'thickness', 'thickness in', 'thickness_in', 'thickness ft', 'height', 'height ft', 'height_m', 'fill depth', 'fill_depth', 'replacement depth', 'removal depth']);
  const areaPair = pickMeasurementPair(record, ['area', 'area sqft', 'area sq ft', 'area_sqft', 'area_sf', 'area ft2', 'area_ft2', 'area square feet', 'square feet', 'sq ft', 'sqft', 'sf', 'surface area', 'surface_area', 'area m2', 'area_m2', 'sqm', 'm2', 'square meters']);
  const volumePair = pickMeasurementPair(record, ['volume', 'volume cubic yards', 'volume_cy', 'cubic yards', 'cubic_yards', 'cy', 'yd3', 'volume yd3', 'volume_yd3', 'volume ft3', 'volume_ft3', 'cubic feet', 'cubic_feet', 'cf', 'ft3', 'volume m3', 'volume_m3', 'cubic meters', 'm3']);
  const points = scaleMeasurementPoints(getMeasurementPoints(record), unit);
  const geometryType = String(pickMeasurementValue(record, ['geometry type', 'geometryType']) || type || '').toLowerCase();
  const derivedArea = polygonArea(points);
  const derivedLength = polylineLength(points, geometryType.includes('polygon') || derivedArea > 0);
  const length = convertLinearMeasurement(lengthPair.value, lengthPair, unit) || derivedLength;
  const width = convertLinearMeasurement(widthPair.value, widthPair, unit);
  const depthResult = convertDepthMeasurement(depthPair, unit);
  const depth = depthResult.feet;
  const depthInches = depthResult.inches;
  const area = convertAreaMeasurement(areaPair.value, areaPair, unit)
    || (length && width ? length * width : 0)
    || derivedArea;
  const volume = convertVolumeMeasurement(volumePair.value, volumePair, unit)
    || (area && depth ? (area * depth) / 27 : 0);
  const hasMeasurementData = !!(rawName || type || length || width || depth || area || volume || points.length);
  return {
    name: String(name),
    type: String(type),
    length: Number.isFinite(length) ? length : 0,
    width: Number.isFinite(width) ? width : 0,
    depth: Number.isFinite(depth) ? depth : 0,
    depthInches: Number.isFinite(depthInches) ? depthInches : 0,
    area: Number.isFinite(area) ? area : 0,
    volume: Number.isFinite(volume) ? volume : 0,
    unit: String(unit),
    hasMeasurementData,
  };
}

function normalizeMeasurementData(input, sourceName = '') {
  const entries = extractMeasurementEntries(input);
  const normalizedEntries = entries
    .map((entry, index) => normalizeMeasurementEntry(entry, index))
    .filter((entry) => entry.hasMeasurementData)
    .map(({ hasMeasurementData, ...entry }) => entry);
  const source = input && typeof input === 'object' && input.sourceName ? input.sourceName : sourceName;
  return {
    sourceName: source || 'Imported measurement file',
    importedAt: new Date().toISOString(),
    entries: normalizedEntries,
  };
}

function measurementTotals(data = measurementData) {
  const entries = data && Array.isArray(data.entries) ? data.entries : [];
  return entries.reduce((totals, entry) => {
    const area = entry.area || (entry.length && entry.width ? entry.length * entry.width : 0);
    totals.area += area || 0;
    totals.length += entry.length || 0;
    totals.volume += entry.volume || 0;
    return totals;
  }, { area: 0, length: 0, volume: 0 });
}

function setMeasurementData(data) {
  measurementData = data && Array.isArray(data.entries) ? data : null;
  renderMeasurementSummary();
  updateMeasurementImportStatus(measurementData && measurementData.entries.length
    ? `${measurementData.entries.length} line${measurementData.entries.length === 1 ? '' : 's'} loaded from ${measurementData.sourceName || 'measurement file'}.`
    : 'Ready for JSON or CSV.',
    measurementData && measurementData.entries.length ? 'success' : 'idle');
}

function updateMeasurementImportStatus(message, state = 'idle') {
  const status = document.getElementById('measurementImportStatus');
  if (!status) return;
  status.textContent = message || 'Ready for JSON or CSV.';
  status.dataset.state = state;
}

function createMeasurementMetric(label, value, suffix) {
  const item = document.createElement('div');
  item.className = 'measurement-metric';
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  const valueEl = document.createElement('strong');
  valueEl.textContent = `${formatNumber(value)}${suffix ? ` ${suffix}` : ''}`;
  item.append(labelEl, valueEl);
  return item;
}

function renderMeasurementSummary() {
  const container = document.getElementById('measurementSummary');
  if (!container) return;
  if (!measurementData || !Array.isArray(measurementData.entries) || !measurementData.entries.length) {
    container.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'measurement-empty',
      textContent: 'No measurements imported.',
    }));
    return;
  }
  const totals = measurementTotals(measurementData);
  const head = document.createElement('div');
  head.className = 'measurement-metrics';
  head.append(
    createMeasurementMetric('Areas', totals.area, 'sq ft'),
    createMeasurementMetric('Lengths', totals.length, 'ft'),
    createMeasurementMetric('Volumes', totals.volume, 'cu yd'),
    createMeasurementMetric('Lines', measurementData.entries.length, '')
  );
  const list = document.createElement('div');
  list.className = 'measurement-list';
  measurementData.entries.slice(0, 8).forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'measurement-row';
    const name = document.createElement('strong');
    name.textContent = entry.name || entry.type || 'Measurement';
    const detail = document.createElement('span');
    const area = entry.area || (entry.length && entry.width ? entry.length * entry.width : 0);
	    const parts = [];
	    if (entry.type) parts.push(entry.type);
	    if (entry.length) parts.push(`${formatNumber(entry.length)} ft L`);
	    if (entry.width) parts.push(`${formatNumber(entry.width)} ft W`);
	    if (entry.depthInches) parts.push(`${formatNumber(entry.depthInches)} in D`);
	    if (area) parts.push(`${formatNumber(area)} sq ft`);
	    if (entry.volume) parts.push(`${formatNumber(entry.volume)} cu yd`);
	    detail.textContent = parts.join(' | ');
    row.append(name, detail);
    list.appendChild(row);
  });
  const meta = document.createElement('div');
  meta.className = 'measurement-meta';
  meta.textContent = measurementData.sourceName || 'Imported measurement file';
  container.replaceChildren(meta, head, list);
}

function importMeasurementText(text, sourceName = 'Imported measurement file') {
  const isJson = /\.json$/i.test(sourceName) || /^\s*[\[{]/.test(text);
  let parsed;
  if (isJson) {
    parsed = JSON.parse(text);
  } else {
    const rows = parseCSV(text);
    const headers = rows.shift() || [];
    parsed = rows.map((row) => headers.reduce((obj, header, index) => {
      obj[header || `column_${index + 1}`] = row[index];
      return obj;
    }, {}));
  }
  const normalized = normalizeMeasurementData(parsed, sourceName);
  setMeasurementData(normalized);
  if (normalized.entries.length) {
    showNotification('success', 'Measurements Imported', `${normalized.entries.length} measurement line${normalized.entries.length === 1 ? '' : 's'} loaded.`);
  } else {
    showNotification('warning', 'No Measurements Found', 'No usable measurement rows were found in that file.');
  }
  return normalized;
}

function readMeasurementFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        resolve(importMeasurementText(String(event.target.result || ''), file.name));
      } catch (err) {
        updateMeasurementImportStatus('Import failed. Check the file format and try again.', 'error');
        showNotification('error', 'Import Failed', 'Use JSON or CSV with measurement columns like name, type, length_ft, width_ft, depth_in, area_sqft, area_m2, or volume_cy.');
        reject(err);
      }
    };
    reader.onerror = () => {
      updateMeasurementImportStatus('Import failed. The file could not be read.', 'error');
      showNotification('error', 'Import Failed', 'The selected file could not be read.');
      reject(reader.error);
    };
    reader.readAsText(file);
  });
}

function handleMeasurementFileInput(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;
  updateMeasurementImportStatus(`Reading ${file.name}...`, 'loading');
  readMeasurementFile(file)
    .catch(() => {})
    .finally(() => {
      input.value = '';
    });
}

function importMeasurementFile() {
  const input = document.getElementById('measurementFileInput');
  if (input) {
    input.click();
    return;
  }
  const fallbackInput = document.createElement('input');
  fallbackInput.type = 'file';
  fallbackInput.accept = '.json,.csv,application/json,text/csv';
  fallbackInput.onchange = (event) => handleMeasurementFileInput(event.target);
  fallbackInput.click();
}

function downloadMeasurementTemplate() {
  const rows = [
    ['name', 'type', 'length_ft', 'width_ft', 'depth_in', 'area_sqft', 'volume_cy'],
    ['Patch A', 'asphalt patch', '10', '8', '3', '', ''],
    ['Crack Main', 'crack fill', '500', '', '0.5', '', ''],
    ['Driveway', 'pressure washing driveway', '', '', '', '1200', ''],
    ['Slab', 'concrete', '30', '20', '4', '', ''],
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'ugx_measurement_import_template.csv');
}

function clearMeasurements() {
  setMeasurementData(null);
  showNotification('info', 'Measurements Cleared', 'Measurement data removed from this job.');
}

function setCalculatorValue(id, value) {
  const el = document.getElementById(id);
  if (!el || value == null || value === '') return false;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function applyMeasurementsToCalculator() {
  if (!measurementData || !measurementData.entries || !measurementData.entries.length) {
    showNotification('warning', 'No Measurements', 'Import measurements first.');
    return;
  }
  const jobType = document.getElementById('jobType') ? document.getElementById('jobType').value : currentJobType;
  const calculatorTypes = ['Asphalt', 'Concrete', 'Dirt Moving', 'Custom Home', 'Pressure Washing'];
  if (!calculatorTypes.includes(jobType)) {
    showNotification('warning', 'No Calculator', 'Choose Asphalt, Concrete, Dirt Moving, Custom Home, or Pressure Washing before applying measurements.');
    return;
  }
  const calculatorContainer = document.getElementById('calculatorContainer');
  if (calculatorContainer && !calculatorContainer.childElementCount && typeof Calculators !== 'undefined' && typeof Calculators.renderCalculator === 'function') {
    Calculators.renderCalculator(jobType);
  }
  const entries = measurementData.entries;
  const totals = measurementTotals(measurementData);
  const firstArea = entries.find((entry) => entry.area || (entry.length && entry.width));
  const firstDepth = entries.find((entry) => entry.depth || entry.depthInches);
  let applied = 0;
  const applyLengthWidth = (lengthId, widthId, entry) => {
    const area = entry ? (entry.area || entry.length * entry.width) : totals.area;
    let length = entry ? entry.length : 0;
    let width = entry ? entry.width : 0;
    if ((!length || !width) && area) {
      length = Math.sqrt(area);
      width = Math.sqrt(area);
    }
    if (length) applied += setCalculatorValue(lengthId, Number(length.toFixed ? length.toFixed(2) : length)) ? 1 : 0;
    if (width) applied += setCalculatorValue(widthId, Number(width.toFixed ? width.toFixed(2) : width)) ? 1 : 0;
  };
  const typeIncludes = (entry, text) => `${entry.type} ${entry.name}`.toLowerCase().includes(text);

  if (jobType === 'Concrete') {
    applyLengthWidth('conLength', 'conWidth', firstArea);
    if (firstDepth && firstDepth.depthInches) applied += setCalculatorValue('conThickness', Number(firstDepth.depthInches.toFixed(2))) ? 1 : 0;
  } else if (jobType === 'Asphalt') {
    const patchEntries = entries.filter((entry) => typeIncludes(entry, 'patch'));
    const crackEntries = entries.filter((entry) => typeIncludes(entry, 'crack'));
    const crackLength = crackEntries.reduce((sum, entry) => sum + (entry.length || 0), 0);
    if (patchEntries.length) {
      const patch = patchEntries[0];
      applied += setCalculatorValue('aspRepairPatchCount', patchEntries.length) ? 1 : 0;
      applyLengthWidth('aspRepairPatchLength', 'aspRepairPatchWidth', patch);
      if (patch.depthInches) {
        applied += setCalculatorValue('aspRepairRemovalDepth', Number(patch.depthInches.toFixed(2))) ? 1 : 0;
        applied += setCalculatorValue('aspRepairReplacementDepth', Number(patch.depthInches.toFixed(2))) ? 1 : 0;
      }
    } else {
      applyLengthWidth('aspLength', 'aspWidth', firstArea);
      if (firstDepth && firstDepth.depthInches) applied += setCalculatorValue('aspThickness', Number(firstDepth.depthInches.toFixed(2))) ? 1 : 0;
    }
    if (crackLength) applied += setCalculatorValue('aspRepairCrackLength', Number(crackLength.toFixed(2))) ? 1 : 0;
    const crackWidth = crackEntries.find((entry) => entry.width);
    if (crackWidth && crackWidth.width) applied += setCalculatorValue('aspRepairCrackWidth', Number((crackWidth.width * 12).toFixed(2))) ? 1 : 0;
    const crackDepth = crackEntries.find((entry) => entry.depthInches);
    if (crackDepth && crackDepth.depthInches) applied += setCalculatorValue('aspRepairCrackDepth', Number(crackDepth.depthInches.toFixed(2))) ? 1 : 0;
  } else if (jobType === 'Pressure Washing') {
    const sumArea = (text) => entries
      .filter((entry) => typeIncludes(entry, text))
      .reduce((sum, entry) => sum + (entry.area || (entry.length && entry.width ? entry.length * entry.width : 0)), 0);
    const sumLength = (text) => entries
      .filter((entry) => typeIncludes(entry, text))
      .reduce((sum, entry) => sum + (entry.length || 0), 0);
    [
      ['pwHouseSqft', sumArea('house') || sumArea('siding')],
      ['pwStuccoSqft', sumArea('stucco')],
      ['pwDrivewaySqft', sumArea('driveway')],
      ['pwSidewalkSqft', sumArea('sidewalk')],
      ['pwDeckSqft', sumArea('deck') || sumArea('patio')],
      ['pwParkingLotSqft', sumArea('parking')],
      ['pwGraffitiSqft', sumArea('graffiti')],
      ['pwFenceLength', sumLength('fence')],
    ].forEach(([id, value]) => {
      if (value) applied += setCalculatorValue(id, Number(value.toFixed(2))) ? 1 : 0;
    });
    if (!applied && totals.area) applied += setCalculatorValue('pwDrivewaySqft', Number(totals.area.toFixed(2))) ? 1 : 0;
  } else if (jobType === 'Dirt Moving') {
    const earthwork = entries.find((entry) => entry.volume || entry.depth || typeIncludes(entry, 'excav'));
    applyLengthWidth('exLength', 'exWidth', earthwork || firstArea);
    if (earthwork && earthwork.depth) applied += setCalculatorValue('exDepth', Number(earthwork.depth.toFixed(2))) ? 1 : 0;
  } else if (jobType === 'Custom Home') {
    if (totals.area) applied += setCalculatorValue('homeSqft', Number(totals.area.toFixed(0))) ? 1 : 0;
  }

  if (applied) {
    if (typeof calculateTotals === 'function') calculateTotals();
    showNotification('success', 'Measurements Applied', 'Calculator fields were updated. Review the fields before adding line items.');
  } else {
    showNotification('warning', 'Nothing Applied', 'The imported measurements did not match the visible calculator fields.');
  }
}

window.importMeasurementFile = importMeasurementFile;
window.handleMeasurementFileInput = handleMeasurementFileInput;
window.downloadMeasurementTemplate = downloadMeasurementTemplate;
window.readMeasurementFile = readMeasurementFile;
window.importMeasurementText = importMeasurementText;
window.normalizeMeasurementData = normalizeMeasurementData;
window.clearMeasurements = clearMeasurements;
window.applyMeasurementsToCalculator = applyMeasurementsToCalculator;

function createInputCell(type, value, options = {}) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = type;
  input.className = 'form-control';
  input.value = value == null ? '' : String(value);
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.step) input.step = options.step;
  if (options.min != null) input.min = String(options.min);
  if (options.readonly) input.readOnly = true;
  td.appendChild(input);
  return td;
}

function createRemoveCell() {
  const td = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-sm btn-danger';
  button.textContent = 'Remove';
  button.addEventListener('click', () => removeRow(button));
  td.appendChild(button);
  return td;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDateInput(value) {
  if (!value) return null;
  const parts = String(value).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dateInputToUtc(value) {
  const parts = String(value || '').slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return NaN;
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateInput(value, options) {
  const date = parseDateInput(value);
  return date ? date.toLocaleDateString('en-US', options) : '';
}

function addDaysToDateInput(value, days) {
  const date = parseDateInput(value);
  if (!date) return '';
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeClientItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      description: String(item.description || item.name || '').trim(),
      amount: parseNumber(item.amount || item.price || item.total || 0) || 0,
    }))
    .filter((item) => item.description || item.amount > 0);
}

function getClientItemizationSubtotal(estimate = {}) {
  return normalizeClientItems(estimate.items || [])
    .reduce((sum, item) => sum + (parseNumber(item.amount) || 0), 0);
}

function getDefaultEstimateNumber(jobId) {
  const fallback = toDateInputValue(new Date()).replace(/-/g, '');
  const suffix = String(jobId || currentJobId || fallback).replace(/^job_/, '').slice(0, 8).toUpperCase();
  return `EST-${suffix || toDateInputValue(new Date()).replace(/-/g, '')}`;
}

function getClientEstimateDefaults(job = {}) {
  const today = toDateInputValue(new Date());
  return {
    clientName: job.companyName || '',
    clientEmail: '',
    clientPhone: '',
    projectAddress: '',
    estimateNumber: getDefaultEstimateNumber(job.id),
    estimateTitle: 'Project Estimate',
    estimateDate: today,
    validUntil: addDaysToDateInput(today, 30),
    scope: '',
    exclusions: '',
    terms: 'Payment due according to agreed project milestones. Changes outside this scope may require a written change order.',
    items: [],
    priceOverride: 0,
    depositPercent: 0,
    showTaxLine: true,
    showLogo: true,
    showSignature: true,
  };
}

function normalizeClientEstimate(input = {}, job = {}) {
  const defaults = getClientEstimateDefaults(job);
  return {
    clientName: input.clientName || defaults.clientName,
    clientEmail: input.clientEmail || '',
    clientPhone: input.clientPhone || '',
    projectAddress: input.projectAddress || '',
    estimateNumber: input.estimateNumber || defaults.estimateNumber,
    estimateTitle: input.estimateTitle || defaults.estimateTitle,
    estimateDate: input.estimateDate || defaults.estimateDate,
    validUntil: input.validUntil || defaults.validUntil,
    scope: input.scope || '',
    exclusions: input.exclusions || '',
    terms: input.terms || defaults.terms,
    items: normalizeClientItems(input.items || input.itemization || defaults.items),
    priceOverride: parseNumber(input.priceOverride) || 0,
    depositPercent: Math.min(100, Math.max(0, parseNumber(input.depositPercent) || 0)),
    showTaxLine: input.showTaxLine !== false,
    showLogo: input.showLogo !== false,
    showSignature: input.showSignature !== false,
  };
}

function getClientEstimateFromForm() {
  const read = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };
  const checked = (id, fallback = true) => {
    const el = document.getElementById(id);
    return el ? el.checked : fallback;
  };
  return normalizeClientEstimate({
    clientName: read('clientName').trim(),
    clientEmail: read('clientEmail').trim(),
    clientPhone: read('clientPhone').trim(),
    projectAddress: read('clientProjectAddress').trim(),
    estimateNumber: read('estimateNumber').trim(),
    estimateTitle: read('estimateTitle').trim(),
    estimateDate: read('estimateDate'),
    validUntil: read('estimateValidUntil'),
    scope: read('clientScope'),
    exclusions: read('clientExclusions'),
    terms: read('clientTerms'),
    items: getClientEstimateItemsFromForm(),
    priceOverride: parseNumber(read('clientPriceOverride')) || 0,
    depositPercent: parseNumber(read('clientDepositPercent')) || 0,
    showTaxLine: checked('clientShowTaxLine'),
    showLogo: checked('clientShowLogo'),
    showSignature: checked('clientShowSignature'),
  }, {
    id: currentJobId,
    companyName: document.getElementById('companyName') ? document.getElementById('companyName').value.trim() : '',
  });
}

function populateClientEstimate(job = {}) {
  const settings = job.settings || {};
  const estimate = normalizeClientEstimate(job.clientEstimate || settings.clientEstimate || {}, job);
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value == null ? '' : String(value);
  };
  const setChecked = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.checked = value !== false;
  };

  setValue('clientName', estimate.clientName);
  setValue('clientEmail', estimate.clientEmail);
  setValue('clientPhone', estimate.clientPhone);
  setValue('clientProjectAddress', estimate.projectAddress);
  setValue('estimateNumber', estimate.estimateNumber);
  setValue('estimateTitle', estimate.estimateTitle);
  setValue('estimateDate', estimate.estimateDate);
  setValue('estimateValidUntil', estimate.validUntil);
  setValue('clientScope', estimate.scope);
  populateClientEstimateItems(estimate.items);
  setValue('clientExclusions', estimate.exclusions);
  setValue('clientTerms', estimate.terms);
  setValue('clientPriceOverride', estimate.priceOverride > 0 ? estimate.priceOverride : '');
  setValue('clientDepositPercent', estimate.depositPercent);
  setChecked('clientShowTaxLine', estimate.showTaxLine);
  setChecked('clientShowLogo', estimate.showLogo);
  setChecked('clientShowSignature', estimate.showSignature);
  updateClientEstimatePreview();
}

function createClientEstimateItemRow(item = {}) {
  const tr = document.createElement('tr');

  const descTd = document.createElement('td');
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.className = 'form-control client-item-description';
  descInput.value = item.description || '';
  descInput.setAttribute('data-client-estimate-field', '');
  descTd.appendChild(descInput);

  const amountTd = document.createElement('td');
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.className = 'form-control client-item-amount';
  amountInput.min = '0';
  amountInput.step = '0.01';
  amountInput.value = item.amount > 0 ? String(item.amount) : '';
  amountInput.setAttribute('data-client-estimate-field', '');
  amountTd.appendChild(amountInput);

  const actionTd = document.createElement('td');
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn btn-outline-danger';
  removeButton.setAttribute('aria-label', 'Remove client item');
  const removeIcon = document.createElement('i');
  removeIcon.className = 'bi bi-trash';
  removeButton.appendChild(removeIcon);
  removeButton.addEventListener('click', () => {
    tr.remove();
    updateClientEstimatePreview();
  });
  actionTd.appendChild(removeButton);

  [descInput, amountInput].forEach((input) => {
    input.addEventListener('input', updateClientEstimatePreview);
  });

  tr.appendChild(descTd);
  tr.appendChild(amountTd);
  tr.appendChild(actionTd);
  return tr;
}

function addClientEstimateItem(item = {}) {
  const tbody = document.getElementById('clientItemsBody');
  if (!tbody) return null;
  const row = createClientEstimateItemRow(item);
  tbody.appendChild(row);
  updateClientEstimatePreview();
  return row;
}
window.addClientEstimateItem = addClientEstimateItem;

function getClientEstimateItemsFromForm() {
  return normalizeClientItems(Array.from(document.querySelectorAll('#clientItemsBody tr')).map((tr) => ({
    description: tr.querySelector('.client-item-description') ? tr.querySelector('.client-item-description').value : '',
    amount: tr.querySelector('.client-item-amount') ? tr.querySelector('.client-item-amount').value : '',
  })));
}

function populateClientEstimateItems(items = []) {
  const tbody = document.getElementById('clientItemsBody');
  if (!tbody) return;
  tbody.replaceChildren();
  const normalized = normalizeClientItems(items);
  if (normalized.length) {
    normalized.forEach((item) => addClientEstimateItem(item));
  } else {
    addClientEstimateItem();
  }
  updateClientEstimatePreview();
}

function buildClientItemizationFromJob() {
  const items = [];
  const addPublicItem = (text) => {
    const cleaned = String(text || '').trim();
    if (cleaned) items.push({ description: cleaned, amount: 0 });
  };
  document.querySelectorAll('#materialsBody tr').forEach((tr) => addPublicItem(tr.children[0].firstElementChild.value));
  document.querySelectorAll('#laborBody tr').forEach((tr) => addPublicItem(tr.children[0].firstElementChild.value));
  document.querySelectorAll('#otherBody tr').forEach((tr) => addPublicItem(tr.children[0].firstElementChild.value));
  populateClientEstimateItems(items);
  updateClientEstimatePreview();
}
window.buildClientItemizationFromJob = buildClientItemizationFromJob;

function populateClientScopeFromJob() {
  const lines = [];
  const addLine = (prefix, text) => {
    const cleaned = String(text || '').trim();
    if (cleaned) lines.push(`${prefix}: ${cleaned}`);
  };
  document.querySelectorAll('#materialsBody tr').forEach((tr) => addLine('Material', tr.children[0].firstElementChild.value));
  document.querySelectorAll('#laborBody tr').forEach((tr) => addLine('Labor', tr.children[0].firstElementChild.value));
  document.querySelectorAll('#otherBody tr').forEach((tr) => addLine('Item', tr.children[0].firstElementChild.value));
  const scope = document.getElementById('clientScope');
  if (scope) {
    scope.value = lines.join('\n');
    scope.dispatchEvent(new Event('input', { bubbles: true }));
  }
  updateClientEstimatePreview();
}
window.populateClientScopeFromJob = populateClientScopeFromJob;

function getClientEstimateTotal(job, estimate) {
  if (estimate && estimate.priceOverride > 0) return estimate.priceOverride;
  const itemSubtotal = getClientItemizationSubtotal(estimate);
  if (itemSubtotal > 0) {
    const salesTax = estimate && estimate.showTaxLine === false ? 0 : parseNumber(job.totalSalesTax);
    return itemSubtotal + salesTax;
  }
  return parseNumber(job.grandTotal) || ((parseNumber(job.price) || 0) + (parseNumber(job.totalSalesTax) || 0));
}

function updateClientEstimatePreview() {
  const totalEl = document.getElementById('clientEstimateTotalPreview');
  const depositEl = document.getElementById('clientDepositPreview');
  if (!totalEl && !depositEl) return;
  const estimate = getClientEstimateFromForm();
  const itemSubtotal = getClientItemizationSubtotal(estimate);
  let total = 0;
  if (estimate.priceOverride > 0) {
    total = estimate.priceOverride;
  } else if (itemSubtotal > 0) {
    const taxField = document.getElementById('totalSalesTax');
    total = itemSubtotal + (estimate.showTaxLine ? (parseNumber(taxField ? taxField.value : 0) || 0) : 0);
  } else {
    total = parseNumber(document.getElementById('grandTotal') ? document.getElementById('grandTotal').value : 0) || 0;
  }
  const deposit = total * (estimate.depositPercent / 100);
  if (totalEl) totalEl.textContent = formatNumber(total);
  if (depositEl) depositEl.textContent = `Deposit: $${formatNumber(deposit)}`;
}

// Add a new row to the materials table
function addMaterial(item = {}) {
  const tbody = document.getElementById('materialsBody');
  const tr = document.createElement('tr');
  tr.appendChild(createInputCell('text', item.description || '', { placeholder: 'Description' }));
  tr.appendChild(createInputCell('number', item.quantity != null ? item.quantity : '', { step: '0.01', min: 0 }));
  tr.appendChild(createInputCell('number', item.unitCost != null ? item.unitCost : '', { step: '0.01', min: 0 }));
  tr.appendChild(createInputCell('text', item.total != null ? formatNumber(item.total) : '', { readonly: true }));
  tr.appendChild(createRemoveCell());
  tbody.appendChild(tr);
  // Attach input listeners for recalculation
  const qtyInput = tr.children[1].firstElementChild;
  const costInput = tr.children[2].firstElementChild;
  qtyInput.addEventListener('input', () => updateRowTotal(tr));
  costInput.addEventListener('input', () => updateRowTotal(tr));
  // Immediately calculate row total
  updateRowTotal(tr);
}

// Make functions globally accessible for calculators
window.addMaterial = addMaterial;
window.addOther = addOther;
window.showNotification = showNotification;
window.calculateTotals = calculateTotals;

// Add a new row to the labor table
function addLabor(item = {}) {
  const tbody = document.getElementById('laborBody');
  const tr = document.createElement('tr');
  tr.appendChild(createInputCell('text', item.description || '', { placeholder: 'Description' }));
  tr.appendChild(createInputCell('number', item.hours != null ? item.hours : '', { step: '0.01', min: 0 }));
  tr.appendChild(createInputCell('number', item.rate != null ? item.rate : '', { step: '0.01', min: 0 }));
  tr.appendChild(createInputCell('text', item.total != null ? formatNumber(item.total) : '', { readonly: true }));
  tr.appendChild(createRemoveCell());
  tbody.appendChild(tr);
  const hrsInput = tr.children[1].firstElementChild;
  const rateInput = tr.children[2].firstElementChild;
  hrsInput.addEventListener('input', () => updateRowTotal(tr));
  rateInput.addEventListener('input', () => updateRowTotal(tr));
  updateRowTotal(tr);
}

// Add a new row to the other items table
function addOther(item = {}) {
  const tbody = document.getElementById('otherBody');
  const tr = document.createElement('tr');
  tr.appendChild(createInputCell('text', item.category || '', { placeholder: 'Category' }));
  tr.appendChild(createInputCell('number', item.cost != null ? item.cost : '', { step: '0.01', min: 0 }));
  tr.appendChild(createRemoveCell());
  tbody.appendChild(tr);
  const costInput = tr.children[1].firstElementChild;
  costInput.addEventListener('input', calculateTotals);
  // initial calculation
  calculateTotals();
}

// Remove a table row
function removeRow(button) {
  const tr = button.closest('tr');
  tr.remove();
  calculateTotals();
}

// Format job date range for display
function formatJobDateRange(job) {
  if (job.startDate && job.endDate) {
    if (job.startDate === job.endDate) {
      return formatDateInput(job.startDate, { year: 'numeric', month: 'long', day: 'numeric' });
    } else {
      return `${formatDateInput(job.startDate, { year: 'numeric', month: 'short', day: 'numeric' })} - ${formatDateInput(job.endDate, { year: 'numeric', month: 'short', day: 'numeric' })}`;
    }
  } else if (job.date) {
    return formatDateInput(job.date, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return 'Not specified';
}

// Calculate project duration and setup yearly breakdown
function calculateProjectDuration() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const durationSpan = document.getElementById('projectDuration');
  const breakdownSection = document.getElementById('yearlyBreakdownSection');
  const breakdownContainer = document.getElementById('yearlyBreakdownContainer');
  
  if (!startDate || !endDate) {
    durationSpan.textContent = '-';
    breakdownSection.style.display = 'none';
    return;
  }
  
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  
  if (!start || !end || end < start) {
    durationSpan.textContent = 'Invalid (end date before start date)';
    durationSpan.classList.add('text-danger');
    breakdownSection.style.display = 'none';
    return;
  }
  
  durationSpan.classList.remove('text-danger');
  
  // Calculate duration
  const dayMs = 1000 * 60 * 60 * 24;
  const startUtc = dateInputToUtc(startDate);
  const endUtc = dateInputToUtc(endDate);
  const diffDays = Math.max(1, Math.floor((endUtc - startUtc) / dayMs) + 1);
  const diffMonths = Math.floor(diffDays / 30.44);
  const diffYears = Math.floor(diffDays / 365);
  
  let durationText = '';
  if (diffYears > 0) {
    durationText = `${diffYears} year${diffYears > 1 ? 's' : ''}, ${diffMonths % 12} month${(diffMonths % 12) !== 1 ? 's' : ''}`;
  } else if (diffMonths > 0) {
    durationText = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
  } else {
    durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  
  durationSpan.textContent = durationText;
  
  // Setup yearly breakdown if project spans multiple years
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  if (endYear > startYear) {
    breakdownSection.style.display = 'block';
    breakdownContainer.replaceChildren();
    
    const existingBreakdown = yearlyBreakdown && typeof yearlyBreakdown === 'object' ? { ...yearlyBreakdown } : {};
    yearlyBreakdown = {};

    const yearParts = [];
    for (let year = startYear; year <= endYear; year++) {
      const partStart = Math.max(startUtc, Date.UTC(year, 0, 1));
      const partEnd = Math.min(endUtc, Date.UTC(year, 11, 31));
      const days = Math.max(0, Math.floor((partEnd - partStart) / dayMs) + 1);
      const raw = (days / diffDays) * 100;
      yearParts.push({ year, raw, floor: Math.floor(raw), fraction: raw - Math.floor(raw) });
    }

    let allocated = yearParts.reduce((sum, part) => sum + part.floor, 0);
    yearParts
      .slice()
      .sort((a, b) => b.fraction - a.fraction)
      .slice(0, Math.max(0, 100 - allocated))
      .forEach((part) => { part.floor += 1; });

    yearParts.forEach(({ year, floor }) => {
      const existingPercentage = Number(existingBreakdown[year]);
      const defaultPercentage = Number.isFinite(existingPercentage)
        ? Math.min(100, Math.max(0, Math.round(existingPercentage)))
        : floor;
      yearlyBreakdown[year] = defaultPercentage;
      const yearDiv = document.createElement('div');
      yearDiv.className = 'row g-2 mb-2 align-items-center';

      yearDiv.innerHTML = `
        <div class="col-md-2">
          <strong>${year}</strong>
        </div>
        <div class="col-md-6">
          <div class="d-flex align-items-center gap-2">
            <input type="range" class="form-range flex-grow-1 year-percentage" 
                   data-year="${year}" value="${defaultPercentage}" 
                   min="0" max="100" step="1">
            <input type="number" class="form-control year-percentage-number" 
                   style="width: 80px;" data-year="${year}" 
                   value="${defaultPercentage}" min="0" max="100" step="1">
            <span>%</span>
          </div>
        </div>
        <div class="col-md-4">
          <small class="text-muted">Estimated: $<span class="year-amount" data-year="${year}">0</span></small>
        </div>
      `;
      
      breakdownContainer.appendChild(yearDiv);
    });
    
    // Add total validation
    const totalDiv = document.createElement('div');
    totalDiv.className = 'mt-3 p-2 bg-light rounded';
    totalDiv.innerHTML = `
      <strong>Total: <span id="yearlyBreakdownTotal">${Object.values(yearlyBreakdown).reduce((a, b) => a + b, 0)}</span>%</strong>
      <span id="yearlyBreakdownStatus" class="ms-2"></span>
    `;
    breakdownContainer.appendChild(totalDiv);
    
    // Add event listeners for yearly breakdown
    setupYearlyBreakdownListeners();
    validateYearlyBreakdown();
  } else {
    breakdownSection.style.display = 'none';
    yearlyBreakdown = { [startYear]: 100 };
  }
}

// Setup event listeners for yearly breakdown inputs
function setupYearlyBreakdownListeners() {
  const sliders = document.querySelectorAll('.year-percentage');
  const numbers = document.querySelectorAll('.year-percentage-number');
  
  sliders.forEach(slider => {
    slider.addEventListener('input', function() {
      const year = this.dataset.year;
      const value = parseInt(this.value);
      yearlyBreakdown[year] = value;
      
      // Update corresponding number input
      const numberInput = document.querySelector(`.year-percentage-number[data-year="${year}"]`);
      if (numberInput) numberInput.value = value;
      
      validateYearlyBreakdown();
      updateYearlyAmounts();
    });
  });
  
  numbers.forEach(input => {
    input.addEventListener('input', function() {
      const year = this.dataset.year;
      const value = parseInt(this.value) || 0;
      yearlyBreakdown[year] = value;
      
      // Update corresponding slider
      const slider = document.querySelector(`.year-percentage[data-year="${year}"]`);
      if (slider) slider.value = value;
      
      validateYearlyBreakdown();
      updateYearlyAmounts();
    });
  });
}

// Validate yearly breakdown totals to 100%
function validateYearlyBreakdown() {
  const total = Object.values(yearlyBreakdown).reduce((a, b) => a + b, 0);
  const totalSpan = document.getElementById('yearlyBreakdownTotal');
  const statusSpan = document.getElementById('yearlyBreakdownStatus');
  
  if (totalSpan) totalSpan.textContent = total;
  
  if (statusSpan) {
    if (total === 100) {
      statusSpan.innerHTML = '<i class="bi bi-check-circle text-success"></i> Valid';
    } else if (total < 100) {
      statusSpan.innerHTML = '<i class="bi bi-exclamation-circle text-warning"></i> Under 100%';
    } else {
      statusSpan.innerHTML = '<i class="bi bi-x-circle text-danger"></i> Over 100%';
    }
  }
  
  return total === 100;
}

// Update yearly amount estimates
function updateYearlyAmounts() {
  const totalPrice = parseNumber(document.getElementById('price').value) || 0;
  
  Object.keys(yearlyBreakdown).forEach(year => {
    const percentage = yearlyBreakdown[year];
    const amount = (totalPrice * percentage) / 100;
    const amountSpan = document.querySelector(`.year-amount[data-year="${year}"]`);
    if (amountSpan) {
      amountSpan.textContent = formatNumber(amount);
    }
  });
}

// Update row total for materials or labor and recalc totals
function updateRowTotal(tr) {
  const inputs = tr.querySelectorAll('input');
  if (inputs.length < 4) return;
  const qty = parseNumber(inputs[1].value) || 0;
  const cost = parseNumber(inputs[2].value) || 0;
  const total = qty * cost;
  inputs[3].value = formatNumber(total);
  calculateTotals();
}

// Calculate totals for materials, labor, overhead, other, and final profit
function calculateTotals() {
  const totalMaterialsField = document.getElementById('totalMaterials');
  const totalLaborField = document.getElementById('totalLabor');
  const totalOverheadField = document.getElementById('totalOverhead');
  const totalSalesTaxField = document.getElementById('totalSalesTax');
  const totalOtherField = document.getElementById('totalOther');
  const totalContingencyField = document.getElementById('totalContingency');
  const totalCostField = document.getElementById('totalCost');
  const priceField = document.getElementById('price');
  const netProfitField = document.getElementById('netProfit');
  let materialsTotal = 0;
  document.querySelectorAll('#materialsBody tr').forEach((tr) => {
    const totalInput = tr.children[3].firstElementChild;
    materialsTotal += parseNumber(totalInput.value) || 0;
  });
  let laborTotal = 0;
  document.querySelectorAll('#laborBody tr').forEach((tr) => {
    const totalInput = tr.children[3].firstElementChild;
    laborTotal += parseNumber(totalInput.value) || 0;
  });
  let otherTotal = 0;
  document.querySelectorAll('#otherBody tr').forEach((tr) => {
    const costInput = tr.children[1].firstElementChild;
    otherTotal += parseNumber(costInput.value) || 0;
  });
  // --- Overhead: fixed $ plus a % of a configurable base ---
  const overheadCost = parseNumber(document.getElementById('overheadCost').value) || 0;
  const overheadPercent = parseNumber(document.getElementById('overheadPercent').value) || 0;
  const overheadBaseSel = document.getElementById('overheadBase');
  const overheadBase = overheadBaseSel ? overheadBaseSel.value : 'matlabor';
  const overheadBaseAmt = overheadBase === 'matlaborother'
    ? (materialsTotal + laborTotal + otherTotal)
    : (materialsTotal + laborTotal);
  const overheadTotal = overheadCost + (overheadBaseAmt * overheadPercent) / 100;

  // --- Contingency: % of direct costs (materials + labor + other) ---
  const contingencyPercent = parseNumber(document.getElementById('contingencyPercent') ? document.getElementById('contingencyPercent').value : '0') || 0;
  const contingency = ((materialsTotal + laborTotal + otherTotal) * contingencyPercent) / 100;

  // --- Your cost, BEFORE profit and BEFORE tax (this is the real P&L cost) ---
  const totalCost = materialsTotal + laborTotal + otherTotal + overheadTotal + contingency;

  // --- Profit applied to the pre-tax cost (margin divides, markup multiplies) ---
  const profitMargin = parseNumber(document.getElementById('profitMargin').value) || 0;
  const profitModeEl = document.querySelector('input[name="profitMode"]:checked');
  const profitMode = profitModeEl ? profitModeEl.value : 'margin';
  let effectiveProfitMargin = profitMargin;
  if (profitMode === 'margin' && effectiveProfitMargin >= 100) {
    effectiveProfitMargin = 99.9999; // avoid divide-by-zero; markup may exceed 100%
  }
  let priceBeforeTax = (profitMode === 'margin')
    ? totalCost / (1 - effectiveProfitMargin / 100)
    : totalCost * (1 + profitMargin / 100);

  // Round the (pre-tax) sell price to a clean number if requested.
  const roundingStepEl = document.getElementById('roundingStep');
  const roundingStep = roundingStepEl ? parseNumber(roundingStepEl.value) || 0 : 0;
  if (roundingStep > 0) {
    priceBeforeTax = Math.round(priceBeforeTax / roundingStep) * roundingStep;
  }

  const netProfit = priceBeforeTax - totalCost;

  // --- Sales tax: a PASS-THROUGH added AFTER profit (you never profit on tax) ---
  const salesTaxPercent = parseNumber(document.getElementById('salesTaxPercent') ? document.getElementById('salesTaxPercent').value : '0') || 0;
  const taxBaseSel = document.getElementById('taxBase');
  const taxBase = taxBaseSel ? taxBaseSel.value : 'materials';
  let taxableAmount;
  if (taxBase === 'matlabor') taxableAmount = materialsTotal + laborTotal;
  else if (taxBase === 'price') taxableAmount = priceBeforeTax;
  else if (taxBase === 'none') taxableAmount = 0;
  else taxableAmount = materialsTotal; // default: materials only
  const salesTax = (taxableAmount * salesTaxPercent) / 100;

  const grandTotal = priceBeforeTax + salesTax; // what the customer actually pays

  // --- Update display fields ---
  totalMaterialsField.value = formatNumber(materialsTotal);
  totalLaborField.value = formatNumber(laborTotal);
  if (totalSalesTaxField) totalSalesTaxField.value = formatNumber(salesTax);
  totalOtherField.value = formatNumber(otherTotal);
  totalOverheadField.value = formatNumber(overheadTotal);
  if (totalContingencyField) totalContingencyField.value = formatNumber(contingency);
  totalCostField.value = formatNumber(totalCost);
  priceField.value = formatNumber(priceBeforeTax);
  netProfitField.value = formatNumber(netProfit);
  const grandTotalField = document.getElementById('grandTotal');
  if (grandTotalField) grandTotalField.value = formatNumber(grandTotal);
  updateClientEstimatePreview();

  // --- KPIs ---
  const kpiProfitPct = document.getElementById('kpiProfitPct');
  const kpiMarginOnCost = document.getElementById('kpiMarginOnCost');
  const kpiBreakeven = document.getElementById('kpiBreakeven');
  if (kpiProfitPct) {
    const pct = priceBeforeTax > 0 ? (netProfit / priceBeforeTax) * 100 : 0;
    kpiProfitPct.textContent = `${pct.toFixed(1)}%`;
  }
  if (kpiMarginOnCost) {
    const pct = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    kpiMarginOnCost.textContent = `${pct.toFixed(1)}%`;
  }
  if (kpiBreakeven) {
    kpiBreakeven.textContent = formatNumber(totalCost);
  }

  // Update yearly amounts if breakdown exists
  updateYearlyAmounts();
}

// Handle logo upload and preview
document.getElementById('logoInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    logoDataUrl = event.target.result;
    const preview = document.getElementById('logoPreview');
    preview.src = logoDataUrl;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// Load job data if editing
async function loadJob() {
  const id = getQueryParam('id');
  if (id) {
    const jobs = loadJobs();
    let job = jobs.find((j) => j.id === id);
    if (!job) {
      try {
        const res = await API.apiGetJob(id);
        if (res && res.success && res.job) {
          const s = res.job;
          job = {
            id: s.id,
            companyName: s.company_name || '',
            jobName: s.job_name || '',
            jobType: s.job_type || 'Other',
            date: s.date || s.start_date || '',
            startDate: s.start_date || s.date || '',
            endDate: s.end_date || s.date || '',
            yearlyBreakdown: s.yearly_breakdown || {},
            profitMargin: parseFloat(s.profit_margin || 0),
            overheadCost: parseFloat(s.overhead_cost || 0),
            overheadPercent: parseFloat(s.overhead_percent || 0),
            salesTaxPercent: parseFloat(s.sales_tax_percent || 0),
            contingencyPercent: parseFloat(s.contingency_percent || 0),
            profitMode: s.profit_mode || 'margin',
            roundingStep: parseInt(s.rounding_step || 0),
            notes: s.notes || '',
            logo: s.logo_path || null,
            materials: Array.isArray(s.materials) ? s.materials : [],
            labor: Array.isArray(s.labor) ? s.labor : [],
            other: Array.isArray(s.other) ? s.other : [],
            totalMaterials: parseFloat(s.total_materials || 0),
            totalLabor: parseFloat(s.total_labor || 0),
            totalOther: parseFloat(s.total_other || 0),
            totalOverhead: parseFloat(s.total_overhead || 0),
            totalSalesTax: parseFloat(s.total_sales_tax || 0),
            totalContingency: parseFloat(s.total_contingency || 0),
            totalCost: parseFloat(s.total_cost || 0),
            price: parseFloat(s.price || 0),
            netProfit: parseFloat(s.net_profit || 0),
            grandTotal: parseFloat(s.grand_total || 0),
            ghlContactId: s.ghl_contact_id || '',
            ghlOpportunityId: s.ghl_opportunity_id || '',
            ghlEstimateId: s.ghl_estimate_id || '',
            ghlLastSyncedAt: s.ghl_last_synced_at || '',
            ghlLastSyncError: s.ghl_last_sync_error || '',
            settings: s.settings || {},
            clientEstimate: (s.settings && s.settings.clientEstimate) || {},
            measurement: s.measurement || null,
          };
          jobs.push(job);
          saveJobs(jobs);
        } else {
          alert('Job not found');
          return;
        }
      } catch (e) {
        alert('Job not found');
        return;
      }
    }
    currentJobId = id;
    // Populate fields
    document.getElementById('formHeading').textContent = 'Edit Job';
    document.getElementById('navJobTitle').textContent = job.jobName;
    
    // Hide templates when editing
    const templateSection = document.getElementById('templateSection');
    if (templateSection) {
      templateSection.style.display = 'none';
    }
    
    document.getElementById('companyName').value = job.companyName || '';
    document.getElementById('jobName').value = job.jobName || '';
    
    // Handle date fields - check for new start/end dates or fallback to old single date
    if (job.startDate && job.endDate) {
      document.getElementById('startDate').value = job.startDate;
      document.getElementById('endDate').value = job.endDate;
    } else if (job.date) {
      // Legacy support - if only single date exists, use it as start date
      document.getElementById('startDate').value = job.date;
      document.getElementById('endDate').value = job.date;
    }
    
    // Load yearly breakdown if exists
    if (job.yearlyBreakdown) {
      yearlyBreakdown = job.yearlyBreakdown;
    }
    
    document.getElementById('jobType').value = job.jobType || 'Other';
    currentJobType = document.getElementById('jobType').value;
    Calculators.renderCalculator(currentJobType);
    // Set profit margin
    const profitMarginValue = job.profitMargin != null ? job.profitMargin : 10;
    document.getElementById('profitMargin').value = profitMarginValue;
    if (document.getElementById('profitMarginNumber')) document.getElementById('profitMarginNumber').value = profitMarginValue;
    if (document.getElementById('profitMarginValue')) document.getElementById('profitMarginValue').textContent = profitMarginValue;
    
    // Set sales tax
    if (document.getElementById('salesTaxPercent')) {
      const salesTaxValue = job.salesTaxPercent != null ? job.salesTaxPercent : 0;
      document.getElementById('salesTaxPercent').value = salesTaxValue;
      if (document.getElementById('salesTaxPercentNumber')) document.getElementById('salesTaxPercentNumber').value = salesTaxValue;
      if (document.getElementById('salesTaxPercentValue')) document.getElementById('salesTaxPercentValue').textContent = salesTaxValue;
    }
    
    // Set contingency
    if (document.getElementById('contingencyPercent')) {
      const contingencyValue = job.contingencyPercent != null ? job.contingencyPercent : 0;
      document.getElementById('contingencyPercent').value = contingencyValue;
      if (document.getElementById('contingencyPercentNumber')) document.getElementById('contingencyPercentNumber').value = contingencyValue;
      if (document.getElementById('contingencyPercentValue')) document.getElementById('contingencyPercentValue').textContent = contingencyValue;
    }
    const mode = job.profitMode || 'margin';
    const modeEl = document.getElementById(mode === 'markup' ? 'profitModeMarkup' : 'profitModeMargin');
    if (modeEl) modeEl.checked = true;
    if (document.getElementById('roundingStep')) document.getElementById('roundingStep').value = job.roundingStep != null ? job.roundingStep : 0;
    // Restore tax base / overhead base (top-level or nested settings object)
    const jobSettings = job.settings || {};
    const overheadBaseVal = job.overheadBase || jobSettings.overheadBase || 'matlabor';
    const taxBaseVal = job.taxBase || jobSettings.taxBase || 'materials';
    if (document.getElementById('overheadBase')) document.getElementById('overheadBase').value = overheadBaseVal;
    if (document.getElementById('taxBase')) document.getElementById('taxBase').value = taxBaseVal;
	    document.getElementById('notes').value = job.notes || '';
	    setMeasurementData(job.measurement || null);
	    populateClientEstimate(job);
    document.getElementById('overheadCost').value = job.overheadCost != null ? job.overheadCost : 0;
    
    // Set overhead percent
    const overheadPercentValue = job.overheadPercent != null ? job.overheadPercent : 0;
    document.getElementById('overheadPercent').value = overheadPercentValue;
    if (document.getElementById('overheadPercentNumber')) document.getElementById('overheadPercentNumber').value = overheadPercentValue;
    if (document.getElementById('overheadPercentValue')) document.getElementById('overheadPercentValue').textContent = overheadPercentValue;
    // Logo
    if (job.logo) {
      logoDataUrl = job.logo;
      const preview = document.getElementById('logoPreview');
      preview.src = logoDataUrl;
      preview.style.display = 'block';
    }
    // Clear existing rows and populate materials
    document.getElementById('materialsBody').innerHTML = '';
    if (Array.isArray(job.materials) && job.materials.length) {
      job.materials.forEach((m) => addMaterial(m));
    } else {
      addMaterial();
    }
    // Populate labor
    document.getElementById('laborBody').innerHTML = '';
    if (Array.isArray(job.labor) && job.labor.length) {
      job.labor.forEach((l) => addLabor(l));
    } else {
      addLabor();
    }
    // Populate other items
    document.getElementById('otherBody').innerHTML = '';
    if (Array.isArray(job.other) && job.other.length) {
      job.other.forEach((o) => addOther(o));
    } else {
      // no default row for other; leave empty
    }
    // Delete button visible
    document.getElementById('deleteBtn').style.display = 'inline-block';
    calculateTotals();
	  } else {
	    // New job
	    const clientName = getQueryParam('client');
	    if (clientName && document.getElementById('companyName')) {
	      document.getElementById('companyName').value = clientName;
	    }
	    setMeasurementData(null);
	    addMaterial();
	    addLabor();
    calculateTotals();
    currentJobType = document.getElementById('jobType').value;
    Calculators.renderCalculator(currentJobType);
    populateClientEstimate({
      id: currentJobId,
      companyName: document.getElementById('companyName').value.trim(),
      jobName: document.getElementById('jobName').value.trim(),
    });
  }
}

function validateJobForm() {
  const companyName = document.getElementById('companyName').value.trim();
  const jobName = document.getElementById('jobName').value.trim();
  const errors = [];

  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

  if (!companyName) {
    errors.push('Company Name is required');
    document.getElementById('companyName').classList.add('is-invalid');
  }

  if (!jobName) {
    errors.push('Job Name is required');
    document.getElementById('jobName').classList.add('is-invalid');
  }

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate) {
    errors.push('Start Date is required');
    document.getElementById('startDate').classList.add('is-invalid');
  }
  
  if (!endDate) {
    errors.push('End Date is required');
    document.getElementById('endDate').classList.add('is-invalid');
  }

  if (startDate && endDate) {
    const start = dateInputToUtc(startDate);
    const end = dateInputToUtc(endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      errors.push('End Date cannot be before Start Date');
      document.getElementById('endDate').classList.add('is-invalid');
    }
  }

  if (yearlyBreakdown && Object.keys(yearlyBreakdown).length > 1) {
    const total = Object.values(yearlyBreakdown).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      errors.push('Yearly breakdown percentages must total 100%');
    }
  }

  if (errors.length > 0) {
    showNotification('error', 'Validation Error', errors.join('<br>'));
    return false;
  }

  return true;
}

// Save the job (create or update)
function saveJob() {
  if (!validateJobForm()) return;

  // Single source of truth: collectFormJob() runs calculateTotals() internally
  // and reads back the computed fields, so the math lives in exactly one place.
  const job = collectFormJob();
  // Save to localStorage
  saveLocalJobCopy(job);
  // Update currentJobId to ensure exports work
  currentJobId = job.id;
  if (typeof window.markFormClean === 'function') window.markFormClean();
  // Show success notification
  showNotification('success', 'Job Saved', `${job.jobName} has been saved successfully!`);
  // Show preview modal
  showPreview(job);
  return job;
}

function saveLocalJobCopy(job) {
  let jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    jobs[idx] = { ...jobs[idx], ...job };
  } else {
    jobs.push(job);
  }
  saveJobs(jobs);
}

// Save to server via API (keeps local copy too)
async function saveJobToServer() {
  if (!validateJobForm()) return;
  // Single source of truth: build the canonical job (runs calculateTotals()).
  const job = collectFormJob();
  // The server stores logos as base64; map our in-memory dataURL across.
  const payload = Object.assign({}, job, { logo_base64: job.logo || null });
  delete payload.logo;
  try {
    await API.apiSaveJob(payload);
    currentJobId = job.id;
    // Keep the local cache in sync with what we just persisted.
    saveLocalJobCopy(job);
    if (typeof window.markFormClean === 'function') window.markFormClean();
    showNotification('success', 'Saved to Server', `${job.jobName} was saved to the server.`);
    return job;
  } catch (e) {
    showNotification('error', 'Server Save Failed', 'Could not reach the server. Your changes are still saved locally.');
    return null;
  }
}

function apiErrorText(error) {
  const text = error && error.message ? String(error.message) : 'Unknown error';
  try {
    const jsonText = text.slice(text.indexOf('{'));
    const parsed = JSON.parse(jsonText);
    return parsed.error || parsed.message || text;
  } catch (e) {
    return text;
  }
}

async function syncJobToHighLevel() {
  if (!validateJobForm()) return;
  if (!window.API || typeof API.apiSyncJobToGhl !== 'function') {
    showNotification('error', 'HighLevel Sync Failed', 'The HighLevel API bridge is not available.');
    return;
  }

  const job = await saveJobToServer();
  if (!job) return;

  try {
    const result = await API.apiSyncJobToGhl(job);
    const ids = result && result.ids ? result.ids : {};
    const updatedJob = {
      ...job,
      ghlContactId: ids.contactId || job.ghlContactId || '',
      ghlOpportunityId: ids.opportunityId || job.ghlOpportunityId || '',
      ghlEstimateId: ids.estimateId || job.ghlEstimateId || '',
      ghlLastSyncedAt: result && result.syncedAt ? result.syncedAt : job.ghlLastSyncedAt || '',
      ghlLastSyncError: '',
    };
    saveLocalJobCopy(updatedJob);
    if (result && result.alreadySynced) {
      showNotification('info', 'Already in HighLevel', result.message || 'This job already has a HighLevel estimate ID.');
    } else {
      showNotification(
        'success',
        'Sent to HighLevel',
        ids.estimateId ? `HighLevel estimate created: ${ids.estimateId}` : 'HighLevel contact and estimate sync completed.'
      );
    }
  } catch (e) {
    showNotification('error', 'HighLevel Sync Failed', apiErrorText(e), 9000);
  }
}
window.syncJobToHighLevel = syncJobToHighLevel;

// Delete current job
async function deleteJob() {
  if (!currentJobId) return;
  if (!confirm('Are you sure you want to delete this job?')) return;
  let serverDeleted = false;
  if (window.API && typeof API.apiDeleteJob === 'function') {
    try {
      await API.apiDeleteJob(currentJobId);
      serverDeleted = true;
    } catch (err) {
      const message = err && err.message ? err.message : '';
      const deleteLocalOnly = confirm(
        'The server delete did not finish. Remove this job from this browser anyway?\n\n'
        + 'If the job still exists in the database, it may show up again after sync.'
        + (message ? `\n\nServer message: ${message}` : '')
      );
      if (!deleteLocalOnly) return;
    }
  }
  let jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === currentJobId);
  if (idx >= 0) {
    jobs.splice(idx, 1);
    saveJobs(jobs);
  }
  showNotification(
    serverDeleted ? 'success' : 'warning',
    serverDeleted ? 'Job Deleted' : 'Deleted Locally',
    serverDeleted ? 'The job was removed from the server and this browser.' : 'The job was removed from this browser only.'
  );
  window.location.href = 'index.html';
}

// Build job object from current form data
// Collect the full canonical job object from the form. This is the ONE place
// that gathers line items and reads computed totals; it calls calculateTotals()
// (the single math implementation) so every save path stays consistent.
function collectFormJob() {
  const num = (id) => { const el = document.getElementById(id); return el ? (parseNumber(el.value) || 0) : 0; };
  const val = (id, dflt) => { const el = document.getElementById(id); return el ? el.value : dflt; };

  const materials = [];
  document.querySelectorAll('#materialsBody tr').forEach((tr) => {
    const desc = tr.children[0].firstElementChild.value.trim();
    const qty = parseNumber(tr.children[1].firstElementChild.value) || 0;
    const unitCost = parseNumber(tr.children[2].firstElementChild.value) || 0;
    if (desc || qty || unitCost) materials.push({ description: desc, quantity: qty, unitCost: unitCost, total: qty * unitCost });
  });
  const labor = [];
  document.querySelectorAll('#laborBody tr').forEach((tr) => {
    const desc = tr.children[0].firstElementChild.value.trim();
    const hours = parseNumber(tr.children[1].firstElementChild.value) || 0;
    const rate = parseNumber(tr.children[2].firstElementChild.value) || 0;
    if (desc || hours || rate) labor.push({ description: desc, hours: hours, rate: rate, total: hours * rate });
  });
  const other = [];
  document.querySelectorAll('#otherBody tr').forEach((tr) => {
    const category = tr.children[0].firstElementChild.value.trim();
    const cost = parseNumber(tr.children[1].firstElementChild.value) || 0;
    if (category || cost) other.push({ category: category, cost: cost });
  });

  calculateTotals(); // updates every summary field from the inputs above

  const profitModeEl = document.querySelector('input[name="profitMode"]:checked');
  const overheadBase = val('overheadBase', 'matlabor');
  const taxBase = val('taxBase', 'materials');
  const startDate = document.getElementById('startDate').value;
  const clientEstimate = getClientEstimateFromForm();

  return {
    id: currentJobId || generateId(),
    companyName: document.getElementById('companyName').value.trim(),
    jobName: document.getElementById('jobName').value.trim(),
    jobType: val('jobType', 'Other') || 'Other',
    date: startDate, // Keep for backward compatibility
    startDate: startDate,
    endDate: document.getElementById('endDate').value,
    yearlyBreakdown: yearlyBreakdown,
    profitMargin: num('profitMargin'),
    overheadCost: num('overheadCost'),
    overheadPercent: num('overheadPercent'),
    overheadBase: overheadBase,
    salesTaxPercent: num('salesTaxPercent'),
    taxBase: taxBase,
    contingencyPercent: num('contingencyPercent'),
    profitMode: profitModeEl ? profitModeEl.value : 'margin',
    roundingStep: num('roundingStep'),
    notes: document.getElementById('notes').value || '',
    logo: logoDataUrl || null,
    materials: materials,
    labor: labor,
    other: other,
    totalMaterials: num('totalMaterials'),
    totalLabor: num('totalLabor'),
    totalOther: num('totalOther'),
    totalOverhead: num('totalOverhead'),
    totalSalesTax: num('totalSalesTax'),
    totalContingency: num('totalContingency'),
    totalCost: num('totalCost'),
    price: num('price'),
    netProfit: num('netProfit'),
	    grandTotal: num('grandTotal'),
	    clientEstimate: clientEstimate,
	    measurement: measurementData,
	    settings: { taxBase: taxBase, overheadBase: overheadBase, clientEstimate: clientEstimate },
	  };
	}

function buildJobFromForm() {
  const companyName = document.getElementById('companyName').value.trim();
  const jobName = document.getElementById('jobName').value.trim();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  if (!companyName || !jobName || !startDate || !endDate) {
    return null;
  }
  return collectFormJob();
}

function downloadBlob(blob, fileName) {
  if (typeof saveAs === 'function') {
    saveAs(blob, fileName);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function waitForHtml2Pdf(timeoutMs = 5000) {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      if (window.html2pdf) {
        resolve(window.html2pdf);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

// Export current job to Excel
function exportExcel() {
  if (!window.XLSX) {
    showNotification('warning', 'Export Tools Loading', 'Excel export is still loading. Please try again in a moment.');
    return;
  }
  // Try to get current job from form
  let job = buildJobFromForm();
  if (!job) {
    showNotification('error', 'Export Failed', 'Please enter Company Name and Job Name before exporting.');
    return;
  }
  
  // If we have a currentJobId, make sure it's saved
  if (currentJobId) {
    saveCurrentJobToTemp();
    const jobs = loadJobs();
    const savedJob = jobs.find((j) => j.id === currentJobId);
    if (savedJob) {
      job = savedJob;
    }
  }
  
  const wb = XLSX.utils.book_new();
  
  // Set workbook properties
  wb.Props = {
    Title: `${job.jobName} - P&L Report`,
    Subject: "Construction Project Profit & Loss",
    Author: job.companyName,
    CreatedDate: new Date()
  };
  // Enhanced Summary sheet with formatting
  const summaryData = [
    ['PROFIT & LOSS SUMMARY'],
    [],
    ['PROJECT INFORMATION', ''],
    ['Company Name', job.companyName],
    ['Job Name', job.jobName],
    ['Job Type', job.jobType || 'N/A'],
    ['Project Duration', formatJobDateRange(job)],
    [],
    ['COST BREAKDOWN', ''],
    ['Materials', Number((job.totalMaterials).toFixed(2))],
    ['Labor', Number((job.totalLabor).toFixed(2))],
    ['Overhead', Number((job.totalOverhead).toFixed(2))],
    ['Sales Tax', Number(((job.totalSalesTax || 0)).toFixed(2))],
    ['Contingency', Number(((job.totalContingency || 0)).toFixed(2))],
    ['Other Costs', Number((job.totalOther).toFixed(2))],
    [],
    ['PRICING & PROFIT', ''],
    ['Total Cost', Number((job.totalCost).toFixed(2))],
    ['Sale Price', Number((job.price).toFixed(2))],
    ['Net Profit', Number((job.netProfit).toFixed(2))],
    ['Profit Margin', `${job.profitMargin}%`],
    ['Profit Mode', job.profitMode || 'margin'],
    [],
    ['SETTINGS', ''],
    ['Overhead %', `${job.overheadPercent}%`],
    ['Sales Tax %', `${job.salesTaxPercent || 0}%`],
    ['Contingency %', `${job.contingencyPercent || 0}%`],
    ['Price Rounding', job.roundingStep ? `$${job.roundingStep}` : 'None'],
    [],
    ['NOTES', ''],
    [job.notes || 'No notes provided', '']
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  summarySheet['!cols'] = [
    { wch: 25 }, // Field names
    { wch: 40 }  // Values
  ];
  
  // Apply styles to headers
  const headerRows = [0, 2, 8, 16, 23, 29];
  headerRows.forEach(row => {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (!summarySheet[cellRef]) return;
    summarySheet[cellRef].s = {
      font: { bold: true, sz: 14 },
      fill: { fgColor: { rgb: "E6F0FF" } }
    };
  });
  
  // Merge title cell
  summarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
  ];
  
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
  
  // Create yearly breakdown sheets if project spans multiple years
  if (job.yearlyBreakdown && Object.keys(job.yearlyBreakdown).length > 1) {
    Object.keys(job.yearlyBreakdown).sort().forEach(year => {
      const percentage = job.yearlyBreakdown[year] / 100;
      
      // Year summary data
      const yearData = [
        [`YEAR ${year} BREAKDOWN`],
        [],
        ['Allocation Percentage', `${job.yearlyBreakdown[year]}%`],
        [],
        ['ESTIMATED COSTS', ''],
        ['Materials', Number((job.totalMaterials * percentage).toFixed(2))],
        ['Labor', Number((job.totalLabor * percentage).toFixed(2))],
        ['Overhead', Number((job.totalOverhead * percentage).toFixed(2))],
        ['Sales Tax', Number((((job.totalSalesTax || 0) * percentage)).toFixed(2))],
        ['Contingency', Number((((job.totalContingency || 0) * percentage)).toFixed(2))],
        ['Other Costs', Number((job.totalOther * percentage).toFixed(2))],
        [],
        ['ESTIMATED TOTALS', ''],
        ['Total Cost', Number((job.totalCost * percentage).toFixed(2))],
        ['Revenue', Number((job.price * percentage).toFixed(2))],
        ['Net Profit', Number((job.netProfit * percentage).toFixed(2))],
        [],
        ['DETAILED BREAKDOWN', ''],
        []
      ];
      
      // Add materials breakdown for this year
      yearData.push(['Materials', '', '', '']);
      yearData.push(['Description', 'Quantity', 'Unit Cost', 'Year Total']);
      job.materials.forEach(m => {
        yearData.push([
          m.description,
          Number(((m.quantity || 0) * percentage).toFixed(2)),
          Number((m.unitCost || 0).toFixed ? (m.unitCost).toFixed(2) : Number(m.unitCost || 0).toFixed(2)),
          Number(((m.total || 0) * percentage).toFixed(2))
        ]);
      });
      
      yearData.push([]);
      yearData.push(['Labor', '', '', '']);
      yearData.push(['Description', 'Hours', 'Rate', 'Year Total']);
      job.labor.forEach(l => {
        yearData.push([
          l.description,
          Number(((l.hours || 0) * percentage).toFixed(2)),
          Number((l.rate || 0).toFixed ? (l.rate).toFixed(2) : Number(l.rate || 0).toFixed(2)),
          Number(((l.total || 0) * percentage).toFixed(2))
        ]);
      });

      // Add other items breakdown for this year
      if (job.other && job.other.length) {
        yearData.push([]);
        yearData.push(['Other', '', '', '']);
        yearData.push(['Category', '', '', 'Year Cost']);
        job.other.forEach(o => {
          yearData.push([
            o.category,
            '',
            '',
            Number((((o.cost || 0) * percentage)).toFixed(2))
          ]);
        });
      }

      // Yearly summary totals (summing itemized sections)
      const materialsYearSum = (job.materials || []).reduce((sum, m) => {
        const rowTotal = (m.total != null ? m.total : ((m.quantity || 0) * (m.unitCost || 0)));
        return sum + ((rowTotal || 0) * percentage);
      }, 0);
      const laborYearSum = (job.labor || []).reduce((sum, l) => {
        const rowTotal = (l.total != null ? l.total : ((l.hours || 0) * (l.rate || 0)));
        return sum + ((rowTotal || 0) * percentage);
      }, 0);
      const otherYearSum = (job.other || []).reduce((sum, o) => sum + (((o.cost || 0) * percentage)), 0);
      const overheadYear = ((job.totalOverhead || 0) * percentage);
      const salesTaxYear = ((job.totalSalesTax || 0) * percentage);
      const contingencyYear = ((job.totalContingency || 0) * percentage);
      const fullYearCost = materialsYearSum + laborYearSum + otherYearSum + overheadYear + salesTaxYear + contingencyYear;

      yearData.push([]);
      yearData.push(['=== YEARLY SUMMARY TOTALS ===', '', '', '']);
      yearData.push(['Materials (Itemized Total)', '', '', Number(materialsYearSum.toFixed(2))]);
      yearData.push(['Labor (Itemized Total)', '', '', Number(laborYearSum.toFixed(2))]);
      yearData.push(['Other Costs (Itemized Total)', '', '', Number(otherYearSum.toFixed(2))]);
      yearData.push(['Overhead Applied', '', '', Number(overheadYear.toFixed(2))]);
      yearData.push(['Sales Tax Applied', '', '', Number(salesTaxYear.toFixed(2))]);
      yearData.push(['Contingency Applied', '', '', Number(contingencyYear.toFixed(2))]);
      yearData.push([]);
      yearData.push(['TOTAL YEAR ' + year + ' COST', '', '', Number(fullYearCost.toFixed(2))]);
      
      const yearSheet = XLSX.utils.aoa_to_sheet(yearData);
      
      // Set column widths for year sheet
      yearSheet['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];
      
      // Style the header
      if (yearSheet['A1']) {
        yearSheet['A1'].s = {
          font: { bold: true, sz: 16 },
          fill: { fgColor: { rgb: "E6F0FF" } }
        };
      }
      
      XLSX.utils.book_append_sheet(wb, yearSheet, `Year ${year}`);
    });
  }
  // Materials sheet
  const materialsSheetData = [ ['Description','Quantity','Unit Cost','Total'] ];
  job.materials.forEach((m) => {
    materialsSheetData.push([
      m.description,
      Number((m.quantity || 0).toFixed ? m.quantity.toFixed(2) : Number(m.quantity || 0).toFixed(2)),
      Number((m.unitCost || 0).toFixed ? m.unitCost.toFixed(2) : Number(m.unitCost || 0).toFixed(2)),
      Number((m.total || 0).toFixed ? m.total.toFixed(2) : Number(m.total || 0).toFixed(2)),
    ]);
  });
  const matSheet = XLSX.utils.aoa_to_sheet(materialsSheetData);
  XLSX.utils.book_append_sheet(wb, matSheet, 'Materials');
  // Labor sheet
  const laborSheetData = [ ['Description','Hours','Rate','Total'] ];
  job.labor.forEach((l) => {
    laborSheetData.push([
      l.description,
      Number((l.hours || 0).toFixed ? l.hours.toFixed(2) : Number(l.hours || 0).toFixed(2)),
      Number((l.rate || 0).toFixed ? l.rate.toFixed(2) : Number(l.rate || 0).toFixed(2)),
      Number((l.total || 0).toFixed ? l.total.toFixed(2) : Number(l.total || 0).toFixed(2)),
    ]);
  });
  const laborSheet = XLSX.utils.aoa_to_sheet(laborSheetData);
  XLSX.utils.book_append_sheet(wb, laborSheet, 'Labor');
  // Other sheet
  const otherSheetData = [ ['Category','Cost'] ];
  job.other.forEach((o) => {
    otherSheetData.push([
      o.category,
      Number((o.cost || 0).toFixed ? o.cost.toFixed(2) : Number(o.cost || 0).toFixed(2)),
    ]);
  });
  const otherSheet = XLSX.utils.aoa_to_sheet(otherSheetData);
  XLSX.utils.book_append_sheet(wb, otherSheet, 'Other');
  // Write workbook and trigger download
  const fileName = `${job.jobName.replace(/[^a-zA-Z0-9]+/g, '_') || 'job'}_PnL_${toDateInputValue(new Date())}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  downloadBlob(blob, fileName);
  
  // Show success notification
  showNotification('success', 'Excel Exported', `${job.jobName} has been exported to Excel successfully!`);
}

// Save current unsaved job to localStorage temporarily (used before export)
function saveCurrentJobToTemp() {
  const job = buildJobFromForm();
  if (!job) return false;
  currentJobId = job.id;
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === currentJobId);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  saveJobs(jobs);
  return true;
}

// Export current job to PDF
async function exportPDF() {
  const pdfTool = await waitForHtml2Pdf();
  if (!pdfTool) {
    showNotification('warning', 'Export Tools Loading', 'PDF export tools could not load. Refresh the page and try again.');
    return;
  }
  // Try to get current job from form
  let job = buildJobFromForm();
  if (!job) {
    alert('Please enter Company Name and Job Name before exporting.');
    return;
  }
  
  // If we have a currentJobId, make sure it's saved
  if (currentJobId) {
    saveCurrentJobToTemp();
    const jobs = loadJobs();
    const savedJob = jobs.find((j) => j.id === currentJobId);
    if (savedJob) {
      job = savedJob;
    }
  }
  // Build a temporary container with content
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = `
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
    max-width: 800px;
    margin: 0 auto;
  `;
  
  // Header with logo and title
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 3px solid #0066ff;
  `;
  
  // Logo section
  const logoSection = document.createElement('div');
  logoSection.style.cssText = 'flex: 1;';
  
  if (job.logo) {
    const img = document.createElement('img');
    img.src = job.logo;
    img.style.cssText = `
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
    `;
    logoSection.appendChild(img);
  }
  
  // Title section
  const titleSection = document.createElement('div');
  titleSection.style.cssText = 'flex: 2; text-align: right;';
  
  const title = document.createElement('h1');
  title.textContent = 'Profit & Loss Report';
  title.style.cssText = `
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #0066ff;
  `;
  titleSection.appendChild(title);
  
  const subtitle = document.createElement('p');
  subtitle.textContent = job.companyName;
  subtitle.style.cssText = `
    margin: 5px 0 0 0;
    font-size: 16px;
    color: #666;
  `;
  titleSection.appendChild(subtitle);
  
  header.appendChild(logoSection);
  header.appendChild(titleSection);
  pdfContainer.appendChild(header);
  // Job Information Section
  const jobInfo = document.createElement('div');
  jobInfo.style.cssText = `
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 30px;
  `;
  
  const jobInfoTitle = document.createElement('h2');
  jobInfoTitle.textContent = 'Job Information';
  jobInfoTitle.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 20px;
    color: #333;
  `;
  jobInfo.appendChild(jobInfoTitle);
  
  const jobDetails = document.createElement('div');
  jobDetails.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;';
  jobDetails.innerHTML = `
    <div><strong>Job Name:</strong> ${escapeHtml(job.jobName)}</div>
    <div><strong>Project Duration:</strong> ${escapeHtml(formatJobDateRange(job))}</div>
    <div><strong>Job Type:</strong> ${escapeHtml(job.jobType || 'N/A')}</div>
    <div><strong>Profit Mode:</strong> ${escapeHtml(job.profitMode || 'margin')}</div>
  `;
  jobInfo.appendChild(jobDetails);
  pdfContainer.appendChild(jobInfo);
  
  // Financial Summary with Highlighted Areas
  const financialSummary = document.createElement('div');
  financialSummary.style.cssText = `
    margin-bottom: 30px;
  `;
  
  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Financial Summary';
  summaryTitle.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #333;
  `;
  financialSummary.appendChild(summaryTitle);
  
  // Summary grid
  const summaryGrid = document.createElement('div');
  summaryGrid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;';
  
  // Helper function to create summary cards
  const createSummaryCard = (label, value, isHighlighted = false) => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isHighlighted ? '#e6f0ff' : '#f8f9fa'};
      border: ${isHighlighted ? '2px solid #0066ff' : '1px solid #dee2e6'};
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      ${isHighlighted ? 'box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);' : ''}
    `;
    
    const cardLabel = document.createElement('div');
    cardLabel.textContent = label;
    cardLabel.style.cssText = `
      font-size: 12px;
      color: ${isHighlighted ? '#0052cc' : '#666'};
      margin-bottom: 5px;
      font-weight: 500;
    `;
    
    const cardValue = document.createElement('div');
    cardValue.textContent = value;
    cardValue.style.cssText = `
      font-size: 20px;
      font-weight: 700;
      color: ${isHighlighted ? '#0066ff' : '#333'};
    `;
    
    card.appendChild(cardLabel);
    card.appendChild(cardValue);
    return card;
  };
  
  // Add summary cards
  summaryGrid.appendChild(createSummaryCard('Total Materials', `$${formatNumber(job.totalMaterials)}`));
  summaryGrid.appendChild(createSummaryCard('Total Labor', `$${formatNumber(job.totalLabor)}`));
  summaryGrid.appendChild(createSummaryCard('Total Overhead', `$${formatNumber(job.totalOverhead)}`));
  summaryGrid.appendChild(createSummaryCard('Sales Tax', `$${formatNumber(job.totalSalesTax || 0)}`));
  summaryGrid.appendChild(createSummaryCard('Contingency', `$${formatNumber(job.totalContingency || 0)}`, true));
  summaryGrid.appendChild(createSummaryCard('Other Costs', `$${formatNumber(job.totalOther)}`));
  
  financialSummary.appendChild(summaryGrid);
  
  // Profit highlights section
  const profitSection = document.createElement('div');
  profitSection.style.cssText = `
    margin-top: 20px;
    background: linear-gradient(135deg, #e6f0ff 0%, #f0f7ff 100%);
    border: 2px solid #0066ff;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
  `;
  
  const profitTitle = document.createElement('h3');
  profitTitle.textContent = 'Profit Analysis';
  profitTitle.style.cssText = `
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #0066ff;
  `;
  profitSection.appendChild(profitTitle);
  
  const profitGrid = document.createElement('div');
  profitGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;';
  
  profitGrid.appendChild(createSummaryCard('Total Cost', `$${formatNumber(job.totalCost)}`));
  profitGrid.appendChild(createSummaryCard('Sale Price', `$${formatNumber(job.price)}`));
  profitGrid.appendChild(createSummaryCard('Net Profit', `$${formatNumber(job.netProfit)}`, true));
  profitGrid.appendChild(createSummaryCard('Profit Margin', `${job.profitMargin}%`, true));
  
  profitSection.appendChild(profitGrid);
  financialSummary.appendChild(profitSection);
  
  pdfContainer.appendChild(financialSummary);
  // Notes
  if (job.notes) {
    const notesSection = document.createElement('div');
    notesSection.style.cssText = `
      background: #fffbeb;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
    `;
    
    const notesHeading = document.createElement('h3');
    notesHeading.textContent = 'Notes';
    notesHeading.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #d97706;
    `;
    notesSection.appendChild(notesHeading);
    
    const notesPara = document.createElement('p');
    notesPara.textContent = job.notes;
    notesPara.style.cssText = `
      margin: 0;
      color: #92400e;
      line-height: 1.5;
    `;
    notesSection.appendChild(notesPara);
    pdfContainer.appendChild(notesSection);
  }
  
  // Helper function to create styled tables
  const createStyledTable = (title, headers, rows) => {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 30px;';
    
    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #333;
    `;
    section.appendChild(heading);
    
    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
    `;
    
    // Create header
    let tableHtml = '<thead><tr>';
    headers.forEach(header => {
      tableHtml += `<th style="background: #f8f9fa; padding: 12px; text-align: ${header.align || 'left'}; font-weight: 600; color: #495057; border-bottom: 2px solid #dee2e6;">${escapeHtml(header.text)}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    // Create rows
    rows.forEach((row, index) => {
      tableHtml += `<tr style="background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};">`;
      row.forEach((cell, cellIndex) => {
        const align = headers[cellIndex].align || 'left';
        tableHtml += `<td style="padding: 10px 12px; text-align: ${align}; border-bottom: 1px solid #dee2e6;">${escapeHtml(cell)}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
    
    table.innerHTML = tableHtml;
    section.appendChild(table);
    return section;
  };
  
  // Materials table
  if (job.materials && job.materials.length) {
    const matHeaders = [
      { text: 'Description', align: 'left' },
      { text: 'Qty', align: 'right' },
      { text: 'Unit Cost', align: 'right' },
      { text: 'Total', align: 'right' }
    ];
    const matRows = job.materials.map(m => [
      m.description,
      m.quantity,
      `$${formatNumber(parseNumber(m.unitCost))}`,
      `$${formatNumber(m.total)}`
    ]);
    pdfContainer.appendChild(createStyledTable('Materials', matHeaders, matRows));
  }
  // Labor table
  if (job.labor && job.labor.length) {
    const laborHeaders = [
      { text: 'Description', align: 'left' },
      { text: 'Hours', align: 'right' },
      { text: 'Hourly Rate', align: 'right' },
      { text: 'Total', align: 'right' }
    ];
    const laborRows = job.labor.map(l => [
      l.description,
      l.hours,
      `$${formatNumber(parseNumber(l.rate))}`,
      `$${formatNumber(l.total)}`
    ]);
    pdfContainer.appendChild(createStyledTable('Labor', laborHeaders, laborRows));
  }
  
  // Other items table
  if (job.other && job.other.length) {
    const otherHeaders = [
      { text: 'Category', align: 'left' },
      { text: 'Cost', align: 'right' }
    ];
    const otherRows = job.other.map(o => [
      o.category,
      `$${formatNumber(parseNumber(o.cost))}`
    ]);
    pdfContainer.appendChild(createStyledTable('Other Items', otherHeaders, otherRows));
  }
  
  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid #dee2e6;
    text-align: center;
    color: #666;
    font-size: 12px;
  `;
  
  const footerText = document.createElement('p');
  footerText.innerHTML = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>UGX PNL'S`;
  footerText.style.cssText = 'margin: 0;';
  footer.appendChild(footerText);
  
  pdfContainer.appendChild(footer);
  // Generate PDF using html2pdf
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `${job.jobName.replace(/[^a-zA-Z0-9]+/g, '_') || 'job'}_PnL_${toDateInputValue(new Date())}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: { 
      unit: 'in', 
      format: 'letter', 
      orientation: 'portrait',
      compress: false
    },
    pagebreak: { mode: 'avoid-all' }
  };
  pdfTool().set(opt).from(pdfContainer).save();
}

function addPdfText(parent, tagName, text, style = '') {
  const el = document.createElement(tagName);
  el.textContent = text == null ? '' : String(text);
  if (style) el.style.cssText = style;
  parent.appendChild(el);
  return el;
}

function addPdfLineItem(parent, label, value, emphasize = false) {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: ${emphasize ? '14px 0 0' : '9px 0'};
    margin-top: ${emphasize ? '8px' : '0'};
    border-top: ${emphasize ? '2px solid #111827' : '1px solid #e5e7eb'};
    font-size: ${emphasize ? '18px' : '14px'};
    font-weight: ${emphasize ? '800' : '500'};
  `;
  addPdfText(row, 'span', label, 'color: #374151;');
  addPdfText(row, 'strong', value, `color: ${emphasize ? '#111827' : '#1f2937'}; white-space: nowrap;`);
  parent.appendChild(row);
  return row;
}

function addPdfSection(parent, title) {
  const section = document.createElement('section');
  section.style.cssText = 'margin-top: 28px; page-break-inside: avoid;';
  addPdfText(section, 'h2', title, `
    margin: 0 0 10px;
    font-size: 15px;
    letter-spacing: 0;
    color: #111827;
    text-transform: uppercase;
  `);
  parent.appendChild(section);
  return section;
}

function addPdfBullets(parent, lines) {
  const list = document.createElement('ul');
  list.style.cssText = 'margin: 0; padding-left: 20px; color: #374151; line-height: 1.55; font-size: 14px;';
  lines.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    list.appendChild(li);
  });
  parent.appendChild(list);
  return list;
}

function addPdfKeyValueGrid(parent, items) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 22px;';
  items.forEach(({ label, value }) => {
    if (!value) return;
    const item = document.createElement('div');
    addPdfText(item, 'div', label, 'font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px;');
    addPdfText(item, 'div', value, 'font-size: 14px; color: #111827; font-weight: 650;');
    grid.appendChild(item);
  });
  parent.appendChild(grid);
  return grid;
}

function addPdfClientItemizationTable(parent, items) {
  const section = addPdfSection(parent, 'Itemization');
  const table = document.createElement('table');
  table.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #d1d5db;
    font-size: 13px;
  `;

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  [
    { text: 'Item', align: 'left' },
    { text: 'Client Price', align: 'right' },
  ].forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header.text;
    th.style.cssText = `
      background: #f3f4f6;
      color: #374151;
      padding: 10px 12px;
      text-align: ${header.align};
      border-bottom: 1px solid #d1d5db;
      font-size: 11px;
      text-transform: uppercase;
    `;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  items.forEach((item) => {
    const tr = document.createElement('tr');
    const descTd = document.createElement('td');
    descTd.textContent = item.description;
    descTd.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #111827;';
    const amountTd = document.createElement('td');
    amountTd.textContent = item.amount > 0 ? `$${formatNumber(item.amount)}` : 'Included';
    amountTd.style.cssText = 'padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; text-align: right; white-space: nowrap;';
    tr.appendChild(descTd);
    tr.appendChild(amountTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

// Export a customer-safe quote. This intentionally excludes true P&L, internal costs,
// hourly rates, overhead, net profit, and margin.
async function exportClientEstimatePDF() {
  const pdfTool = await waitForHtml2Pdf();
  if (!pdfTool) {
    showNotification('warning', 'Export Tools Loading', 'PDF export tools could not load. Refresh the page and try again.');
    return;
  }

  const job = buildJobFromForm();
  if (!job) {
    showNotification('warning', 'Missing Job Info', 'Enter Company Name, Job Name, Start Date, and End Date before exporting.');
    return;
  }

  const estimate = normalizeClientEstimate(job.clientEstimate || {}, job);
  const clientItems = normalizeClientItems(estimate.items || []);
  const itemizedSubtotal = getClientItemizationSubtotal(estimate);
  const quotedTotal = getClientEstimateTotal(job, estimate);
  const subtotal = estimate.priceOverride > 0 ? quotedTotal : (itemizedSubtotal > 0 ? itemizedSubtotal : parseNumber(job.price));
  const salesTax = (estimate.priceOverride > 0 || !estimate.showTaxLine) ? 0 : parseNumber(job.totalSalesTax);
  const deposit = quotedTotal * (estimate.depositPercent / 100);
  const safeJobName = job.jobName.replace(/[^a-zA-Z0-9]+/g, '_') || 'job';
  const businessName = 'UGX PNL\'S';

  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = `
    width: 800px;
    padding: 42px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    color: #111827;
    background: #ffffff;
  `;

  const header = document.createElement('header');
  header.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 28px;
    align-items: start;
    padding-bottom: 24px;
    border-bottom: 3px solid #111827;
  `;
  const brand = document.createElement('div');
  if (estimate.showLogo && job.logo) {
    const img = document.createElement('img');
    img.src = job.logo;
    img.alt = '';
    img.style.cssText = 'display: block; max-width: 180px; max-height: 78px; object-fit: contain; margin-bottom: 14px;';
    brand.appendChild(img);
  }
  addPdfText(brand, 'div', businessName, 'font-size: 20px; font-weight: 800; color: #111827;');
  addPdfText(brand, 'div', job.jobName, 'font-size: 13px; color: #4b5563; margin-top: 6px; line-height: 1.4;');

  const titleBlock = document.createElement('div');
  titleBlock.style.cssText = 'text-align: right;';
  addPdfText(titleBlock, 'h1', estimate.estimateTitle || 'Project Estimate', 'margin: 0; font-size: 31px; color: #111827; line-height: 1.1;');
  addPdfText(titleBlock, 'div', `Estimate # ${estimate.estimateNumber}`, 'margin-top: 10px; color: #4b5563; font-size: 14px; font-weight: 650;');
  addPdfText(titleBlock, 'div', `Date: ${formatDateInput(estimate.estimateDate) || estimate.estimateDate}`, 'margin-top: 5px; color: #4b5563; font-size: 13px;');
  if (estimate.validUntil) {
    addPdfText(titleBlock, 'div', `Valid until: ${formatDateInput(estimate.validUntil) || estimate.validUntil}`, 'margin-top: 3px; color: #4b5563; font-size: 13px;');
  }
  header.appendChild(brand);
  header.appendChild(titleBlock);
  pdfContainer.appendChild(header);

  const info = document.createElement('section');
  info.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px;';
  const billTo = document.createElement('div');
  addPdfText(billTo, 'h2', 'Bill To', 'margin: 0 0 10px; font-size: 15px; text-transform: uppercase; color: #111827;');
  addPdfText(billTo, 'div', estimate.clientName || job.companyName || 'Client', 'font-size: 17px; font-weight: 750; color: #111827;');
  [estimate.clientEmail, estimate.clientPhone, estimate.projectAddress].filter(Boolean).forEach((line) => {
    addPdfText(billTo, 'div', line, 'font-size: 13px; color: #4b5563; margin-top: 5px; line-height: 1.35;');
  });

  const projectInfo = document.createElement('div');
  addPdfText(projectInfo, 'h2', 'Project', 'margin: 0 0 10px; font-size: 15px; text-transform: uppercase; color: #111827;');
  addPdfKeyValueGrid(projectInfo, [
    { label: 'Job', value: job.jobName },
    { label: 'Customer', value: estimate.clientName || job.companyName || 'Client' },
    { label: 'Duration', value: formatJobDateRange(job) },
    { label: 'Type', value: job.jobType || 'Project' },
    { label: 'Prepared By', value: businessName },
  ]);
  info.appendChild(billTo);
  info.appendChild(projectInfo);
  pdfContainer.appendChild(info);

  const scopeLines = splitLines(estimate.scope);
  const scope = addPdfSection(pdfContainer, 'Scope of Work');
  if (scopeLines.length) {
    addPdfBullets(scope, scopeLines);
  } else {
    addPdfText(scope, 'p', job.jobName || 'Project work as discussed.', 'margin: 0; color: #374151; line-height: 1.55; font-size: 14px;');
  }

  const exclusionLines = splitLines(estimate.exclusions);
  if (exclusionLines.length) {
    addPdfBullets(addPdfSection(pdfContainer, 'Exclusions / Clarifications'), exclusionLines);
  }

  if (clientItems.length) {
    addPdfClientItemizationTable(pdfContainer, clientItems);
  }

  const priceSection = addPdfSection(pdfContainer, 'Price Summary');
  const priceBox = document.createElement('div');
  priceBox.style.cssText = `
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 18px 20px;
    background: #f9fafb;
  `;
  if (estimate.priceOverride > 0) {
    addPdfLineItem(priceBox, 'Quoted Total', `$${formatNumber(quotedTotal)}`, true);
  } else if (estimate.showTaxLine && salesTax > 0) {
    addPdfLineItem(priceBox, 'Subtotal', `$${formatNumber(subtotal)}`);
    addPdfLineItem(priceBox, 'Sales Tax', `$${formatNumber(salesTax)}`);
    addPdfLineItem(priceBox, 'Total', `$${formatNumber(quotedTotal)}`, true);
  } else {
    addPdfLineItem(priceBox, 'Total', `$${formatNumber(quotedTotal)}`, true);
  }
  if (estimate.depositPercent > 0) {
    addPdfLineItem(priceBox, `Deposit Due (${formatNumber(estimate.depositPercent, 0)}%)`, `$${formatNumber(deposit)}`);
  }
  priceSection.appendChild(priceBox);

  const termsLines = splitLines(estimate.terms);
  if (termsLines.length) {
    const terms = addPdfSection(pdfContainer, 'Payment Terms');
    termsLines.forEach((line) => addPdfText(terms, 'p', line, 'margin: 0 0 7px; color: #374151; font-size: 13px; line-height: 1.5;'));
  }

  if (estimate.showSignature) {
    const signature = document.createElement('section');
    signature.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 44px;';
    ['Client Signature', 'Date'].forEach((label) => {
      const field = document.createElement('div');
      field.style.cssText = 'border-top: 1.5px solid #111827; padding-top: 8px; font-size: 12px; color: #4b5563;';
      field.textContent = label;
      signature.appendChild(field);
    });
    pdfContainer.appendChild(signature);
  }

  const footer = document.createElement('footer');
  footer.style.cssText = 'margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; text-align: center;';
  footer.textContent = `Prepared by ${businessName} on ${new Date().toLocaleDateString()}.`;
  pdfContainer.appendChild(footer);

  const opt = {
    margin: [0.35, 0.35, 0.35, 0.35],
    filename: `${safeJobName}_Client_Estimate_${toDateInputValue(new Date())}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'portrait',
      compress: false,
    },
    pagebreak: { mode: ['avoid-all', 'css'] },
  };
  pdfTool().set(opt).from(pdfContainer).save();
  showNotification('success', 'Client Estimate Exported', 'Customer estimate PDF created without internal P&L details.');
}

// Show post-save preview modal
function showPreview(job) {
  const body = document.getElementById('previewModalBody');
  if (!body) return;
  body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <h5>Job Details</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Company:</strong> ${escapeHtml(job.companyName)}</li>
          <li class="list-group-item"><strong>Job:</strong> ${escapeHtml(job.jobName)}</li>
          <li class="list-group-item"><strong>Type:</strong> ${escapeHtml(job.jobType)}</li>
          <li class="list-group-item"><strong>Duration:</strong> ${escapeHtml(formatJobDateRange(job))}</li>
        </ul>
      </div>
      <div class="col-md-6">
        <h5>Financials</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item"><strong>Materials:</strong> $${formatNumber(job.totalMaterials)}</li>
          <li class="list-group-item"><strong>Labor:</strong> $${formatNumber(job.totalLabor)}</li>
          <li class="list-group-item"><strong>Overhead:</strong> $${formatNumber(job.totalOverhead)}</li>
          <li class="list-group-item"><strong>Sales Tax:</strong> $${formatNumber(job.totalSalesTax || 0)}</li>
          <li class="list-group-item"><strong>Other:</strong> $${formatNumber(job.totalOther)}</li>
          <li class="list-group-item"><strong>Contingency:</strong> $${formatNumber(job.totalContingency || 0)}</li>
          <li class="list-group-item"><strong>Total Cost:</strong> $${formatNumber(job.totalCost)}</li>
          <li class="list-group-item"><strong>Price:</strong> $${formatNumber(job.price)}</li>
          <li class="list-group-item"><strong>Net Profit:</strong> $${formatNumber(job.netProfit)}</li>
        </ul>
      </div>
    </div>
    <div class="mt-3">
      <canvas id="previewChart" height="120"></canvas>
    </div>
  `;
  body.appendChild(wrap);
  if (window.bootstrap && typeof bootstrap.Modal === 'function') {
    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    modal.show();
  }
  // Draw chart
  const ctx = document.getElementById('previewChart');
  if (ctx && window.Chart) {
    // Destroy existing chart if it exists
    if (window.previewChartInstance) {
      window.previewChartInstance.destroy();
    }
    
    const data = {
      labels: ['Materials','Labor','Overhead','Sales Tax','Other','Contingency','Net Profit'],
      datasets: [{
        label: 'Cost Breakdown',
        data: [
          parseFloat(job.totalMaterials) || 0,
          parseFloat(job.totalLabor) || 0,
          parseFloat(job.totalOverhead) || 0,
          parseFloat(job.totalSalesTax) || 0,
          parseFloat(job.totalOther) || 0,
          parseFloat(job.totalContingency) || 0,
          parseFloat(job.netProfit) || 0,
        ],
        backgroundColor: ['#0d6efd','#198754','#6c757d','#0dcaf0','#6610f2','#fd7e14','#dc3545'],
      }]
    };
    window.previewChartInstance = new Chart(ctx, { 
      type: 'bar', 
      data, 
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += '$' + formatNumber(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + formatNumber(value, 0);
              }
            }
          }
        }
      } 
    });
  }
}

// CSV import helpers
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = String(text || '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

function importMaterialsCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      rows.forEach((r) => {
        const [desc, qty, unitCost] = r;
        if (desc) addMaterial({ description: desc, quantity: parseNumber(qty) || 0, unitCost: parseNumber(unitCost) || 0, total: (parseNumber(qty)||0) * (parseNumber(unitCost)||0) });
      });
      calculateTotals();
    };
    reader.readAsText(file);
  };
  input.click();
}

function importLaborCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      rows.forEach((r) => {
        const [desc, hours, rate] = r;
        if (desc) addLabor({ description: desc, hours: parseNumber(hours) || 0, rate: parseNumber(rate) || 0, total: (parseNumber(hours)||0) * (parseNumber(rate)||0) });
      });
      calculateTotals();
    };
    reader.readAsText(file);
  };
  input.click();
}

// Export current job as JSON file
function exportJobJSON() {
  // Try to get current job from form
  let job = buildJobFromForm();
  if (!job) {
    alert('Please enter Company Name and Job Name before exporting.');
    return;
  }
  
  // If we have a currentJobId, make sure it's saved
  if (currentJobId) {
    saveCurrentJobToTemp();
    const jobs = loadJobs();
    const savedJob = jobs.find((j) => j.id === currentJobId);
    if (savedJob) {
      job = savedJob;
    }
  }
  const blob = new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' });
  const fileName = `${job.jobName.replace(/[^a-zA-Z0-9]+/g, '_') || 'job'}.json`;
  downloadBlob(blob, fileName);
}

// Import job JSON (merge/replace form values)
function importJobJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const job = JSON.parse(ev.target.result);
        // Minimal validation
        if (!job || typeof job !== 'object') throw new Error('Invalid JSON');
        // Populate fields (do not overwrite id to avoid confusion)
        document.getElementById('companyName').value = job.companyName || '';
        document.getElementById('jobName').value = job.jobName || '';
        // Handle date fields
        if (job.startDate && job.endDate) {
          document.getElementById('startDate').value = job.startDate;
          document.getElementById('endDate').value = job.endDate;
        } else if (job.date) {
          document.getElementById('startDate').value = job.date;
          document.getElementById('endDate').value = job.date;
        }
        document.getElementById('jobType').value = job.jobType || 'Other';
        currentJobType = document.getElementById('jobType').value;
        Calculators.renderCalculator(currentJobType);
        const setSyncedField = (baseId, value) => {
          if (value == null) return;
          const slider = document.getElementById(baseId);
          const number = document.getElementById(baseId + 'Number');
          const label = document.getElementById(baseId + 'Value');
          if (slider) slider.value = value;
          if (number) number.value = value;
          if (label) label.textContent = value;
        };
        setSyncedField('profitMargin', job.profitMargin != null ? job.profitMargin : 10);
        setSyncedField('overheadPercent', job.overheadPercent != null ? job.overheadPercent : 0);
        setSyncedField('salesTaxPercent', job.salesTaxPercent != null ? job.salesTaxPercent : 0);
        setSyncedField('contingencyPercent', job.contingencyPercent != null ? job.contingencyPercent : 0);
	        document.getElementById('notes').value = job.notes || '';
	        setMeasurementData(job.measurement || null);
	        populateClientEstimate(job);
        document.getElementById('overheadCost').value = job.overheadCost != null ? job.overheadCost : 0;
        if (document.getElementById('overheadBase')) document.getElementById('overheadBase').value = job.overheadBase || (job.settings && job.settings.overheadBase) || 'matlabor';
        if (document.getElementById('taxBase')) document.getElementById('taxBase').value = job.taxBase || (job.settings && job.settings.taxBase) || 'materials';
        if (document.getElementById('roundingStep')) document.getElementById('roundingStep').value = job.roundingStep || 0;
        const profitModeEl = document.getElementById(job.profitMode === 'markup' ? 'profitModeMarkup' : 'profitModeMargin');
        if (profitModeEl) profitModeEl.checked = true;
        // Logo (optional)
        if (job.logo) {
          logoDataUrl = job.logo;
          const preview = document.getElementById('logoPreview');
          preview.src = logoDataUrl;
          preview.style.display = 'block';
        }
        // Replace tables
        document.getElementById('materialsBody').innerHTML = '';
        (job.materials || []).forEach((m) => addMaterial(m));
        if (!(job.materials || []).length) addMaterial();
        document.getElementById('laborBody').innerHTML = '';
        (job.labor || []).forEach((l) => addLabor(l));
        if (!(job.labor || []).length) addLabor();
        document.getElementById('otherBody').innerHTML = '';
        (job.other || []).forEach((o) => addOther(o));
        
        // Load yearly breakdown if exists
        if (job.yearlyBreakdown) {
          yearlyBreakdown = job.yearlyBreakdown;
        }
        
        // Recalculate
        calculateProjectDuration();
        calculateTotals();
        showNotification('success', 'Import Successful', 'Job data imported successfully. Review and save.');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Duplicate job as new
function duplicateCurrentJob() {
  // Get current form data
  let job = buildJobFromForm();
  if (!job) {
    alert('Please enter Company Name and Job Name before duplicating.');
    return;
  }
  
  // If we have a saved job, use that instead
  if (currentJobId) {
    saveCurrentJobToTemp();
    const jobs = loadJobs();
    const savedJob = jobs.find((j) => j.id === currentJobId);
    if (savedJob) {
      job = savedJob;
    }
  }
  
  // Create a clone with new ID
  const clone = JSON.parse(JSON.stringify(job));
  clone.id = generateId();
  clone.jobName = `${clone.jobName} (Copy)`;
  
  // Save the clone
  const jobs = loadJobs();
  jobs.push(clone);
  saveJobs(jobs);
  
  // Navigate to the cloned job
  window.location.href = `job_form.html?id=${clone.id}`;
}

// Function to setup slider synchronization
function setupSliderSync(sliderId, numberId, valueId) {
  const slider = document.getElementById(sliderId);
  const numberInput = document.getElementById(numberId);
  const valueSpan = document.getElementById(valueId);
  
  if (slider && numberInput && valueSpan) {
    // Sync slider to number input and value display
    slider.addEventListener('input', () => {
      numberInput.value = slider.value;
      valueSpan.textContent = slider.value;
      calculateTotals();
    });
    
    // Sync number input to slider and value display
    numberInput.addEventListener('input', () => {
      slider.value = numberInput.value;
      valueSpan.textContent = numberInput.value;
      calculateTotals();
    });
  }
}

// Attach calculation updates to overhead and profit inputs
document.getElementById('overheadCost').addEventListener('input', calculateTotals);
document.getElementById('overheadPercent').addEventListener('input', calculateTotals);
document.getElementById('profitMargin').addEventListener('input', calculateTotals);
if (document.getElementById('salesTaxPercent')) document.getElementById('salesTaxPercent').addEventListener('input', calculateTotals);
if (document.getElementById('contingencyPercent')) document.getElementById('contingencyPercent').addEventListener('input', calculateTotals);
if (document.getElementById('roundingStep')) document.getElementById('roundingStep').addEventListener('change', calculateTotals);
if (document.getElementById('overheadBase')) document.getElementById('overheadBase').addEventListener('change', calculateTotals);
if (document.getElementById('taxBase')) document.getElementById('taxBase').addEventListener('change', calculateTotals);
document.querySelectorAll('input[name="profitMode"]').forEach((el) => el.addEventListener('change', () => {
  const modeEl = document.querySelector('input[name="profitMode"]:checked');
  const mode = modeEl ? modeEl.value : 'margin';
  const slider = document.getElementById('profitMargin');
  const number = document.getElementById('profitMarginNumber');
  if (slider && number) {
    if (mode === 'margin') {
      slider.max = '99';
      number.max = '99';
    } else {
      slider.max = '500';
      number.max = '500';
    }
  }
  calculateTotals();
}));

Object.assign(window, {
  addMaterial,
  addLabor,
  addOther,
  addClientEstimateItem,
  buildClientItemizationFromJob,
  populateClientScopeFromJob,
  saveJob,
  saveJobToServer,
  deleteJob,
  exportExcel,
  exportPDF,
  exportClientEstimatePDF,
  exportJobJSON,
  importJobJSON,
  importMaterialsCSV,
  importLaborCSV,
  duplicateCurrentJob,
  calculateTotals,
  calculateProjectDuration,
  collectFormJob,
});

// Initialize page on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  const user = window.Auth ? await Auth.requireAuth() : null;
  if (window.Auth && !user) return;
  if (user && user.role === 'admin') {
    const adminLink = document.getElementById('navAdminLink');
    if (adminLink) adminLink.style.display = '';
  }

  await loadJob();
  document.querySelectorAll('[data-client-estimate-field]').forEach((field) => {
    const eventName = field.type === 'checkbox' ? 'change' : 'input';
    field.addEventListener(eventName, updateClientEstimatePreview);
  });
  ['companyName', 'jobName'].forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;
    field.addEventListener('blur', () => {
      const clientName = document.getElementById('clientName');
      if (id === 'companyName' && clientName && !clientName.value.trim()) {
        clientName.value = field.value.trim();
      }
      updateClientEstimatePreview();
    });
  });
  
  // Global calculator render helper
  window.renderCalculatorForCurrentJobType = function() {
    const jobTypeEl = document.getElementById('jobType');
    const container = document.getElementById('calculatorContainer');
    if (!jobTypeEl || !container) return false;
    
    const jobType = jobTypeEl.value;
    if (!jobType) return false;
    
    if (typeof Calculators !== 'undefined' && typeof Calculators.renderCalculator === 'function') {
      try {
        Calculators.renderCalculator(jobType);
        return true;
      } catch (e) {
        console.error('Error rendering calculator:', e);
        return false;
      }
    }
    return false;
  };
  
  // Ensure calculator renders even if other scripts delay
  function ensureCalculatorRendered(retries = 10) {
    const container = document.getElementById('calculatorContainer');
    const jobTypeEl = document.getElementById('jobType');
    if (!container || !jobTypeEl) return;
    
    // Check if already rendered
    if (container.childElementCount > 0) return;
    
    // Try to render
    const success = window.renderCalculatorForCurrentJobType();
    
    // Retry if needed
    if (!success && retries > 0) {
      setTimeout(() => ensureCalculatorRendered(retries - 1), 100);
    }
  }
  
  // Initial render attempt
  setTimeout(() => ensureCalculatorRendered(), 50);
  
  // Setup slider synchronization
  setupSliderSync('profitMargin', 'profitMarginNumber', 'profitMarginValue');
  setupSliderSync('overheadPercent', 'overheadPercentNumber', 'overheadPercentValue');
  setupSliderSync('salesTaxPercent', 'salesTaxPercentNumber', 'salesTaxPercentValue');
  setupSliderSync('contingencyPercent', 'contingencyPercentNumber', 'contingencyPercentValue');
  
  const jobTypeEl = document.getElementById('jobType');
  jobTypeEl.addEventListener('change', () => {
    currentJobType = jobTypeEl.value;
    
    try {
      if (typeof Calculators !== 'undefined' && typeof Calculators.renderCalculator === 'function') {
        Calculators.renderCalculator(currentJobType);
      } else {
        console.error('Calculators.renderCalculator not available');
      }
    } catch (e) {
      console.error('Error rendering calculator:', e);
    }
    
    // Double-check render in case of race conditions
    setTimeout(() => {
      const container = document.getElementById('calculatorContainer');
      if (container && container.childElementCount === 0) {
        if (typeof Calculators !== 'undefined' && typeof Calculators.renderCalculator === 'function') {
          try {
            Calculators.renderCalculator(currentJobType);
          } catch (e) {
            console.error('Error on re-render:', e);
          }
        }
      }
    }, 50);
  });
  
  // Date change listeners
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  
  if (startDateEl) {
    startDateEl.addEventListener('change', calculateProjectDuration);
  }
  
  if (endDateEl) {
    endDateEl.addEventListener('change', calculateProjectDuration);
  }
  
  // Calculate duration after page load
  setTimeout(calculateProjectDuration, 100);
  // Autosave draft and unsaved-change guard
  let formDirty = false;
  window.markFormClean = function() {
    formDirty = false;
    localStorage.removeItem('draft_job');
  };
  const formEl = document.getElementById('jobForm');
  if (formEl) {
    formEl.addEventListener('input', () => {
      formDirty = true;
      if (window._autosaveTimer) clearTimeout(window._autosaveTimer);
      window._autosaveTimer = setTimeout(() => {
        try {
          const companyName = document.getElementById('companyName').value.trim();
          const jobName = document.getElementById('jobName').value.trim();
          const startDate = document.getElementById('startDate').value;
          const endDate = document.getElementById('endDate').value;
          const jobType = document.getElementById('jobType').value || 'Other';
          const profitMargin = parseFloat(document.getElementById('profitMargin').value) || 0;
          const overheadCost = parseFloat(document.getElementById('overheadCost').value) || 0;
          const overheadPercent = parseFloat(document.getElementById('overheadPercent').value) || 0;
          const draft = { companyName, jobName, startDate, endDate, jobType, profitMargin, overheadCost, overheadPercent };
          showAutoSaveIndicator('saving');
          localStorage.setItem('draft_job', JSON.stringify(draft));
          showAutoSaveIndicator('saved');
        } catch (e) {
          console.error('Auto-save failed:', e);
        }
      }, 1500);
    });
  }
  window.addEventListener('beforeunload', (e) => {
    if (formDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  if (!getQueryParam('id')) {
    try {
      const draftRaw = localStorage.getItem('draft_job');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft.companyName) document.getElementById('companyName').value = draft.companyName;
        if (draft.jobName) document.getElementById('jobName').value = draft.jobName;
        // Handle date fields from draft
        if (draft.startDate) document.getElementById('startDate').value = draft.startDate;
        if (draft.endDate) document.getElementById('endDate').value = draft.endDate;
        // Legacy support
        if (draft.jobDate && !draft.startDate) {
          document.getElementById('startDate').value = draft.jobDate;
          document.getElementById('endDate').value = draft.jobDate;
        }
        if (draft.jobType) document.getElementById('jobType').value = draft.jobType;
        if (draft.profitMargin != null) document.getElementById('profitMargin').value = draft.profitMargin;
        if (draft.overheadCost != null) document.getElementById('overheadCost').value = draft.overheadCost;
        if (draft.overheadPercent != null) document.getElementById('overheadPercent').value = draft.overheadPercent;
      }
    } catch (e) {}
  }
  const originalSaveJob = window.saveJob;
  window.saveJob = function() {
    window.markFormClean();
    return originalSaveJob.apply(this, arguments);
  };
  // Disable Save to Server if server not reachable
  const saveServerBtn = document.querySelector('button[onclick="saveJobToServer()"]');
  if (saveServerBtn) {
    API.apiHealthCheck().then((h) => {
      if (!h || h.status !== 'ok') {
        saveServerBtn.disabled = true;
        saveServerBtn.title = 'Server unreachable';
      }
    }).catch(() => {
      saveServerBtn.disabled = true;
      saveServerBtn.title = 'Server unreachable';
    });
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveJob();
    }
    
    // Ctrl/Cmd + P to export PDF
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      exportPDF();
    }
    
    // Ctrl/Cmd + E to export Excel
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      exportExcel();
    }
    
    // Ctrl/Cmd + M to add material
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      addMaterial();
      // Focus on the new material description
      const rows = document.querySelectorAll('#materialsBody tr');
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const descInput = lastRow.querySelector('input');
        if (descInput) descInput.focus();
      }
    }
    
    // Ctrl/Cmd + L to add labor
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      addLabor();
      // Focus on the new labor description
      const rows = document.querySelectorAll('#laborBody tr');
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const descInput = lastRow.querySelector('input');
        if (descInput) descInput.focus();
      }
    }
  });
  
  // Add keyboard shortcut hints to buttons
  const addShortcutHint = (buttonText, shortcut) => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent.includes(buttonText));
    buttons.forEach(btn => {
      if (!btn.title) {
        btn.title = `${shortcut}`;
      } else {
        btn.title += ` (${shortcut})`;
      }
    });
  };
  
  setTimeout(() => {
    addShortcutHint('Save Job', 'Ctrl+S');
    addShortcutHint('Export to PDF', 'Ctrl+P');
    addShortcutHint('Export to Excel', 'Ctrl+E');
    addShortcutHint('Add Material', 'Ctrl+M');
    addShortcutHint('Add Labor', 'Ctrl+L');
  }, 100);
});
