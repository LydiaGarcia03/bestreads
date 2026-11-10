/** Year in review: what the user finished in a year. Pure, no React or I/O. */
import type { LibraryBook } from '@/features/books';

/** One finished read (re-reads count again). `finishedOn` is `YYYY-MM-DD`. */
export interface FinishedRead {
  book: LibraryBook;
  finishedOn: string;
}

export interface AuthorCount {
  name: string;
  count: number;
}

export interface YearReview {
  year: number;
  /** Finished reads, oldest first. */
  finished: FinishedRead[];
  /** Pages of every finished read with a known page count. */
  pages: number;
  /** Average rating of the distinct books finished (rated ones only), or `null`. */
  averageRating: number | null;
  /** Finished reads per month, January first (12 entries). */
  months: number[];
  /** Best-rated distinct books, highest first (ties: most recently finished). */
  topRated: LibraryBook[];
  longest: LibraryBook | null;
  /** The author read most, when at least `TOP_AUTHOR_MIN_READS` reads are theirs. */
  topAuthor: AuthorCount | null;
}

export const TOP_RATED_COUNT = 3;
export const TOP_AUTHOR_MIN_READS = 2;
const MONTHS_IN_YEAR = 12;

const yearOf = (day: string) => Number(day.slice(0, 4));
const monthIndexOf = (day: string) => Number(day.slice(5, 7)) - 1;

/** Every read of `books` finished in `year`, oldest first. */
export function finishedReadsIn(books: readonly LibraryBook[], year: number): FinishedRead[] {
  return books
    .flatMap((book) =>
      book.reads
        .map((read) => read.finishedOn)
        .filter((day): day is string => day !== null && yearOf(day) === year)
        .map((finishedOn) => ({ book, finishedOn })),
    )
    .sort((a, b) => a.finishedOn.localeCompare(b.finishedOn));
}

/** Years with at least one finished read, plus `currentYear`, newest first. */
export function readingYears(books: readonly LibraryBook[], currentYear: number): number[] {
  const years = new Set([currentYear]);
  books.forEach((book) =>
    book.reads.forEach((read) => {
      if (read.finishedOn) years.add(yearOf(read.finishedOn));
    }),
  );
  return [...years].filter((year) => Number.isInteger(year)).sort((a, b) => b - a);
}

/** Distinct books in `finished`, keeping each one's latest finish. */
function distinctBooks(finished: readonly FinishedRead[]): FinishedRead[] {
  const latest = new Map<string, FinishedRead>();
  finished.forEach((entry) => latest.set(entry.book.id, entry));
  return [...latest.values()];
}

function topAuthorOf(finished: readonly FinishedRead[]): AuthorCount | null {
  const counts = new Map<string, number>();
  finished.forEach(({ book }) => book.authors.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1)));
  let top: AuthorCount | null = null;
  counts.forEach((count, name) => {
    if (count >= TOP_AUTHOR_MIN_READS && (top === null || count > top.count)) top = { name, count };
  });
  return top;
}

export function buildYearReview(books: readonly LibraryBook[], year: number): YearReview {
  const finished = finishedReadsIn(books, year);
  const distinct = distinctBooks(finished);
  const rated = distinct.filter(({ book }) => book.rating !== null);
  const months = Array.from({ length: MONTHS_IN_YEAR }, () => 0);
  finished.forEach(({ finishedOn }) => {
    const month = monthIndexOf(finishedOn);
    if (month >= 0 && month < MONTHS_IN_YEAR) months[month] = (months[month] ?? 0) + 1;
  });
  const withPages = distinct.filter(({ book }) => book.pageCount !== null);

  return {
    year,
    finished,
    pages: finished.reduce((total, { book }) => total + (book.pageCount ?? 0), 0),
    averageRating:
      rated.length === 0 ? null : rated.reduce((total, { book }) => total + (book.rating ?? 0), 0) / rated.length,
    months,
    topRated: [...rated]
      .sort((a, b) => (b.book.rating ?? 0) - (a.book.rating ?? 0) || b.finishedOn.localeCompare(a.finishedOn))
      .slice(0, TOP_RATED_COUNT)
      .map(({ book }) => book),
    longest: withPages.reduce<LibraryBook | null>(
      (longest, { book }) => (longest === null || (book.pageCount ?? 0) > (longest.pageCount ?? 0) ? book : longest),
      null,
    ),
    topAuthor: topAuthorOf(finished),
  };
}

/** The year asked for in the URL (`?year=2025`) when valid, else `fallback`. */
export function parseYear(value: string | null, fallback: number): number {
  if (value === null || !/^\d{4}$/.test(value)) return fallback;
  return Number(value);
}
