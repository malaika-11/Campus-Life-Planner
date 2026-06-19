/** Regex validation rules for Campus Life Planner */

export const PATTERNS = {
  title: /^\S(?:.*\S)?$/,
  duration: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  duplicateWord: /\b(\w+)\s+\1\b/i,
  doubleSpace: /  /,
};

/**
 * Normalize title: trim edges and collapse internal double spaces.
 */
export function normalizeTitle(value) {
  return value.trim().replace(/  +/g, ' ');
}

export function validateTitle(value) {
  const normalized = normalizeTitle(value);
  if (!normalized) {
    return { valid: false, error: 'Title is required.', value: normalized };
  }
  if (!PATTERNS.title.test(normalized)) {
    return { valid: false, error: 'Title cannot start or end with spaces.', value: normalized };
  }
  if (PATTERNS.doubleSpace.test(value)) {
    return { valid: false, error: 'Title cannot contain double spaces.', value: normalized };
  }
  if (PATTERNS.duplicateWord.test(normalized)) {
    return { valid: false, error: 'Title contains duplicate consecutive words.', value: normalized };
  }
  return { valid: true, error: null, value: normalized };
}

export function validateDuration(value, displayUnit = 'minutes') {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { valid: false, error: 'Duration is required.', value: null };
  }
  if (!PATTERNS.duration.test(trimmed)) {
    return {
      valid: false,
      error: 'Duration must be a non-negative number with up to 2 decimal places.',
      value: null,
    };
  }
  let minutes = parseFloat(trimmed);
  if (displayUnit === 'hours') {
    minutes = minutes * 60;
  }
  return { valid: true, error: null, value: minutes };
}

export function validateDate(value) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { valid: false, error: 'Due date is required.', value: null };
  }
  if (!PATTERNS.date.test(trimmed)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format.', value: null };
  }
  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false, error: 'Date is not a valid calendar date.', value: null };
  }
  return { valid: true, error: null, value: trimmed };
}

export function validateTag(value) {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { valid: false, error: 'Tag is required.', value: null };
  }
  if (!PATTERNS.tag.test(trimmed)) {
    return {
      valid: false,
      error: 'Tag may only contain letters, spaces, and hyphens.',
      value: null,
    };
  }
  return { valid: true, error: null, value: trimmed };
}

export function validateCap(value, displayUnit = 'minutes') {
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { valid: true, error: null, value: null };
  }
  if (!PATTERNS.duration.test(trimmed)) {
    return {
      valid: false,
      error: 'Cap must be a non-negative number with up to 2 decimal places.',
      value: null,
    };
  }
  let minutes = parseFloat(trimmed);
  if (displayUnit === 'hours') {
    minutes = minutes * 60;
  }
  return { valid: true, error: null, value: minutes };
}

export function validateRecord(record) {
  const titleResult = validateTitle(record.title ?? '');
  const dateResult = validateDate(record.dueDate ?? '');
  const durationResult = validateDuration(String(record.duration ?? ''), 'minutes');
  const tagResult = validateTag(record.tag ?? '');

  return (
    titleResult.valid &&
    dateResult.valid &&
    durationResult.valid &&
    tagResult.valid &&
    typeof record.id === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}
