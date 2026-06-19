/** Regex search: compile, filter, and highlight */

/**
 * Escape HTML entities to prevent XSS when inserting highlights.
 */
export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}

/**
 * Compile a user-provided regex pattern safely.
 * Supports @tag:Name shorthand as a tag filter.
 */
export function compilePattern(raw, caseInsensitive = true) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { regex: null, tagFilter: null, error: null };
  }

  const tagMatch = trimmed.match(/^@tag:(\w+)$/i);
  if (tagMatch) {
    return { regex: null, tagFilter: tagMatch[1], error: null };
  }

  try {
    const flags = caseInsensitive ? 'i' : '';
    return { regex: new RegExp(trimmed, flags), tagFilter: null, error: null };
  } catch (err) {
    return { regex: null, tagFilter: null, error: err.message };
  }
}

/**
 * Test whether a record matches the current search.
 */
export function recordMatches(record, compiled) {
  if (!compiled) return true;

  if (compiled.tagFilter) {
    return record.tag.toLowerCase() === compiled.tagFilter.toLowerCase();
  }

  if (!compiled.regex) return true;

  const haystack = `${record.title} ${record.dueDate} ${record.duration} ${record.tag}`;
  return compiled.regex.test(haystack);
}

/**
 * Highlight regex matches in text using <mark> tags.
 */
export function highlightMatches(text, regex) {
  if (!regex || !text) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const source = regex.source;
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(source, flags);

  return escaped.replace(globalRegex, (match) => `<mark>${match}</mark>`);
}

/**
 * Highlight all searchable fields of a record.
 */
export function highlightRecordFields(record, regex) {
  return {
    title: highlightMatches(record.title, regex),
    dueDate: highlightMatches(record.dueDate, regex),
    duration: highlightMatches(String(record.duration), regex),
    tag: highlightMatches(record.tag, regex),
  };
}
