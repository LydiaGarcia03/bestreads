/** Series positions for books whose API gives the series but not the position: pure, no I/O. */
import { isDerivative, normalizeForMatch } from './catalogRanking';
import type { CatalogBook } from './types';

/** Fewer books than this can't show an order: a lone sequel would be numbered #1. */
const MIN_BOOKS_TO_NUMBER = 2;

/** "The Hunger Games" and "Hunger Games" are the same series. */
function seriesKey(name: string): string {
  return normalizeForMatch(name).replace(/^the /, '');
}

/**
 * Numbers series that come without positions by release year, among the books in `books`
 * ("The Hunger Games" #1 2008, "Catching Fire" #2 2009, "Mockingjay" #3 2010…). Only when every book
 * of that series in the list lacks a position and has a year, and there are at least two; series with
 * positions from the API (Dune) are left as they are. The list order doesn't change.
 */
export function numberSeriesByRelease(books: readonly CatalogBook[]): CatalogBook[] {
  const groups = new Map<string, CatalogBook[]>();
  for (const book of books) {
    // A box set or omnibus would take a number from the real books.
    if (!book.series || isDerivative(book)) continue;
    const key = seriesKey(book.series.name);
    groups.set(key, [...(groups.get(key) ?? []), book]);
  }

  const positions = new Map<string, string>();
  for (const members of groups.values()) {
    const canNumber =
      members.length >= MIN_BOOKS_TO_NUMBER &&
      members.every((book) => book.series?.position === null && book.publishedYear !== null);
    if (!canNumber) continue;
    [...members]
      .sort((a, b) => (a.publishedYear ?? 0) - (b.publishedYear ?? 0) || a.title.localeCompare(b.title))
      .forEach((book, index) => positions.set(book.id, String(index + 1)));
  }

  return books.map((book) => {
    const position = positions.get(book.id);
    return position && book.series ? { ...book, series: { ...book.series, position } } : book;
  });
}
