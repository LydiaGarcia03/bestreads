/** Helpers shared by the API mappers: pure, no I/O. */

export const OPEN_LIBRARY_ID_PREFIX = 'ol-';

const YEAR_PATTERN = /^\d{4}/;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const ISBN_PATTERN = /^(?:\d{9}[\dX]|\d{13})$/;

/** Treats any JSON value as an object, so missing fields read as `undefined`. */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** U+FFFD, left by APIs where a character was lost in a bad encoding conversion. */
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);
/** Control and private-use characters, except whitespace (descriptions keep their line breaks). */
const INVISIBLE_JUNK = /(?!\s)[\p{Cc}\p{Co}]/gu;

/** Trimmed text without characters that render as empty boxes; `null` when nothing is left. */
export function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.split(REPLACEMENT_CHARACTER).join('').replace(INVISIBLE_JUNK, '').trim();
  return cleaned === '' ? null : cleaned;
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

export const MAX_CATEGORIES = 3;
const GENERIC_CATEGORIES = new Set(['general']);

/**
 * Up to `MAX_CATEGORIES` distinct categories. Hierarchical ones (`Fiction / Science Fiction / General`)
 * are split into their parts, and filler parts like "General" are dropped.
 */
export function topCategories(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of values.flatMap((value) => value.split('/'))) {
    const category = part.trim();
    const key = category.toLowerCase();
    if (!category || GENERIC_CATEGORIES.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(category);
    if (result.length === MAX_CATEGORIES) break;
  }
  return result;
}

const PUBLISHED_DATE_PATTERN = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/;

/**
 * Publication date as precise as the API knows it: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
 * Invalid months or days are dropped (keeping the year).
 */
export function normalizePublishedDate(value: unknown): string | null {
  const text = typeof value === 'number' ? String(value) : nonEmptyString(value);
  const match = text?.match(PUBLISHED_DATE_PATTERN);
  if (!match) return null;
  const [, year, month, day] = match;
  const monthNumber = Number(month);
  if (!month || monthNumber < 1 || monthNumber > 12) return year ?? null;
  const dayNumber = Number(day);
  if (!day || dayNumber < 1 || dayNumber > 31) return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  // A plain space: descriptions are reflowed, so non-breaking spaces would only block wrapping.
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    const point = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}

/**
 * Book description as the small Markdown subset of `src/shared/text/richText.ts`: Google Books sends
 * HTML (`<b>`, `<i>`, `<p>`, `<br>`), Open Library sends Markdown. Bold, italic, paragraphs and line
 * breaks are kept; other tags are removed, entities decoded and Markdown links reduced to their text.
 */
export function toDescriptionText(value: unknown): string | null {
  const text = nonEmptyString(value);
  if (!text) return null;
  const marked = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|blockquote)\b[^>]*>/gi, '\n\n')
    .replace(/<\/?(?:b|strong)\b[^>]*>/gi, '**')
    .replace(/<\/?(?:i|em)\b[^>]*>/gi, '*')
    .replace(HTML_TAG_PATTERN, '');
  const cleaned = decodeEntities(marked)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    // Within one line, \s covers spaces, tabs and non-breaking spaces.
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  return nonEmptyString(cleaned);
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
