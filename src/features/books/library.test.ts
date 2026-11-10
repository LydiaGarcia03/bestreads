import { createTestBook, TEST_TODAY } from '@/test/fakes';
import {
  isReadingStatus,
  LIBRARY_LIMITS,
  libraryInfoFromCatalog,
  newLibraryBookData,
  readLibraryBook,
} from './library';

describe('isReadingStatus', () => {
  it('accepts only the fixed statuses', () => {
    expect(isReadingStatus('wantToRead')).toBe(true);
    expect(isReadingStatus('reading')).toBe(true);
    expect(isReadingStatus('read')).toBe(true);
    expect(isReadingStatus('abandoned')).toBe(false);
    expect(isReadingStatus(undefined)).toBe(false);
  });
});

describe('libraryInfoFromCatalog', () => {
  it('copies the catalog fields', () => {
    const book = createTestBook();
    expect(libraryInfoFromCatalog(book)).toEqual({
      title: book.title,
      subtitle: null,
      authors: ['Andy Weir'],
      coverUrl: book.coverUrl,
      description: null,
      pageCount: 476,
      isbn: '9780593135204',
      publishedYear: 2021,
      source: 'googleBooks',
    });
  });

  it('caps long fields to the document limits', () => {
    const info = libraryInfoFromCatalog(
      createTestBook({
        title: 't'.repeat(400),
        description: 'd'.repeat(6000),
        authors: Array.from({ length: 30 }, () => 'a'.repeat(250)),
        coverUrl: `https://img/${'x'.repeat(LIBRARY_LIMITS.url)}`,
      }),
    );
    expect(info.title).toHaveLength(LIBRARY_LIMITS.title);
    expect(info.description).toHaveLength(LIBRARY_LIMITS.description);
    expect(info.authors).toHaveLength(LIBRARY_LIMITS.authors);
    expect(info.authors[0]).toHaveLength(LIBRARY_LIMITS.author);
    expect(info.coverUrl).toBeNull();
  });
});

describe('newLibraryBookData', () => {
  it('starts with only the chosen status, and a read when reading or read', () => {
    expect(newLibraryBookData(createTestBook(), 'reading', TEST_TODAY)).toMatchObject({
      status: 'reading',
      shelfIds: [],
      rating: null,
      ratingPublic: false,
      progress: null,
      reads: [{ startedOn: TEST_TODAY, finishedOn: null }],
    });
    expect(newLibraryBookData(createTestBook(), 'read', TEST_TODAY).reads).toEqual([
      { startedOn: null, finishedOn: TEST_TODAY },
    ]);
    expect(newLibraryBookData(createTestBook(), 'wantToRead', TEST_TODAY).reads).toEqual([]);
  });

  it('fills the series from the catalog', () => {
    const dune = createTestBook({ series: { name: 'Dune', position: '1' } });
    expect(newLibraryBookData(dune, 'read', TEST_TODAY).series).toEqual({ name: 'Dune', volume: 1 });
    expect(newLibraryBookData(createTestBook(), 'read', TEST_TODAY).series).toBeNull();
  });
});

describe('readLibraryBook', () => {
  const addedAt = new Date('2026-11-01T10:00:00Z');

  it('reads a complete document', () => {
    const data = {
      ...newLibraryBookData(createTestBook(), 'read', TEST_TODAY),
      shelfIds: ['s1'],
      rating: 3.75,
      ratingPublic: true,
      progress: { unit: 'pages', value: 120 },
      reads: [{ startedOn: '2026-10-01', finishedOn: '2026-10-20' }],
      addedAt,
      updatedAt: addedAt,
    };
    expect(readLibraryBook('vol-1', data)).toMatchObject({
      id: 'vol-1',
      status: 'read',
      rating: 3.75,
      ratingPublic: true,
      progress: { unit: 'pages', value: 120 },
      reads: [{ startedOn: '2026-10-01', finishedOn: '2026-10-20' }],
      addedAt,
    });
  });

  it('falls back to safe defaults for missing or invalid fields', () => {
    expect(
      readLibraryBook('x', { status: 'lost', rating: 3.3, progress: { unit: 'chapters', value: 2 }, reads: [null, 3] }),
    ).toEqual({
      id: 'x',
      title: '',
      subtitle: null,
      authors: [],
      coverUrl: null,
      description: null,
      pageCount: null,
      isbn: null,
      publishedYear: null,
      source: 'googleBooks',
      status: 'wantToRead',
      shelfIds: [],
      rating: null,
      ratingPublic: false,
      progress: null,
      reads: [],
      hasPersonalCover: false,
      series: null,
      addedAt: null,
      updatedAt: null,
    });
  });
});
