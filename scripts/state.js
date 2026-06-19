/** Application state and business logic */

import { saveState } from './storage.js';
import {
  validateTitle,
  validateDuration,
  validateDate,
  validateTag,
  validateCap,
} from './validators.js';

let state = null;
const listeners = [];

export function initState(initial) {
  state = initial;
  return state;
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify() {
  saveState(state);
  listeners.forEach((fn) => fn(state));
}

function generateId() {
  const id = `rec_${String(state.nextId).padStart(4, '0')}`;
  state.nextId += 1;
  return id;
}

export function addRecord(fields) {
  const titleResult = validateTitle(fields.title);
  const dateResult = validateDate(fields.dueDate);
  const durationResult = validateDuration(fields.duration, state.settings.displayUnit);
  const tagResult = validateTag(fields.tag);

  const errors = {};
  if (!titleResult.valid) errors.title = titleResult.error;
  if (!dateResult.valid) errors.dueDate = dateResult.error;
  if (!durationResult.valid) errors.duration = durationResult.error;
  if (!tagResult.valid) errors.tag = tagResult.error;

  if (Object.keys(errors).length) return { success: false, errors };

  const now = new Date().toISOString();
  const record = {
    id: generateId(),
    title: titleResult.value,
    dueDate: dateResult.value,
    duration: durationResult.value,
    tag: tagResult.value,
    createdAt: now,
    updatedAt: now,
  };

  state.records.push(record);
  notify();
  return { success: true, record };
}

export function updateRecord(id, fields) {
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, errors: { form: 'Record not found.' } };

  const titleResult = validateTitle(fields.title);
  const dateResult = validateDate(fields.dueDate);
  const durationResult = validateDuration(fields.duration, state.settings.displayUnit);
  const tagResult = validateTag(fields.tag);

  const errors = {};
  if (!titleResult.valid) errors.title = titleResult.error;
  if (!dateResult.valid) errors.dueDate = dateResult.error;
  if (!durationResult.valid) errors.duration = durationResult.error;
  if (!tagResult.valid) errors.tag = tagResult.error;

  if (Object.keys(errors).length) return { success: false, errors };

  state.records[idx] = {
    ...state.records[idx],
    title: titleResult.value,
    dueDate: dateResult.value,
    duration: durationResult.value,
    tag: tagResult.value,
    updatedAt: new Date().toISOString(),
  };

  notify();
  return { success: true, record: state.records[idx] };
}

export function deleteRecord(id) {
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  state.records.splice(idx, 1);
  notify();
  return true;
}

export function setDisplayUnit(unit) {
  state.settings.displayUnit = unit;
  notify();
}

export function setWeeklyCap(value) {
  const result = validateCap(value, state.settings.displayUnit);
  if (!result.valid) return { success: false, error: result.error };
  state.settings.weeklyCap = result.value;
  notify();
  return { success: true };
}

export function setTags(tags) {
  state.settings.tags = tags;
  notify();
}

export function replaceState(newState) {
  state = newState;
  notify();
}

export function clearAll() {
  state.records = [];
  state.nextId = 1;
  notify();
}

/** Convert stored minutes to display value */
export function toDisplayDuration(minutes) {
  if (state.settings.displayUnit === 'hours') {
    const hours = minutes / 60;
    return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, '');
  }
  return String(minutes);
}

export function formatDurationLabel(minutes) {
  const unit = state.settings.displayUnit;
  const val = toDisplayDuration(minutes);
  return `${val} ${unit}`;
}

export function getStats() {
  const records = state.records;
  const totalRecords = records.length;
  const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);

  const tagCounts = {};
  records.forEach((r) => {
    tagCounts[r.tag] = (tagCounts[r.tag] || 0) + 1;
  });
  const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const total = records
      .filter((r) => r.dueDate === dateStr)
      .reduce((sum, r) => sum + r.duration, 0);
    trend.push({ date: dateStr, label: dayLabel, total });
  }

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = today.toISOString().slice(0, 10);
  const weekDuration = records
    .filter((r) => r.dueDate >= weekStartStr && r.dueDate <= weekEndStr)
    .reduce((sum, r) => sum + r.duration, 0);

  const cap = state.settings.weeklyCap;
  let capStatus = null;
  if (cap != null) {
    const remaining = cap - weekDuration;
    capStatus = {
      cap,
      used: weekDuration,
      remaining,
      exceeded: remaining < 0,
    };
  }

  return {
    totalRecords,
    totalDuration,
    topTag: topTag ? topTag[0] : null,
    topTagCount: topTag ? topTag[1] : 0,
    trend,
    capStatus,
  };
}

export function sortRecords(records, field, direction) {
  const sorted = [...records];
  const mult = direction === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    if (field === 'title') {
      return mult * a.title.localeCompare(b.title);
    }
    if (field === 'duration') {
      return mult * (a.duration - b.duration);
    }
    return mult * a.dueDate.localeCompare(b.dueDate);
  });

  return sorted;
}
