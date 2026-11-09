/** Google Books API response → `BookSearchResult`: pure, no I/O. */
import {
  asRecord as record,
  nonEmptyString,
  normalizeIsbn,
  positiveInteger,
  secureUrl,
  stringList,
  toPlainText,
  yearFromDate,
} from './bookData';
import type { BookSearchResult } from './types';

/** Fields requested from the API (keeps responses small). */
export const GOOGLE_BOOKS_FIELDS =
  'items(id,volumeInfo(title,subtitle,authors,description,pageCount,industryIdentifiers,imageLinks/thumbnail,imageLinks/smallThumbnail,publishedDate))';

/** Prefers ISBN-13 over ISBN-10. */
function pickIsbn(identifiers: unknown): string | null {
  if (!Array.isArray(identifiers)) return null;
  const byType = (type: string) =>
    identifiers.map(record).find((identifier) => identifier.type === type)?.identifier;
  return normalizeIsbn(byType('ISBN_13')) ?? normalizeIsbn(byType('ISBN_10'));
}

/** Thumbnail without the page-curl effect. */
function coverFrom(imageLinks: unknown): string | null {
  const links = record(imageLinks);
  const url = secureUrl(links.thumbnail) ?? secureUrl(links.smallThumbnail);
  return url ? url.replace(/&edge=curl/g, '') : null;
}

/** Maps one volume; returns `null` for entries without an id or a title. */
export function mapGoogleVolume(volume: unknown): BookSearchResult | null {
  const { id, volumeInfo } = record(volume);
  const info = record(volumeInfo);
  const volumeId = nonEmptyString(id);
  const title = nonEmptyString(info.title);
  if (!volumeId || !title) return null;

  return {
    id: volumeId,
    title,
    subtitle: nonEmptyString(info.subtitle),
    authors: stringList(info.authors),
    coverUrl: coverFrom(info.imageLinks),
    description: toPlainText(info.description),
    pageCount: positiveInteger(info.pageCount),
    isbn: pickIsbn(info.industryIdentifiers),
    publishedYear: yearFromDate(info.publishedDate),
    source: 'googleBooks',
  };
}

export function mapGoogleBooksResponse(response: unknown): BookSearchResult[] {
  const { items } = record(response);
  if (!Array.isArray(items)) return [];
  return items.map(mapGoogleVolume).filter((book): book is BookSearchResult => book !== null);
}
