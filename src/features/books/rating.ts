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

export function canStepRating(rating: number | null, direction: 1 | -1): boolean {
  return stepRating(rating, direction) !== rating;
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
