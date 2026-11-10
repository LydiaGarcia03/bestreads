/** Rating rules: pure, no React or I/O. Mirrored in `firestore.rules` (`isValidRating`). */
import type { LibraryBook } from './library';

export const MIN_RATING = 0.25;
export const MAX_RATING = 5;
export const RATING_STEP = 0.25;
export const STAR_COUNT = 5;
const STEPS_PER_STAR = 1 / RATING_STEP;

/** A rating is a multiple of 0.25 in (0, 5]; `null` means unrated. */
export function isValidRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_RATING &&
    Number.isInteger(value * STEPS_PER_STAR)
  );
}

/** How much of star `position` (1–5) is filled, from 0 to 1: 3.75 → stars 1–3 full, star 4 at 0.75. */
export function starFill(rating: number | null, position: number): number {
  if (rating === null) return 0;
  return Math.min(1, Math.max(0, rating - (position - 1)));
}

/**
 * The rating one step (0.25) up or down, kept within [0.25, 5].
 * Stepping up from unrated starts at 0.25; stepping down from unrated stays unrated.
 */
export function stepRating(rating: number | null, direction: 1 | -1): number | null {
  if (rating === null) return direction === 1 ? MIN_RATING : null;
  const steps = Math.round(rating * STEPS_PER_STAR) + direction;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, steps / STEPS_PER_STAR));
}

/**
 * The rating under the pointer: star `position` (1–5) and how far across it the pointer is (0–1),
 * rounded up to the next quarter, so the first quarter of star 1 is 0.25 and its right edge is 1.
 */
export function ratingAtStar(position: number, fraction: number): number {
  const quarters = Math.min(STEPS_PER_STAR, Math.max(1, Math.ceil(fraction * STEPS_PER_STAR)));
  const star = Math.min(STAR_COUNT, Math.max(1, Math.round(position)));
  return star - 1 + quarters / STEPS_PER_STAR;
}

/** Slim copy of a public rating in `public/{uid}/ratings/{bookId}`: nothing private (no review, progress or dates). */
export interface PublicRatingData {
  title: string;
  authors: string[];
  coverUrl: string | null;
  rating: number;
}

/** The copy to publish, or `null` when nothing should be public (private or unrated). */
export function publicRatingOf(
  book: Pick<LibraryBook, 'title' | 'authors' | 'coverUrl'>,
  rating: number | null,
  ratingPublic: boolean,
): PublicRatingData | null {
  if (!ratingPublic || rating === null) return null;
  return { title: book.title, authors: book.authors, coverUrl: book.coverUrl, rating };
}
