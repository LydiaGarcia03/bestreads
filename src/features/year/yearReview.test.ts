import type { LibraryBook } from '@/features/books';
import { createTestLibraryBook } from '@/test/fakes';
import { buildYearReview, finishedReadsIn, parseYear, readingYears } from './yearReview';

const book = (id: string, overrides: Partial<LibraryBook> = {}) =>
  createTestLibraryBook({ id, title: id, status: 'read', authors: ['Someone'], pageCount: 100, rating: null, ...overrides });
const finished = (...days: string[]) => days.map((finishedOn) => ({ startedOn: null, finishedOn }));

describe('finishedReadsIn', () => {
  it('lists every read finished in the year, re-reads included, oldest first', () => {
    const dune = book('dune', { reads: finished('2025-12-30', '2026-03-01', '2026-01-10') });
    const emma = book('emma', { reads: [...finished('2026-02-02'), { startedOn: '2026-05-01', finishedOn: null }] });

    expect(finishedReadsIn([dune, emma], 2026).map((read) => [read.book.id, read.finishedOn])).toEqual([
      ['dune', '2026-01-10'],
      ['emma', '2026-02-02'],
      ['dune', '2026-03-01'],
    ]);
  });

  it('is empty without finished reads', () => {
    expect(finishedReadsIn([book('a', { reads: [] })], 2026)).toEqual([]);
  });
});

describe('readingYears', () => {
  it('lists years with finished reads and the current year, newest first', () => {
    const books = [book('a', { reads: finished('2024-05-01', '2026-01-01') }), book('b', { reads: finished('2022-01-01') })];
    expect(readingYears(books, 2026)).toEqual([2026, 2024, 2022]);
    expect(readingYears([], 2026)).toEqual([2026]);
  });
});

describe('buildYearReview', () => {
  const books = [
    book('dune', { reads: finished('2026-01-10', '2026-03-01'), rating: 5, pageCount: 412, authors: ['Frank Herbert'] }),
    book('messiah', { reads: finished('2026-03-20'), rating: 4, pageCount: 256, authors: ['Frank Herbert'] }),
    book('emma', { reads: finished('2026-11-02'), rating: 3.5, pageCount: null, authors: ['Jane Austen'] }),
    book('unrated', { reads: finished('2026-11-05'), pageCount: 90 }),
    book('old', { reads: finished('2025-06-01'), rating: 1, pageCount: 2000 }),
  ];

  it('sums books, pages and months, counting re-reads', () => {
    const review = buildYearReview(books, 2026);

    expect(review.finished).toHaveLength(5);
    expect(review.pages).toBe(412 * 2 + 256 + 90);
    expect(review.months).toEqual([1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0]);
  });

  it('averages the ratings of distinct rated books', () => {
    expect(buildYearReview(books, 2026).averageRating).toBeCloseTo((5 + 4 + 3.5) / 3);
  });

  it('picks the best-rated books, the longest book and the most-read author', () => {
    const review = buildYearReview(books, 2026);

    expect(review.topRated.map((entry) => entry.id)).toEqual(['dune', 'messiah', 'emma']);
    expect(review.longest?.id).toBe('dune');
    expect(review.topAuthor).toEqual({ name: 'Frank Herbert', count: 3 });
  });

  it('needs two reads by the same author for a top author', () => {
    expect(buildYearReview([book('a', { reads: finished('2026-01-01'), authors: ['One'] })], 2026).topAuthor).toBeNull();
  });

  it('is empty for a year without finished books', () => {
    const review = buildYearReview(books, 2020);
    expect(review).toEqual({
      year: 2020,
      finished: [],
      pages: 0,
      averageRating: null,
      months: Array.from({ length: 12 }, () => 0),
      topRated: [],
      longest: null,
      topAuthor: null,
    });
  });
});

describe('parseYear', () => {
  it('reads a four-digit year, or falls back', () => {
    expect(parseYear('2025', 2026)).toBe(2025);
    expect(parseYear(null, 2026)).toBe(2026);
    expect(parseYear('25', 2026)).toBe(2026);
    expect(parseYear('abcd', 2026)).toBe(2026);
  });
});
