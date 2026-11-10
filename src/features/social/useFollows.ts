import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FollowCounts } from './follows';
import { useLoadSocialRepository } from './socialContextValue';
import { requireSignedIn, socialQueryKeys, useSignedInUser } from './usePublicProfile';

/** Follows change only through this app, which updates the cache itself. */
const FOLLOWS_STALE_TIME_MS = 5 * 60 * 1000;

/** Whether the signed-in user follows `uid`. */
export function useIsFollowing(uid: string) {
  const user = useSignedInUser();
  const loadRepository = useLoadSocialRepository();

  return useQuery({
    queryKey: socialQueryKeys.isFollowing(user?.uid ?? '', uid),
    queryFn: async () => (await loadRepository()).isFollowing(requireSignedIn(user).uid, uid),
    enabled: user !== null,
    staleTime: FOLLOWS_STALE_TIME_MS,
  });
}

/** How many people follow `uid` and how many `uid` follows. */
export function useFollowCounts(uid: string) {
  const loadRepository = useLoadSocialRepository();

  return useQuery({
    queryKey: socialQueryKeys.followCounts(uid),
    queryFn: async () => (await loadRepository()).countFollows(uid),
    staleTime: FOLLOWS_STALE_TIME_MS,
  });
}

/** Follows (`true`) or unfollows (`false`) `uid`, then updates the button and both users' counts. */
export function useSetFollowing(uid: string) {
  const user = useSignedInUser();
  const loadRepository = useLoadSocialRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shouldFollow: boolean) => {
      const repository = await loadRepository();
      const { uid: viewerUid } = requireSignedIn(user);
      if (shouldFollow) await repository.follow(viewerUid, uid);
      else await repository.unfollow(viewerUid, uid);
      return shouldFollow;
    },
    onSuccess: (isFollowing) => {
      const viewerUid = requireSignedIn(user).uid;
      queryClient.setQueryData(socialQueryKeys.isFollowing(viewerUid, uid), isFollowing);
      const change = isFollowing ? 1 : -1;
      queryClient.setQueryData<FollowCounts>(socialQueryKeys.followCounts(uid), (counts) =>
        counts ? { ...counts, followers: Math.max(0, counts.followers + change) } : counts,
      );
      queryClient.setQueryData<FollowCounts>(socialQueryKeys.followCounts(viewerUid), (counts) =>
        counts ? { ...counts, following: Math.max(0, counts.following + change) } : counts,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: socialQueryKeys.following(viewerUid) }),
        queryClient.invalidateQueries({ queryKey: socialQueryKeys.followers(uid) }),
        queryClient.invalidateQueries({ queryKey: socialQueryKeys.feed(viewerUid) }),
      ]);
    },
  });
}
