/** DOM rendering, events, and accessibility announcements */

import {
  getState,
  subscribe,
  addRecord,
  updateRecord,
  deleteRecord,
  setDisplayUnit,
  setWeeklyCap,
  setTags,
  replaceState,
  clearAll,
  sortRecords,
  formatDurationLabel,
  toDisplayDuration,
  getStats,
} from './state.js';

import {
  compilePattern,
  recordMatches,
  highlightRecordFields,
} from './search.js';

import {
  exportState,
  importStateFromFile,
  loadSeedData,
} from './storage.js';

let sortField = 'dueDate';
let sortDirection = 'asc';
let searchPattern = '';
let searchCaseInsensitive = true;
let editingId = null;
let lastAddedId = null;
let lastCapMessage = '';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function announce(message, assertive = false) {
  const el = assertive ? $('#live-assertive') : $('#live-polite');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

function showFieldError(fieldId, message) {
  const input = $(`#${fieldId}`);
  const errorEl = $(`#${fieldId}-error`);
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }
}

function clearFormErrors() {
  ['title', 'dueDate', 'duration', 'tag'].forEach((f) => showFieldError(f, null));
}

function populateTagSuggestions() {
  const state = getState();
  const datalist = $('#tag-suggestions');
  if (!datalist) return;
  datalist.innerHTML = state.settings.tags
    .map((t) => `<option value="${t}">`)
    .join('');
}

function syncSettingsForm() {
  const state = getState();
  const unit = state.settings.displayUnit;
  $('#display-unit').value = unit;
  $('#duration-unit-label').textContent = unit;
  $('#cap-unit-label').textContent = unit;
  $('#custom-tags').value = state.settings.tags.join(', ');
  if (state.settings.weeklyCap != null) {
    $('#weekly-cap').value = toDisplayDuration(state.settings.weeklyCap);
  } else {
    $('#weekly-cap').value = '';
  }
}

function renderStats() {
  const stats = getStats();
  const state = getState();
  const unit = state.settings.displayUnit;

  $('#stat-total').textContent = stats.totalRecords;
  $('#stat-duration').textContent = formatDurationLabel(stats.totalDuration);
  $('#stat-top-tag').textContent = stats.topTag
    ? `${stats.topTag} (${stats.topTagCount})`
    : '—';

  const capCard = $('#stat-cap-card');
  capCard.classList.remove('cap-ok', 'cap-warn', 'cap-exceeded');

  if (stats.capStatus) {
    const { cap, used, remaining, exceeded } = stats.capStatus;
    const capDisplay = toDisplayDuration(cap);
    const usedDisplay = toDisplayDuration(used);
    $('#stat-cap-display').textContent = `${usedDisplay} / ${capDisplay} ${unit}`;

    let capMessage = '';
    if (exceeded) {
      capCard.classList.add('cap-exceeded');
      const over = toDisplayDuration(Math.abs(remaining));
      $('#stat-cap-remaining').textContent = `Over cap by ${over} ${unit}`;
      capMessage = `Weekly cap exceeded by ${over} ${unit}.`;
    } else if (remaining <= cap * 0.1) {
      capCard.classList.add('cap-warn');
      const rem = toDisplayDuration(remaining);
      $('#stat-cap-remaining').textContent = `${rem} ${unit} remaining`;
      capMessage = `${rem} ${unit} remaining until weekly cap.`;
    } else {
      capCard.classList.add('cap-ok');
      const rem = toDisplayDuration(remaining);
      $('#stat-cap-remaining').textContent = `${rem} ${unit} remaining`;
      capMessage = `${rem} ${unit} remaining until weekly cap.`;
    }

    if (capMessage !== lastCapMessage) {
      lastCapMessage = capMessage;
      announce(capMessage, exceeded);
    }
  } else {
    lastCapMessage = '';
    $('#stat-cap-display').textContent = 'Not set';
    $('#stat-cap-remaining').textContent = 'Set a cap in Settings';
  }

  renderTrendChart(stats.trend, unit);
}

function renderTrendChart(trend, unit) {
  const chart = $('#trend-chart');
  if (!chart) return;

  const max = Math.max(...trend.map((d) => d.total), 1);

  chart.innerHTML = trend
    .map((day) => {
      const pct = Math.round((day.total / max) * 100);
      const display = toDisplayDuration(day.total);
      return `
        <div class="trend-bar-wrap">
          <span class="trend-value">${display}</span>
          <div class="trend-bar" style="height: ${Math.max(pct, 4)}%" title="${day.date}: ${display} ${unit}"></div>
          <span class="trend-label">${day.label}</span>
        </div>`;
    })
    .join('');
}

