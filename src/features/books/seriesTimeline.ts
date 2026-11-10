/**
 * A series as a timeline: the owner's books in it plus the volumes the catalog knows, in reading order,
 * each with its state (the dots: filled = read, ring = reading, outlined = not read). Pure, no I/O.
 */
import type { CatalogBook } from '@/features/catalog';
import type { LibraryBook } from './library';
import { progressPercent } from './progress';
import { isSameSeries, parseVolume } from './series';

export type VolumeState = 'read' | 'reading' | 'unread' | 'notInLibrary';

export interface SeriesVolume {
  /** The book page id: the owner's copy when in the library, else the catalog book. */
  bookId: string;
  title: string;
  authors: string[];
  volume: number | null;
  year: number | null;
  state: VolumeState;
  /** Percentage read, while reading (when known). */
  percent: number | null;
  libraryBook: LibraryBook | null;
  /** Set only for volumes outside the library (used to add them). */
  catalogBook: CatalogBook | null;
}

export interface SeriesSummary {
  read: number;
  reading: number;
  toGo: number;
  total: number;
}

const STATE_BY_STATUS = { read: 'read', reading: 'reading', wantToRead: 'unread' } as const;

/** Timeline state of a book in the library. */
export const libraryVolumeState = (book: Pick<LibraryBook, 'status'>): VolumeState => STATE_BY_STATUS[book.status];

/** Title for matching: lowercase, letters and digits only, without bracketed notes. */
const titleKey = (title: string) =>
  title
    .replace(/\s*[([][^)\]]*[)\]]/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

/** Box sets and omnibus entries ("1-3", "Trilogy") aren't volumes of the timeline. */
const isVolumeEntry = (book: CatalogBook) =>
  !/\d\s*-\s*\d/.test(book.series?.position ?? '') && !/\b(box ?set|trilogy|omnibus|collection)\b/i.test(book.title);

function fromLibrary(book: LibraryBook): SeriesVolume {
  return {
    bookId: book.id,
    title: book.title,
    authors: book.authors,
    volume: book.series?.volume ?? null,
    year: book.publishedYear,
    state: libraryVolumeState(book),
    percent: book.status === 'reading' ? progressPercent(book.progress, book.pageCount) : null,
    libraryBook: book,
    catalogBook: null,
  };
}

function fromCatalog(book: CatalogBook): SeriesVolume {
  return {
    bookId: book.id,
    title: book.title,
    authors: book.authors,
    volume: parseVolume(book.series?.position),
    year: book.publishedYear,
    state: 'notInLibrary',
    percent: null,
    libraryBook: null,
    catalogBook: book,
  };
}

/**
 * Joins the owner's books of the series `name` with the catalog's volumes. A catalog volume is the same
 * as an owned book when it has the same id, the same volume number or the same title. Sorted by volume
 * (unknown last), then year, then title.
 */
export function buildSeriesTimeline(
  name: string,
  libraryBooks: readonly LibraryBook[],
  catalogBooks: readonly CatalogBook[],
): SeriesVolume[] {
  const owned = libraryBooks.filter((book) => book.series && isSameSeries(book.series.name, name)).map(fromLibrary);
  const ownedIds = new Set(owned.map((volume) => volume.bookId));
  const ownedVolumes = new Set(owned.flatMap((volume) => (volume.volume === null ? [] : [volume.volume])));
  const ownedTitles = new Set(owned.map((volume) => titleKey(volume.title)));

  const missing: SeriesVolume[] = [];
  for (const book of catalogBooks) {
    if (!book.series || !isSameSeries(book.series.name, name) || !isVolumeEntry(book)) continue;
    const volume = fromCatalog(book);
    const isOwned =
      ownedIds.has(volume.bookId) ||
      (volume.volume !== null && ownedVolumes.has(volume.volume)) ||
      ownedTitles.has(titleKey(volume.title));
    const isRepeat = missing.some(
      (other) => (volume.volume !== null && other.volume === volume.volume) || titleKey(other.title) === titleKey(volume.title),
    );
    if (!isOwned && !isRepeat) missing.push(volume);
  }

  return [...owned, ...missing].sort(
    (a, b) =>
      (a.volume ?? Number.POSITIVE_INFINITY) - (b.volume ?? Number.POSITIVE_INFINITY) ||
      (a.year ?? Number.POSITIVE_INFINITY) - (b.year ?? Number.POSITIVE_INFINITY) ||
      a.title.localeCompare(b.title),
  );
}

export function summarizeSeries(volumes: readonly SeriesVolume[]): SeriesSummary {
  const read = volumes.filter((volume) => volume.state === 'read').length;
  const reading = volumes.filter((volume) => volume.state === 'reading').length;
  return { read, reading, toGo: volumes.length - read - reading, total: volumes.length };
}
