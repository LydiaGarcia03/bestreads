import { nextRatingsCursor, readPublicRating } from './publicRating';

const RATED_AT = new Date('2026-11-01T12:00:00Z');

describe('readPublicRating', () => {
  it('reads a stored public rating', () => {
    expect(
      readPublicRating('vol-1', {
        title: 'Dune',
        authors: ['Frank Herbert'],
        coverUrl: 'https://c.example/1.jpg',
        rating: 4.75,
        ratedAt: RATED_AT,
      }),
    ).toEqual({
      bookId: 'vol-1',
      title: 'Dune',
      authors: ['Frank Herbert'],
      coverUrl: 'https://c.example/1.jpg',
      rating: 4.75,
      ratedAt: RATED_AT,
    });
  });

  it('fills missing optional fields', () => {
    expect(readPublicRating('vol-1', { title: 'Dune', authors: 'x', rating: 3, ratedAt: null })).toEqual({
      bookId: 'vol-1',
      title: 'Dune',
      authors: [],
      coverUrl: null,
      rating: 3,
      ratedAt: null,
    });
  });

  it('drops ratings without a title or with an invalid rating', () => {
    expect(readPublicRating('a', { title: '', rating: 3 })).toBeNull();
    expect(readPublicRating('b', { title: 'Dune', rating: 3.3 })).toBeNull();
    expect(readPublicRating('c', { title: 'Dune', rating: null })).toBeNull();
  });
});

describe('nextRatingsCursor', () => {
  it('points after the last document of a full page', () => {
    expect(nextRatingsCursor(20, 20, { bookId: 'vol-9', ratedAt: RATED_AT })).toEqual({
      bookId: 'vol-9',
      ratedAt: RATED_AT,
    });
  });

  it('ends the list after a short page', () => {
    expect(nextRatingsCursor(5, 20, { bookId: 'vol-9', ratedAt: RATED_AT })).toBeNull();
    expect(nextRatingsCursor(0, 20, undefined)).toBeNull();
  });

  it('ends the list when the last document has no date to continue from', () => {
    expect(nextRatingsCursor(20, 20, { bookId: 'vol-9', ratedAt: null })).toBeNull();
  });
});
