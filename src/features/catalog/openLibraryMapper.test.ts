import {
  mapOpenLibraryDescription,
  mapOpenLibraryDoc,
  mapOpenLibraryResponse,
  openLibraryCoverById,
  openLibraryCoverByIsbn,
  openLibraryQuery,
  openLibraryWorkId,
  workKeyFromEdition,
} from './openLibraryMapper';

describe('openLibraryQuery', () => {
  it.each([
    ['yester', '(yester) OR (yester*) OR series_name:(yester*)'],
    ['Harry Pot', '(Harry Pot) OR (Harry pot*) OR series_name:(Harry pot*)'],
    ['pequeno Príncipe', '(pequeno Príncipe) OR (pequeno principe*) OR series_name:(pequeno principe*)'],
    ['to', '(to) OR series_name:(to)'],
    ['title:"dune" (spice)', '(title dune spice) OR (title dune spice*) OR series_name:(title dune spice*)'],
    ['978-0-441-01359-3', 'isbn:9780441013593'],
    ['  ?! ', ''],
  ])('%j → %j', (query, expected) => {
    expect(openLibraryQuery(query)).toBe(expected);
  });
});

describe('openLibraryWorkId', () => {
  it('reads the work id from an ol- book id', () => {
    expect(openLibraryWorkId('ol-OL17091839W')).toBe('OL17091839W');
  });

  it('rejects other ids', () => {
    expect(openLibraryWorkId('abc123')).toBeNull();
    expect(openLibraryWorkId('ol-OL1M')).toBeNull();
    expect(openLibraryWorkId('ol-../etc')).toBeNull();
  });
});

describe('workKeyFromEdition', () => {
  it('returns the first work key', () => {
    expect(workKeyFromEdition({ works: [{ key: '/works/OL1W' }, { key: '/works/OL2W' }] })).toBe('/works/OL1W');
  });

  it('returns null without a valid work', () => {
    expect(workKeyFromEdition({ works: [] })).toBeNull();
    expect(workKeyFromEdition({ works: [{ key: '/books/OL1M' }] })).toBeNull();
    expect(workKeyFromEdition(null)).toBeNull();
  });
});

describe('mapOpenLibraryDescription', () => {
  it('reads plain and typed descriptions', () => {
    expect(mapOpenLibraryDescription({ description: 'A desert planet.' })).toBe('A desert planet.');
    expect(mapOpenLibraryDescription({ description: { type: '/type/text', value: 'Spice.' } })).toBe('Spice.');
  });

  it('returns null when there is none', () => {
    expect(mapOpenLibraryDescription({})).toBeNull();
    expect(mapOpenLibraryDescription(null)).toBeNull();
  });
});

const DOC = {
  key: '/works/OL17091839W',
  title: 'Project Hail Mary',
  author_name: ['Andy Weir'],
  cover_i: 12345,
  number_of_pages_median: 496,
  isbn: ['0593135202', '9780593135204'],
  first_publish_year: 2021,
  subject: ['Science fiction', 'Space', 'Astronauts', 'Survival'],
};

describe('Open Library cover URLs', () => {
  it('builds medium covers by id and by ISBN', () => {
    expect(openLibraryCoverById(12345)).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg');
    expect(openLibraryCoverByIsbn('9780593135204')).toBe(
      'https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg?default=false',
    );
  });
});

describe('mapOpenLibraryDoc series', () => {
  it('falls back to a series tag among the subjects', () => {
    const book = mapOpenLibraryDoc({
      key: '/works/OL2W',
      title: 'Catching Fire',
      subject: ['Fiction', 'Survival', 'Serie:The_Hunger_Games'],
    });
    expect(book?.series).toEqual({ name: 'The Hunger Games', position: null });
    expect(book?.subjects).toContain('Serie:The_Hunger_Games');
  });

  it('reads the first series and its position', () => {
    const book = mapOpenLibraryDoc({ key: '/works/OL1W', title: 'Dune', series_name: ['Dune'], series_position: ['1'] });
    expect(book?.series).toEqual({ name: 'Dune', position: '1' });
    expect(mapOpenLibraryDoc({ key: '/works/OL1W', title: 'X', series_name: ['Saga'] })?.series).toEqual({
      name: 'Saga',
      position: null,
    });
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
      publishedDate: '2021',
      categories: ['Science fiction', 'Space', 'Astronauts'],
      popularity: 0,
      series: null,
      subjects: ['Science fiction', 'Space', 'Astronauts', 'Survival'],
      source: 'openLibrary',
    });
  });

  it('adds reader and rating counts up as popularity', () => {
    expect(mapOpenLibraryDoc({ ...DOC, readinglog_count: 900, ratings_count: 100 })?.popularity).toBe(1000);
    expect(mapOpenLibraryDoc({ ...DOC, readinglog_count: -3, ratings_count: 'x' })?.popularity).toBe(0);
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
