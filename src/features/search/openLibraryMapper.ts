/** Open Library API response → `BookSearchResult`: pure, no I/O. */
import {
  asRecord as record,
  nonEmptyString,
  normalizeIsbn,
  OPEN_LIBRARY_ID_PREFIX,
  positiveInteger,
  stringList,
  yearFromDate,
} from './bookData';
import type { BookSearchResult } from './types';

export const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org/b';

/** Fields requested from the search API (keeps responses small). */
export const OPEN_LIBRARY_FIELDS =
  'key,title,subtitle,author_name,cover_i,number_of_pages_median,isbn,first_publish_year';

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
export function mapOpenLibraryDoc(doc: unknown): BookSearchResult | null {
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
    source: 'openLibrary',
  };
}

export function mapOpenLibraryResponse(response: unknown): BookSearchResult[] {
  const { docs } = record(response);
  if (!Array.isArray(docs)) return [];
  return docs.map(mapOpenLibraryDoc).filter((book): book is BookSearchResult => book !== null);
}
