/** Open Library API response → `CatalogBook`: pure, no I/O. */
import {
  asRecord as record,
  nonEmptyString,
  normalizeIsbn,
  normalizePublishedDate,
  OPEN_LIBRARY_ID_PREFIX,
  positiveInteger,
  stringList,
  toDescriptionText,
  topCategories,
  yearFromDate,
} from './bookData';
import type { CatalogBook } from './types';

export const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org/b';

/** Fields requested from the search API (keeps responses small). */
export const OPEN_LIBRARY_FIELDS =
  'key,title,subtitle,author_name,cover_i,number_of_pages_median,isbn,first_publish_year,subject,readinglog_count,ratings_count';

/** Typed words this short are too common to search as a prefix ("a*" matches almost everything). */
const MIN_PREFIX_LENGTH = 3;
/** Characters with a meaning in Open Library's (Solr) query syntax. */
const QUERY_SYNTAX = /[+\-&|!(){}[\]^"~*?:\\/]/g;

/**
 * Open Library query for text typed in the search bar: an ISBN searches the `isbn` field;
 * otherwise the last word also matches as a prefix, so "yester" finds "Yesterday".
 * Prefix terms skip Open Library's text analysis, so that word is lowercased and stripped of accents.
 */
export function openLibraryQuery(query: string): string {
  const isbn = normalizeIsbn(query);
  if (isbn) return `isbn:${isbn}`;

  const words = query.replace(QUERY_SYNTAX, ' ').trim().split(/\s+/).filter(Boolean);
  const last = words.pop();
  if (!last) return '';
  const prefix = last
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  return [...words, prefix.length >= MIN_PREFIX_LENGTH ? `${prefix}*` : last].join(' ');
}

const WORK_KEY_PATTERN = /^\/works\/(OL\d+W)$/;

/** Medium-size cover (~180px wide), the smallest that stays sharp in result cards. */
export function openLibraryCoverById(coverId: number): string {
  return `${OPEN_LIBRARY_COVERS_URL}/id/${coverId}-M.jpg`;
}

/** Cover by ISBN; `default=false` makes a missing cover a 404 so the UI shows its placeholder. */
export function openLibraryCoverByIsbn(isbn: string): string {
  return `${OPEN_LIBRARY_COVERS_URL}/isbn/${isbn}-M.jpg?default=false`;
}

/** First valid ISBN, preferring ISBN-13. */
function pickIsbn(isbns: unknown): string | null {
  const valid = stringList(isbns)
    .map(normalizeIsbn)
    .filter((isbn): isbn is string => isbn !== null);
  return valid.find((isbn) => isbn.length === 13) ?? valid[0] ?? null;
}

/** Maps one search doc; returns `null` for entries that are not works or have no title. */
export function mapOpenLibraryDoc(doc: unknown): CatalogBook | null {
  const data = record(doc);
  const workId = nonEmptyString(data.key)?.match(WORK_KEY_PATTERN)?.[1];
  const title = nonEmptyString(data.title);
  if (!workId || !title) return null;

  const coverId = positiveInteger(data.cover_i);
  return {
    id: `${OPEN_LIBRARY_ID_PREFIX}${workId}`,
    title,
    subtitle: nonEmptyString(data.subtitle),
    authors: stringList(data.author_name),
    coverUrl: coverId ? openLibraryCoverById(coverId) : null,
    // The search API has no descriptions; the book page fetches the work when needed.
    description: null,
    pageCount: positiveInteger(data.number_of_pages_median),
    isbn: pickIsbn(data.isbn),
    publishedYear: yearFromDate(data.first_publish_year),
    publishedDate: normalizePublishedDate(data.first_publish_year),
    categories: topCategories(stringList(data.subject)),
    popularity: (positiveInteger(data.readinglog_count) ?? 0) + (positiveInteger(data.ratings_count) ?? 0),
    source: 'openLibrary',
  };
}

/** Number of docs the API returned (before dropping invalid ones), to tell whether more pages exist. */
export function openLibraryDocCount(response: unknown): number {
  const { docs } = record(response);
  return Array.isArray(docs) ? docs.length : 0;
}

/** Work id (`OL123W`) for a catalog id like `ol-OL123W`, or `null` for other ids. */
export function openLibraryWorkId(bookId: string): string | null {
  if (!bookId.startsWith(OPEN_LIBRARY_ID_PREFIX)) return null;
  const workId = bookId.slice(OPEN_LIBRARY_ID_PREFIX.length);
  return WORK_KEY_PATTERN.test(`/works/${workId}`) ? workId : null;
}

/** Work key (`/works/OL123W`) of the first work in an edition (`/isbn/{isbn}.json`). */
export function workKeyFromEdition(edition: unknown): string | null {
  const { works } = record(edition);
  if (!Array.isArray(works)) return null;
  const key = nonEmptyString(record(works[0]).key);
  return key && WORK_KEY_PATTERN.test(key) ? key : null;
}

/** Work description, which Open Library stores either as text or as `{ type, value }`. */
export function mapOpenLibraryDescription(work: unknown): string | null {
  const { description } = record(work);
  return toDescriptionText(typeof description === 'string' ? description : record(description).value);
}

/** Books from the trending lists (`/trending/{period}.json`), whose works look like search docs. */
export function mapOpenLibraryTrending(response: unknown): CatalogBook[] {
  const { works } = record(response);
  if (!Array.isArray(works)) return [];
  return works.map(mapOpenLibraryDoc).filter((book): book is CatalogBook => book !== null);
}

export function mapOpenLibraryResponse(response: unknown): CatalogBook[] {
  const { docs } = record(response);
  if (!Array.isArray(docs)) return [];
  return docs.map(mapOpenLibraryDoc).filter((book): book is CatalogBook => book !== null);
}
