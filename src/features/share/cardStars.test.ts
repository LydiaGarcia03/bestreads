import { cardStarFill } from './cardStars';

describe('cardStarFill', () => {
  it('fills whole stars, a partial star and empty ones', () => {
    expect([1, 2, 3, 4, 5].map((position) => cardStarFill(3.75, position))).toEqual([1, 1, 1, 0.75, 0]);
    expect([1, 2, 3, 4, 5].map((position) => cardStarFill(5, position))).toEqual([1, 1, 1, 1, 1]);
    expect(cardStarFill(0.25, 1)).toBe(0.25);
  });
});
