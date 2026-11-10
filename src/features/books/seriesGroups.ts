/** Groups a shelf's books by series, for an ordered, collapsible group per series. Pure, no I/O. */
import type { LibraryBook } from './library';
import { seriesKey } from './series';

export type ShelfEntry =
  | { kind: 'book'; book: LibraryBook }
  | { kind: 'series'; key: string; name: string; books: LibraryBook[] };

/** A series becomes a group from this many books on the same shelf; a lone volume stays a book. */
export const MIN_BOOKS_PER_GROUP = 2;

const byVolume = (a: LibraryBook, b: LibraryBook) =>
  (a.series?.volume ?? Number.POSITIVE_INFINITY) - (b.series?.volume ?? Number.POSITIVE_INFINITY) ||
  (a.publishedYear ?? Number.POSITIVE_INFINITY) - (b.publishedYear ?? Number.POSITIVE_INFINITY) ||
  a.title.localeCompare(b.title);

/**
 * Books of the same series (2 or more) become one group, in volume order, at the place of the
 * series' first book in the list; every other book keeps its place.
 */
export function groupBySeries(books: readonly LibraryBook[]): ShelfEntry[] {
  const members = new Map<string, LibraryBook[]>();
  for (const book of books) {
    if (!book.series) continue;
    const key = seriesKey(book.series.name);
    members.set(key, [...(members.get(key) ?? []), book]);
  }

  const placed = new Set<string>();
  const entries: ShelfEntry[] = [];
  for (const book of books) {
    const key = book.series ? seriesKey(book.series.name) : null;
    const group = key ? members.get(key) : undefined;
    if (!key || !group || group.length < MIN_BOOKS_PER_GROUP) {
      entries.push({ kind: 'book', book });
      continue;
    }
    if (placed.has(key)) continue;
    placed.add(key);
    entries.push({ kind: 'series', key, name: book.series?.name ?? '', books: [...group].sort(byVolume) });
  }
  return entries;
}
