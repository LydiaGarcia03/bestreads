/** `public/{uid}/ratings/{bookId}` read side: pure shaping, no Firestore import. */
import { isValidRating } from '@/features/books';

/** A rating someone made public: the slim copy written by the library (`publicRatingOf`). */
export interface PublicRating {
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  rating: number;
  ratedAt: Date | null;
}

/** Ratings shown per page on a profile. */
export const PUBLIC_RATINGS_PAGE_SIZE = 20;

/** Where the next page of ratings starts (the last rating of the current page). */
export interface PublicRatingsCursor {
  ratedAt: Date;
  bookId: string;
}

export interface PublicRatingsPage {
  ratings: PublicRating[];
  /** `null` when there are no more ratings. */
  next: PublicRatingsCursor | null;
}

/** Reads a stored public rating (dates already converted), or `null` when it is unusable. */
export function readPublicRating(bookId: string, data: Readonly<Record<string, unknown>>): PublicRating | null {
  if (typeof data.title !== 'string' || data.title.length === 0 || !isValidRating(data.rating)) return null;
  return {
    bookId,
    title: data.title,
    authors: Array.isArray(data.authors) ? data.authors.filter((author) => typeof author === 'string') : [],
    coverUrl: typeof data.coverUrl === 'string' ? data.coverUrl : null,
    rating: data.rating,
    ratedAt: data.ratedAt instanceof Date ? data.ratedAt : null,
  };
}

/**
 * The cursor after a page of `fetched` documents ending with `last`, when the page was full (so there
 * may be more). Counts every fetched document, so an unusable one doesn't end the list early.
 */
export function nextRatingsCursor(
  fetched: number,
  pageSize: number,
  last: { bookId: string; ratedAt: unknown } | undefined,
): PublicRatingsCursor | null {
  if (fetched < pageSize || !last || !(last.ratedAt instanceof Date)) return null;
  return { ratedAt: last.ratedAt, bookId: last.bookId };
}
