/** Helpers shared by the API mappers: pure, no I/O. */

export const OPEN_LIBRARY_ID_PREFIX = 'ol-';

const YEAR_PATTERN = /^\d{4}/;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const ISBN_PATTERN = /^(?:\d{9}[\dX]|\d{13})$/;

/** Treats any JSON value as an object, so missing fields read as `undefined`. */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(nonEmptyString).filter((item): item is string => item !== null);
}

/** Year from dates like `2021`, `2021-05` or `2021-05-04`. */
export function yearFromDate(value: unknown): number | null {
  if (typeof value === 'number') return positiveInteger(value);
  const match = nonEmptyString(value)?.match(YEAR_PATTERN);
  return match ? Number(match[0]) : null;
}

/** Removes HTML tags and collapses whitespace (Google Books descriptions may contain markup). */
export function toPlainText(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text) return null;
  return nonEmptyString(text.replace(HTML_TAG_PATTERN, ' ').replace(/\s+/g, ' '));
}

/** Normalized ISBN-10 or ISBN-13 (digits only, uppercase X), or `null` if invalid. */
export function normalizeIsbn(value: unknown): string | null {
  const compact = nonEmptyString(value)?.replace(/[\s-]/g, '').toUpperCase();
  return compact && ISBN_PATTERN.test(compact) ? compact : null;
}

/** Always load covers over HTTPS (some APIs still return `http://` links). */
export function secureUrl(value: unknown): string | null {
  const url = nonEmptyString(value);
  if (!url) return null;
  return url.replace(/^http:\/\//, 'https://');
}
