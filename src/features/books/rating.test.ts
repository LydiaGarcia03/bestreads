import { canStepRating, isValidRating, publicRatingOf, starFill, stepRating } from './rating';

describe('isValidRating', () => {
  it.each([0.25, 0.5, 3.75, 5])('accepts %s', (value) => {
    expect(isValidRating(value)).toBe(true);
  });

  it.each([0, -1, 5.25, 3.3, Number.NaN, Number.POSITIVE_INFINITY, '4', null])('rejects %s', (value) => {
    expect(isValidRating(value)).toBe(false);
  });
});

describe('starFill', () => {
  it('fills whole stars, then a partial one', () => {
    expect([1, 2, 3, 4, 5].map((position) => starFill(3.75, position))).toEqual([1, 1, 1, 0.75, 0]);
    expect([1, 2, 3, 4, 5].map((position) => starFill(0.25, position))).toEqual([0.25, 0, 0, 0, 0]);
    expect([1, 2, 3, 4, 5].map((position) => starFill(5, position))).toEqual([1, 1, 1, 1, 1]);
  });

  it('leaves every star empty when unrated', () => {
    expect(starFill(null, 1)).toBe(0);
  });
});

describe('stepRating', () => {
  it('moves by 0.25 within bounds', () => {
    expect(stepRating(3.75, 1)).toBe(4);
    expect(stepRating(4, -1)).toBe(3.75);
    expect(stepRating(5, 1)).toBe(5);
    expect(stepRating(0.25, -1)).toBe(0.25);
  });

  it('starts at 0.25 when stepping up from unrated and stays unrated stepping down', () => {
    expect(stepRating(null, 1)).toBe(0.25);
    expect(stepRating(null, -1)).toBeNull();
  });

  it('never drifts off the 0.25 grid', () => {
    let rating: number | null = null;
    for (let step = 0; step < 20; step += 1) rating = stepRating(rating, 1);
    expect(rating).toBe(5);
    for (let step = 0; step < 7; step += 1) rating = stepRating(rating, -1);
    expect(rating).toBe(3.25);
  });

  it('tells whether a step changes anything', () => {
    expect(canStepRating(5, 1)).toBe(false);
    expect(canStepRating(5, -1)).toBe(true);
    expect(canStepRating(0.25, -1)).toBe(false);
    expect(canStepRating(null, -1)).toBe(false);
    expect(canStepRating(null, 1)).toBe(true);
  });
});

describe('publicRatingOf', () => {
  const book = { title: 'Dune', authors: ['Frank Herbert'], coverUrl: 'https://covers/dune.jpg' };

  it('copies only title, authors, cover and rating', () => {
    expect(publicRatingOf(book, 4.5, true)).toEqual({ ...book, rating: 4.5 });
  });

  it('publishes nothing for a private or missing rating', () => {
    expect(publicRatingOf(book, 4.5, false)).toBeNull();
    expect(publicRatingOf(book, null, true)).toBeNull();
  });
});
