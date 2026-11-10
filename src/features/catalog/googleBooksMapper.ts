/** Google Books API response → `CatalogBook`: pure, no I/O. */
import {
  asRecord as record,
  nonEmptyString,
  normalizeIsbn,
  normalizePublishedDate,
  positiveInteger,
  secureUrl,
  stringList,
  toDescriptionText,
  topCategories,
  yearFromDate,
} from './bookData';
import type { CatalogBook } from './types';

const VOLUME_FIELDS =
  'id,volumeInfo(title,subtitle,authors,description,pageCount,industryIdentifiers,imageLinks/thumbnail,imageLinks/smallThumbnail,publishedDate,categories,ratingsCount)';

/** Fields requested from the search API (keeps responses small). */
export const GOOGLE_BOOKS_FIELDS = `items(${VOLUME_FIELDS})`;
/** Fields requested for a single volume. */
export const GOOGLE_VOLUME_FIELDS = VOLUME_FIELDS;

/** Prefers ISBN-13 over ISBN-10. */
function pickIsbn(identifiers: unknown): string | null {
  if (!Array.isArray(identifiers)) return null;
  const byType = (type: string) => identifiers.map(record).find((identifier) => identifier.type === type)?.identifier;
  return normalizeIsbn(byType('ISBN_13')) ?? normalizeIsbn(byType('ISBN_10'));
}

/** Thumbnail without the page-curl effect. */
function coverFrom(imageLinks: unknown): string | null {
  const links = record(imageLinks);
  const url = secureUrl(links.thumbnail) ?? secureUrl(links.smallThumbnail);
  return url ? url.replace(/&edge=curl/g, '') : null;
}

/** Maps one volume; returns `null` for entries without an id or a title. */
export function mapGoogleVolume(volume: unknown): CatalogBook | null {
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
    description: toDescriptionText(info.description),
    pageCount: positiveInteger(info.pageCount),
    isbn: pickIsbn(info.industryIdentifiers),
    publishedYear: yearFromDate(info.publishedDate),
    publishedDate: normalizePublishedDate(info.publishedDate),
    categories: topCategories(stringList(info.categories)),
    popularity: positiveInteger(info.ratingsCount) ?? 0,
    // Google only gives an opaque series id, not its name.
    series: null,
    subjects: stringList(info.categories),
    source: 'googleBooks',
  };
}

/** Number of items the API returned (before dropping invalid ones), to tell whether more pages exist. */
export function googleItemCount(response: unknown): number {
  const { items } = record(response);
  return Array.isArray(items) ? items.length : 0;
}

export function mapGoogleBooksResponse(response: unknown): CatalogBook[] {
  const { items } = record(response);
  if (!Array.isArray(items)) return [];
  return items.map(mapGoogleVolume).filter((book): book is CatalogBook => book !== null);
}
