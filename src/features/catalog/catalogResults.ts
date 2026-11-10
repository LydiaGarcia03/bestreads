/** Post-processing of search results: pure, no I/O. */
import { openLibraryCoverByIsbn } from './openLibraryMapper';
import type { CatalogBook } from './types';

/** Fills missing covers with the Open Library cover for the book's ISBN (no extra request until it renders). */
export function fillMissingCovers(results: readonly CatalogBook[]): CatalogBook[] {
  return results.map((book) =>
    book.coverUrl || !book.isbn ? book : { ...book, coverUrl: openLibraryCoverByIsbn(book.isbn) },
  );
}

/** Drops repeated ids, keeping the first (APIs occasionally return the same volume twice). */
export function uniqueById(results: readonly CatalogBook[]): CatalogBook[] {
  const seen = new Set<string>();
  return results.filter((book) => {
    if (seen.has(book.id)) return false;
    seen.add(book.id);
    return true;
  });
}
