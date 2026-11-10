import { mapGoogleBooksResponse, mapGoogleVolume } from './googleBooksMapper';

const VOLUME = {
  id: 'abc123',
  volumeInfo: {
    title: 'Project Hail Mary',
    subtitle: 'A Novel',
    authors: ['Andy Weir'],
    description: '<p>A lone <i>astronaut</i>.</p>',
    pageCount: 476,
    publishedDate: '2021-05-04',
    categories: ['Fiction / Science Fiction / General'],
    ratingsCount: 87,
    industryIdentifiers: [
      { type: 'ISBN_10', identifier: '0593135202' },
      { type: 'ISBN_13', identifier: '9780593135204' },
    ],
    imageLinks: {
      smallThumbnail: 'http://books.google.com/small&edge=curl',
      thumbnail: 'http://books.google.com/thumb?id=abc&zoom=1&edge=curl&source=gbs_api',
    },
  },
};

describe('mapGoogleVolume', () => {
  it('maps every field', () => {
    expect(mapGoogleVolume(VOLUME)).toEqual({
      id: 'abc123',
      title: 'Project Hail Mary',
      subtitle: 'A Novel',
      authors: ['Andy Weir'],
      coverUrl: 'https://books.google.com/thumb?id=abc&zoom=1&source=gbs_api',
      description: 'A lone *astronaut*.',
      pageCount: 476,
      isbn: '9780593135204',
      publishedYear: 2021,
      publishedDate: '2021-05-04',
      categories: ['Fiction', 'Science Fiction'],
      popularity: 87,
      series: null,
      subjects: ['Fiction / Science Fiction / General'],
      source: 'googleBooks',
    });
  });

  it('falls back to ISBN-10 and the small thumbnail', () => {
    const book = mapGoogleVolume({
      id: 'x',
      volumeInfo: {
        title: 'T',
        industryIdentifiers: [{ type: 'ISBN_10', identifier: '0593135202' }],
        imageLinks: { smallThumbnail: 'http://img/small' },
      },
    });
    expect(book?.isbn).toBe('0593135202');
    expect(book?.coverUrl).toBe('https://img/small');
  });

  it('uses nulls and empty lists for missing data', () => {
    expect(mapGoogleVolume({ id: 'x', volumeInfo: { title: 'Only a title' } })).toEqual({
      id: 'x',
      title: 'Only a title',
      subtitle: null,
      authors: [],
      coverUrl: null,
      description: null,
      pageCount: null,
      isbn: null,
      publishedYear: null,
      publishedDate: null,
      categories: [],
      popularity: 0,
      series: null,
      subjects: [],
      source: 'googleBooks',
    });
  });

  it('skips volumes without id or title', () => {
    expect(mapGoogleVolume({ volumeInfo: { title: 'T' } })).toBeNull();
    expect(mapGoogleVolume({ id: 'x', volumeInfo: {} })).toBeNull();
    expect(mapGoogleVolume(null)).toBeNull();
  });
});

describe('mapGoogleBooksResponse', () => {
  it('maps valid items and drops invalid ones', () => {
    const results = mapGoogleBooksResponse({ items: [VOLUME, { id: 'bad' }] });
    expect(results.map((book) => book.id)).toEqual(['abc123']);
  });

  it('returns an empty list when there are no items', () => {
    expect(mapGoogleBooksResponse({ totalItems: 0 })).toEqual([]);
    expect(mapGoogleBooksResponse(null)).toEqual([]);
  });
});
