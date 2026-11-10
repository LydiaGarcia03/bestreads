/** Library domain: the user's copy of a book in `users/{uid}/books/{bookId}`. Pure, no React or I/O. */
import type { BookSource, CatalogBook } from '@/features/catalog';
import { isValidRating } from './rating';
import { readPlan, type ReadingPlan } from './readingPlan';
import { readsAfterStatusChange } from './reads';
import { seriesFromCatalog, type BookSeriesInfo } from './series';

export const READING_STATUSES = ['wantToRead', 'reading', 'read'] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const PROGRESS_UNITS = ['pages', 'percent'] as const;
export type ProgressUnit = (typeof PROGRESS_UNITS)[number];

export interface ReadingProgress {
  unit: ProgressUnit;
  /** Current page, or percentage (0–100). */
  value: number;
}

/** One read of the book (re-reads add more). Dates are calendar days, `YYYY-MM-DD`. */
export interface ReadPeriod {
  startedOn: string | null;
  finishedOn: string | null;
}

/** Limits mirrored in `firestore.rules` (`isValidBook`). */
export const LIBRARY_LIMITS = {
  title: 300,
  subtitle: 300,
  authors: 20,
  author: 200,
  description: 5000,
  url: 2048,
  isbn: 13,
  shelves: 50,
  reads: 100,
} as const;

/** Book fields copied from the catalog when the book is added. */
export interface LibraryBookInfo {
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  isbn: string | null;
  publishedYear: number | null;
  source: BookSource;
}

/** The user's own data about the book. */
export interface LibraryBookState {
  status: ReadingStatus;
  shelfIds: string[];
  rating: number | null;
  ratingPublic: boolean;
  progress: ReadingProgress | null;
  reads: ReadPeriod[];
  /** The owner uploaded a cover (kept in `private/cover`); lists load it only for these books. */
  hasPersonalCover: boolean;
  /** Series and volume, filled from the catalog when added and editable; `null` when not in a series. */
  series: BookSeriesInfo | null;
  /** Optional reading plan; only for books being read (dropped when the status changes). */
  plan: ReadingPlan | null;
}

export interface LibraryBook extends LibraryBookInfo, LibraryBookState {
  /** Same as the catalog id, so a book can't be added twice. */
  id: string;
  addedAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Fields written when a book is added (timestamps are added by the data layer). A new book has no
 * reading plan, so plan is only written once one is made.
 */
export type LibraryBookData = LibraryBookInfo & Omit<LibraryBookState, 'plan'>;

export function isReadingStatus(value: unknown): value is ReadingStatus {
  return typeof value === 'string' && (READING_STATUSES as readonly string[]).includes(value);
}

function capped(value: string | null, maxLength: number): string | null {
  return value === null ? null : value.slice(0, maxLength);
}

/** Catalog data shaped to fit the document limits. */
export function libraryInfoFromCatalog(book: CatalogBook): LibraryBookInfo {
  return {
    title: book.title.slice(0, LIBRARY_LIMITS.title),
    subtitle: capped(book.subtitle, LIBRARY_LIMITS.subtitle),
    authors: book.authors.slice(0, LIBRARY_LIMITS.authors).map((author) => author.slice(0, LIBRARY_LIMITS.author)),
    coverUrl: book.coverUrl && book.coverUrl.length <= LIBRARY_LIMITS.url ? book.coverUrl : null,
    description: capped(book.description, LIBRARY_LIMITS.description),
    pageCount: book.pageCount,
    isbn: book.isbn,
    publishedYear: book.publishedYear,
    source: book.source,
  };
}

/**
 * A book entering the library with `status` on `today` (`YYYY-MM-DD`): "reading" starts a read
 * and "read" records one finished today (`readsAfterStatusChange`).
 */
export function newLibraryBookData(book: CatalogBook, status: ReadingStatus, today: string): LibraryBookData {
  return {
    ...libraryInfoFromCatalog(book),
    status,
    shelfIds: [],
    rating: null,
    ratingPublic: false,
    progress: null,
    reads: readsAfterStatusChange([], status, today),
    hasPersonalCover: false,
    series: seriesFromCatalog(book.series),
  };
}

// --- Reading stored documents (defensive: the data may predate the current shape) ---

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readProgress(value: unknown): ReadingProgress | null {
  if (typeof value !== 'object' || value === null) return null;
  const { unit, value: amount } = value as Record<string, unknown>;
  const progressValue = numberOrNull(amount);
  if (!(PROGRESS_UNITS as readonly unknown[]).includes(unit) || progressValue === null) return null;
  return { unit: unit as ProgressUnit, value: progressValue };
}

function readReads(value: unknown): ReadPeriod[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({ startedOn: stringOrNull(item.startedOn), finishedOn: stringOrNull(item.finishedOn) }));
}

/** A stored series, or `null` when missing (older books) or malformed. */
function readSeries(value: unknown): BookSeriesInfo | null {
  if (typeof value !== 'object' || value === null) return null;
  const { name, volume } = value as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) return null;
  return { name, volume: numberOrNull(volume) };
}

/** Builds a `LibraryBook` from stored fields (timestamps already converted to `Date`). */
export function readLibraryBook(id: string, data: Readonly<Record<string, unknown>>): LibraryBook {
  return {
    id,
    title: stringOrNull(data.title) ?? '',
    subtitle: stringOrNull(data.subtitle),
    authors: stringArray(data.authors),
    coverUrl: stringOrNull(data.coverUrl),
    description: stringOrNull(data.description),
    pageCount: numberOrNull(data.pageCount),
    isbn: stringOrNull(data.isbn),
    publishedYear: numberOrNull(data.publishedYear),
    source: data.source === 'openLibrary' ? 'openLibrary' : 'googleBooks',
    status: isReadingStatus(data.status) ? data.status : 'wantToRead',
    shelfIds: stringArray(data.shelfIds),
    rating: isValidRating(data.rating) ? data.rating : null,
    ratingPublic: data.ratingPublic === true,
    progress: readProgress(data.progress),
    reads: readReads(data.reads),
    // Books saved before personal covers existed have no such field.
    hasPersonalCover: data.hasPersonalCover === true,
    series: readSeries(data.series),
    plan: data.status === 'reading' ? readPlan(data.plan) : null,
    addedAt: data.addedAt instanceof Date ? data.addedAt : null,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt : null,
  };
}
