/** localStorage persistence and JSON import/export */

import { validateRecord } from './validators.js';

export const STORAGE_KEY = 'campusLifePlanner';

export const DEFAULT_TAGS = ['Study', 'Events', 'Personal', 'Work', 'Health', 'Other'];

export function createDefaultState() {
  return {
    records: [],
    settings: {
      displayUnit: 'minutes',
      weeklyCap: null,
      tags: [...DEFAULT_TAGS],
    },
    nextId: 1,
  };
}

const REQUIRED_RECORD_KEYS = ['id', 'title', 'dueDate', 'duration', 'tag', 'createdAt', 'updatedAt'];

export function validateRecordStructure(record) {
  if (!record || typeof record !== 'object') return false;
  return REQUIRED_RECORD_KEYS.every((key) => {
    const val = record[key];
    return val !== undefined && val !== null && val !== '';
  });
}

export function validateImportedData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON: expected an object.' };
  }
  if (!Array.isArray(data.records)) {
    return { valid: false, error: 'Invalid JSON: "records" must be an array.' };
  }
  for (let i = 0; i < data.records.length; i++) {
    const rec = data.records[i];
    if (!validateRecordStructure(rec)) {
      return { valid: false, error: `Record at index ${i} is missing required fields.` };
    }
    if (!validateRecord(rec)) {
      return { valid: false, error: `Record at index ${i} failed validation.` };
    }
  }
  if (data.settings && typeof data.settings !== 'object') {
    return { valid: false, error: 'Invalid JSON: "settings" must be an object.' };
  }
  return { valid: true, error: null };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw);
    const check = validateImportedData(parsed);
    if (!check.valid) {
      console.warn('Stored data invalid, resetting:', check.error);
      return createDefaultState();
    }

    return {
      records: parsed.records,
      settings: {
        displayUnit: parsed.settings?.displayUnit ?? 'minutes',
        weeklyCap: parsed.settings?.weeklyCap ?? null,
        tags: Array.isArray(parsed.settings?.tags) ? parsed.settings.tags : [...DEFAULT_TAGS],
      },
      nextId: parsed.nextId ?? parsed.records.length + 1,
    };
  } catch (err) {
    console.error('Failed to load state:', err);
    return createDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Failed to save state:', err);
    return false;
  }
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campus-life-planner-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importStateFromFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const check = validateImportedData(parsed);
    if (!check.valid) {
      return { success: false, error: check.error };
    }
    return {
      success: true,
      state: {
        records: parsed.records,
        settings: {
          displayUnit: parsed.settings?.displayUnit ?? 'minutes',
          weeklyCap: parsed.settings?.weeklyCap ?? null,
          tags: Array.isArray(parsed.settings?.tags) ? parsed.settings.tags : [...DEFAULT_TAGS],
        },
        nextId: parsed.nextId ?? parsed.records.length + 1,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to parse JSON: ${err.message}` };
  }
}

export async function loadSeedData() {
  try {
    const response = await fetch('seed.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await response.json();
    const check = validateImportedData(parsed);
    if (!check.valid) return { success: false, error: check.error };
    return {
      success: true,
      state: {
        records: parsed.records,
        settings: {
          displayUnit: parsed.settings?.displayUnit ?? 'minutes',
          weeklyCap: parsed.settings?.weeklyCap ?? null,
          tags: Array.isArray(parsed.settings?.tags) ? parsed.settings.tags : [...DEFAULT_TAGS],
        },
        nextId: parsed.nextId ?? parsed.records.length + 1,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to load seed data: ${err.message}` };
  }
}
