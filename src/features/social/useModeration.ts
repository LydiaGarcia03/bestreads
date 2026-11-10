import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { PublicProfile } from './publicProfile';
import type { PublicRatingsCursor, PublicRatingsPage } from './publicRating';
import { useLoadSocialRepository } from './socialContextValue';
import { requireSignedIn, socialQueryKeys, useSignedInUser } from './usePublicProfile';

/** Admin markers are created by hand in the console; once per session is enough. */
const ADMIN_STALE_TIME_MS = 30 * 60 * 1000;

const feedQueries = ['social', 'feed'] as const;

/** Whether the signed-in user is an admin (`data` is `false` for everyone else). */
export function useIsAdmin() {
  const user = useSignedInUser();
  const loadRepository = useLoadSocialRepository();

  return useQuery({
    queryKey: socialQueryKeys.isAdmin(user?.uid ?? ''),
    queryFn: async () => (await loadRepository()).isAdmin(requireSignedIn(user).uid),
    enabled: user !== null,
    staleTime: ADMIN_STALE_TIME_MS,
  });
}

/** Moderation: removes one of `uid`'s public ratings, then drops it from the cached list and feeds. */
export function useRemovePublicRating(uid: string) {
  const loadRepository = useLoadSocialRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookId: string) => {
      await (await loadRepository()).removePublicRating(uid, bookId);
      return bookId;
    },
    onSuccess: (bookId) => {
      queryClient.setQueryData<InfiniteData<PublicRatingsPage, PublicRatingsCursor | null>>(
        socialQueryKeys.ratings(uid),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              ratings: page.ratings.filter((rating) => rating.bookId !== bookId),
            })),
          },
      );
      void queryClient.invalidateQueries({ queryKey: feedQueries });
    },
  });
}

/**
 * Moderation: removes `profile` with its public ratings and follows. The profile then reads as
 * "not found", and every follow list, count and feed is refreshed.
 */
export function useRemovePublicProfile(profile: PublicProfile) {
  const loadRepository = useLoadSocialRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => (await loadRepository()).removePublicProfile(profile.uid),
    onSuccess: () => {
      queryClient.setQueryData(socialQueryKeys.profile(profile.uid), null);
      queryClient.setQueryData(socialQueryKeys.profileByUsername(profile.username), null);
      queryClient.removeQueries({ queryKey: socialQueryKeys.ratings(profile.uid) });
      void Promise.all(
        [['social', 'followCounts'], ['social', 'following'], ['social', 'followers'], feedQueries].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}
