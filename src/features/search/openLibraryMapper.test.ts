import {
  mapOpenLibraryDoc,
  mapOpenLibraryResponse,
  openLibraryCoverById,
  openLibraryCoverByIsbn,
} from './openLibraryMapper';

const DOC = {
  key: '/works/OL17091839W',
  title: 'Project Hail Mary',
  author_name: ['Andy Weir'],
  cover_i: 12345,
  number_of_pages_median: 496,
  isbn: ['0593135202', '9780593135204'],
  first_publish_year: 2021,
};

describe('Open Library cover URLs', () => {
  it('builds medium covers by id and by ISBN', () => {
    expect(openLibraryCoverById(12345)).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg');
    expect(openLibraryCoverByIsbn('9780593135204')).toBe(
      'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg?default=false',
    );
  });
});

describe('mapOpenLibraryDoc', () => {
  it('maps every field with an ol- prefixed id', () => {
    expect(mapOpenLibraryDoc(DOC)).toEqual({
      id: 'ol-OL17091839W',
      title: 'Project Hail Mary',
      subtitle: null,
      authors: ['Andy Weir'],
      coverUrl: 'https://covers.openlibrary.org/b/id/12345-M.jpg',
      description: null,
      pageCount: 496,
      isbn: '9780593135204',
      publishedYear: 2021,
      source: 'openLibrary',
    });
  });

  it('keeps an ISBN-10 when there is no ISBN-13, and no cover without cover_i', () => {
    const book = mapOpenLibraryDoc({ ...DOC, isbn: ['bad', '0593135202'], cover_i: undefined });
    expect(book?.isbn).toBe('0593135202');
    expect(book?.coverUrl).toBeNull();
  });

  it('skips docs that are not works or have no title', () => {
    expect(mapOpenLibraryDoc({ ...DOC, key: '/books/OL1M' })).toBeNull();
    expect(mapOpenLibraryDoc({ ...DOC, title: '' })).toBeNull();
  });
});

describe('mapOpenLibraryResponse', () => {
  it('maps docs and ignores malformed responses', () => {
    expect(mapOpenLibraryResponse({ docs: [DOC, {}] })).toHaveLength(1);
    expect(mapOpenLibraryResponse({})).toEqual([]);
  });
});
