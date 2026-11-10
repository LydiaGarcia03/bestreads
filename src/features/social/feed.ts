/** Friends feed: merges followed users' latest public ratings. Pure, no React or I/O. */
import type { PublicProfile } from './publicProfile';
import type { PublicRating } from './publicRating';

/** Latest ratings read per followed user (one small query each). */
export const FEED_RATINGS_PER_USER = 5;

/** Items on the Friends screen feed. */
export const FEED_SIZE = 20;

/** Items in the Home side column. */
export const HOME_FEED_SIZE = 5;

export interface FeedItem {
  profile: PublicProfile;
  rating: PublicRating;
}

export interface FeedSource {
  profile: PublicProfile;
  ratings: readonly PublicRating[];
}

/** Newest first; undated ratings go last (and keep their order). */
function byNewest(a: FeedItem, b: FeedItem): number {
  const timeA = a.rating.ratedAt?.getTime();
  const timeB = b.rating.ratedAt?.getTime();
  if (timeA === timeB) return 0;
  if (timeA === undefined) return 1;
  if (timeB === undefined) return -1;
  return timeB - timeA;
}

/** Every source's ratings as one list, newest first (undated last), cut to `size`. */
export function buildFeed(sources: readonly FeedSource[], size: number): FeedItem[] {
  if (size <= 0) return [];
  return sources
    .flatMap(({ profile, ratings }) => ratings.map((rating) => ({ profile, rating })))
    .sort(byNewest)
    .slice(0, size);
}
