import { useInfiniteQuery } from '@tanstack/react-query';
import { PUBLIC_RATINGS_PAGE_SIZE, type PublicRatingsCursor } from './publicRating';
import { useLoadSocialRepository } from './socialContextValue';
import { socialQueryKeys } from './usePublicProfile';

/** Someone's ratings change rarely; a few minutes keeps revisits free of reads. */
const RATINGS_STALE_TIME_MS = 5 * 60 * 1000;

/** `uid`'s public ratings, newest first, one page at a time (`fetchNextPage` loads more). */
export function usePublicRatings(uid: string) {
  const loadRepository = useLoadSocialRepository();

  return useInfiniteQuery({
    queryKey: socialQueryKeys.ratings(uid),
    queryFn: async ({ pageParam }) =>
      (await loadRepository()).listPublicRatings(uid, { pageSize: PUBLIC_RATINGS_PAGE_SIZE, after: pageParam }),
    initialPageParam: null as PublicRatingsCursor | null,
    getNextPageParam: (page) => page.next,
    select: (data) => data.pages.flatMap((page) => page.ratings),
    staleTime: RATINGS_STALE_TIME_MS,
  });
}
