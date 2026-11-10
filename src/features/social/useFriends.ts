import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildFeed, FEED_RATINGS_PER_USER, FEED_SIZE, type FeedItem } from './feed';
import type { SocialRepository } from './types';
import { useLoadSocialRepository } from './socialContextValue';
import { requireSignedIn, socialQueryKeys, useSignedInUser } from './usePublicProfile';

/** Follow lists change through this app (which refreshes them) or when someone else follows the user. */
const FOLLOW_LISTS_STALE_TIME_MS = 5 * 60 * 1000;

/** New public ratings from friends can show up a few minutes late; each refresh costs one query per friend. */
const FEED_STALE_TIME_MS = 5 * 60 * 1000;

type LoadRepository = () => Promise<SocialRepository>;

function followingQuery(loadRepository: LoadRepository, uid: string) {
  return queryOptions({
    queryKey: socialQueryKeys.following(uid),
    queryFn: async () => (await loadRepository()).listFollowing(uid),
    staleTime: FOLLOW_LISTS_STALE_TIME_MS,
  });
}

/** Public profiles `uid` follows. */
export function useFollowing(uid: string) {
  const loadRepository = useLoadSocialRepository();
  return useQuery({ ...followingQuery(loadRepository, uid), enabled: uid.length > 0 });
}

/** Public profiles following `uid`. */
export function useFollowers(uid: string) {
  const loadRepository = useLoadSocialRepository();

  return useQuery({
    queryKey: socialQueryKeys.followers(uid),
    queryFn: async () => (await loadRepository()).listFollowers(uid),
    enabled: uid.length > 0,
    staleTime: FOLLOW_LISTS_STALE_TIME_MS,
  });
}

/**
 * The latest public ratings of the people the signed-in user follows, newest first, cut to `size`.
 * Reads each followed user's few latest ratings (no collection-group query: ratings have no owner field).
 */
export function useFriendsFeed(size: number = FEED_SIZE) {
  const user = useSignedInUser();
  const loadRepository = useLoadSocialRepository();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: socialQueryKeys.feed(user?.uid ?? ''),
    queryFn: async (): Promise<FeedItem[]> => {
      // Shares the cached following list; refetched when stale (e.g. right after a follow).
      const following = await queryClient.fetchQuery(followingQuery(loadRepository, requireSignedIn(user).uid));
      const repository = await loadRepository();
      const sources = await Promise.all(
        following.map(async (profile) => {
          const page = await repository.listPublicRatings(profile.uid, { pageSize: FEED_RATINGS_PER_USER, after: null });
          return { profile, ratings: page.ratings };
        }),
      );
      return buildFeed(sources, FEED_SIZE);
    },
    select: (items) => items.slice(0, size),
    enabled: user !== null,
    staleTime: FEED_STALE_TIME_MS,
  });
}