function getFilteredRecords() {
  const state = getState();
  const compiled = compilePattern(searchPattern, searchCaseInsensitive);
  const filtered = state.records.filter((r) => recordMatches(r, compiled));
  return { filtered, compiled };
}

function buildActionButtons(record) {
  return `
    <button type="button" class="btn btn-sm btn-secondary edit-btn" data-id="${record.id}">Edit</button>
    <button type="button" class="btn btn-sm btn-danger delete-btn" data-id="${record.id}">Delete</button>`;
}

function renderRecords() {
  const { filtered, compiled } = getFilteredRecords();
  const sorted = sortRecords(filtered, sortField, sortDirection);
  const regex = compiled?.regex ?? null;

  $('#records-count').textContent = `Showing ${sorted.length} of ${getState().records.length} records`;

  const emptyEl = $('#empty-records');
  if (emptyEl) emptyEl.hidden = sorted.length > 0;

  const tbody = $('#records-tbody');
  tbody.innerHTML = sorted
    .map((record) => {
      const hl = highlightRecordFields(record, regex);
      const isNew = record.id === lastAddedId ? ' is-new' : '';
      const isEditing = record.id === editingId ? ' is-editing' : '';
      return `
        <tr class="record-row${isNew}${isEditing}" data-id="${record.id}">
          <td>${hl.title}</td>
          <td>${hl.dueDate}</td>
          <td>${regex && hl.duration.includes('<mark>') ? `${hl.duration} min` : formatDurationLabel(record.duration)}</td>
          <td><span class="tag-badge">${hl.tag}</span></td>
          <td>${buildActionButtons(record)}</td>
        </tr>`;
    })
    .join('');

  const cards = $('#records-cards');
  cards.innerHTML = sorted
    .map((record) => {
      const hl = highlightRecordFields(record, regex);
      const isNew = record.id === lastAddedId ? ' is-new' : '';
      return `
        <article class="record-card${isNew}" data-id="${record.id}">
          <div class="record-card-header">
            <h3 class="record-card-title">${hl.title}</h3>
            <span class="tag-badge">${hl.tag}</span>
          </div>
          <p class="record-card-meta">Due: ${hl.dueDate}</p>
          <p class="record-card-meta">Duration: ${formatDurationLabel(record.duration)}</p>
          <div class="record-card-actions">${buildActionButtons(record)}</div>
        </article>`;
    })
    .join('');

  lastAddedId = null;
}

function renderSearchError() {
  const compiled = compilePattern(searchPattern, searchCaseInsensitive);
  const errorEl = $('#search-error');
  if (compiled.error) {
    errorEl.textContent = `Invalid regex: ${compiled.error}`;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}

function renderAll() {
  populateTagSuggestions();
  syncSettingsForm();
  renderStats();
  renderRecords();
  renderSearchError();
}

function resetForm() {
  editingId = null;
  $('#edit-id').value = '';
  $('#record-form').reset();
  $('#form-heading').textContent = 'Add Record';
  $('#submit-btn').textContent = 'Add Record';
  $('#cancel-edit-btn').hidden = true;
  clearFormErrors();
  $('#form-status').textContent = '';
}

function startEdit(id) {
  const record = getState().records.find((r) => r.id === id);
  if (!record) return;

  editingId = id;
  $('#edit-id').value = id;
  $('#title').value = record.title;
  $('#dueDate').value = record.dueDate;
  $('#duration').value = toDisplayDuration(record.duration);
  $('#tag').value = record.tag;
  $('#form-heading').textContent = 'Edit Record';
  $('#submit-btn').textContent = 'Save Changes';
  $('#cancel-edit-btn').hidden = false;
  clearFormErrors();
  $('#add-form').scrollIntoView({ behavior: 'smooth' });
  $('#title').focus();
}

function handleFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const fields = {
    title: $('#title').value,
    dueDate: $('#dueDate').value,
    duration: $('#duration').value,
    tag: $('#tag').value,
  };

  const id = $('#edit-id').value;
  const result = id ? updateRecord(id, fields) : addRecord(fields);

  if (!result.success) {
    Object.entries(result.errors).forEach(([field, msg]) => showFieldError(field, msg));
    announce('Form has validation errors. Please review the fields.');
    return;
  }

  if (!id) lastAddedId = result.record.id;
  resetForm();
  const msg = id ? 'Record updated successfully.' : 'Record added successfully.';
  $('#form-status').textContent = msg;
  announce(msg);
}

