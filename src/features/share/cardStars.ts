/** Star fill for share cards: pure. The share feature imports no other feature, so it keeps its own. */

export const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

/** How much of star `position` (1–5) a rating fills, 0 to 1 (3.75 → the 4th star at 75%). */
export function cardStarFill(rating: number, position: number): number {
  return Math.min(1, Math.max(0, rating - (position - 1)));
}