function handleDelete(id) {
  const record = getState().records.find((r) => r.id === id);
  if (!record) return;

  const confirmed = window.confirm(`Delete "${record.title}"? This cannot be undone.`);
  if (!confirmed) return;

  deleteRecord(id);
  if (editingId === id) resetForm();
  announce(`Deleted record: ${record.title}.`);
}

function handleSortClick(e) {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;

  const field = btn.dataset.sort;
  if (sortField === field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDirection = field === 'duration' ? 'desc' : 'asc';
  }

  $$('.sort-btn').forEach((b) => {
    const active = b.dataset.sort === sortField;
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (active) {
      b.textContent = `${b.dataset.sort === 'dueDate' ? 'Date' : b.dataset.sort === 'title' ? 'Title' : 'Duration'} ${sortDirection === 'asc' ? '↑' : '↓'}`;
    } else {
      b.textContent = b.dataset.sort === 'dueDate' ? 'Date' : b.dataset.sort === 'title' ? 'Title' : 'Duration';
    }
  });

  renderRecords();
}

function bindEvents() {
  $('#record-form').addEventListener('submit', handleFormSubmit);
  $('#cancel-edit-btn').addEventListener('click', resetForm);

  $('#search-pattern').addEventListener('input', (e) => {
    searchPattern = e.target.value;
    renderRecords();
    renderSearchError();
  });

  $('#search-case-insensitive').addEventListener('change', (e) => {
    searchCaseInsensitive = e.target.checked;
    renderRecords();
    renderSearchError();
  });

  $$('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', handleSortClick);
  });

  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    if (editBtn) startEdit(editBtn.dataset.id);
    if (deleteBtn) handleDelete(deleteBtn.dataset.id);
  });

  $('#display-unit').addEventListener('change', (e) => {
    setDisplayUnit(e.target.value);
    announce(`Display unit changed to ${e.target.value}.`);
  });

  $('#weekly-cap').addEventListener('change', (e) => {
    const result = setWeeklyCap(e.target.value);
    const capError = $('#cap-error');
    if (!result.success) {
      capError.textContent = result.error;
      capError.hidden = false;
      announce(result.error);
    } else {
      capError.hidden = true;
      capError.textContent = '';
      announce('Weekly cap updated.');
    }
  });

  $('#save-tags-btn').addEventListener('click', () => {
    const raw = $('#custom-tags').value;
    const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    if (!tags.length) {
      $('#settings-status').textContent = 'At least one tag is required.';
      return;
    }
    setTags(tags);
    $('#settings-status').textContent = 'Tags saved.';
    announce('Default tags updated.');
  });

  $('#export-btn').addEventListener('click', () => {
    exportState(getState());
    $('#settings-status').textContent = 'Data exported.';
    announce('Data exported to JSON file.');
  });

  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const result = await importStateFromFile(file);
    if (!result.success) {
      $('#settings-status').textContent = result.error;
      announce(result.error, true);
    } else {
      replaceState(result.state);
      resetForm();
      $('#settings-status').textContent = 'Data imported successfully.';
      announce('Data imported successfully.');
    }
    e.target.value = '';
  });

  $('#load-seed-btn').addEventListener('click', async () => {
    const result = await loadSeedData();
    if (!result.success) {
      $('#settings-status').textContent = result.error;
      announce(result.error, true);
    } else {
      replaceState(result.state);
      resetForm();
      $('#settings-status').textContent = 'Seed data loaded.';
      announce('Sample seed data loaded.');
    }
  });

  $('#clear-data-btn').addEventListener('click', () => {
    const confirmed = window.confirm('Clear all records? Settings will be kept.');
    if (!confirmed) return;
    clearAll();
    resetForm();
    $('#settings-status').textContent = 'All records cleared.';
    announce('All records cleared.');
  });
}

export function initUI() {
  bindEvents();
  subscribe(() => renderAll());
  renderAll();
}
