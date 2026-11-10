import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileFromAuthUser } from '@/features/account';
import { useAuth } from '@/features/auth';
import type { PublicProfile } from './publicProfile';
import { useLoadSocialRepository } from './socialContextValue';

/** A public profile changes only when its owner edits it, so one fetch per session is plenty. */
const PROFILE_STALE_TIME_MS = 30 * 60 * 1000;

export const socialQueryKeys = {
  all: ['social'] as const,
  profile: (uid: string) => ['social', 'profile', uid] as const,
  profileByUsername: (username: string) => ['social', 'username', username] as const,
  ratings: (uid: string) => ['social', 'ratings', uid] as const,
  isFollowing: (followerUid: string, followedUid: string) => ['social', 'isFollowing', followerUid, followedUid] as const,
  followCounts: (uid: string) => ['social', 'followCounts', uid] as const,
  following: (uid: string) => ['social', 'following', uid] as const,
  followers: (uid: string) => ['social', 'followers', uid] as const,
  feed: (uid: string) => ['social', 'feed', uid] as const,
  isAdmin: (uid: string) => ['social', 'isAdmin', uid] as const,
};

/** The signed-in user (`null` while auth is still loading). */
export function useSignedInUser() {
  const auth = useAuth();
  return auth.status === 'signedIn' ? auth.user : null;
}

export function requireSignedIn<T>(user: T | null): T {
  if (!user) throw new Error('Social features need a signed-in user');
  return user;
}

/** The signed-in user's public profile (`data` is `null` before they choose a username). */
export function useOwnPublicProfile() {
  const user = useSignedInUser();
  const loadRepository = useLoadSocialRepository();

  return useQuery({
    queryKey: socialQueryKeys.profile(user?.uid ?? ''),
    queryFn: async () => (await loadRepository()).getPublicProfile(requireSignedIn(user).uid),
    enabled: user !== null,
    staleTime: PROFILE_STALE_TIME_MS,
  });
}

/** The public profile owning `username` (normalized); `data` is `null` when nobody has it. */
export function useProfileByUsername(username: string) {
  const loadRepository = useLoadSocialRepository();

  return useQuery({
    queryKey: socialQueryKeys.profileByUsername(username),
    queryFn: async () => (await loadRepository()).findProfileByUsername(username),
    enabled: username.length > 0,
    staleTime: PROFILE_STALE_TIME_MS,
  });
}

/** Claims a username (already validated) and creates the public profile with the account's name and photo. */
export function useClaimUsername() {
  const user = useSignedInUser();
  const loadRepository = useLoadSocialRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string): Promise<PublicProfile> => {
      const { uid } = requireSignedIn(user);
      return (await loadRepository()).claimUsername(uid, username, profileFromAuthUser(requireSignedIn(user)));
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(socialQueryKeys.profile(profile.uid), profile);
      queryClient.setQueryData(socialQueryKeys.profileByUsername(profile.username), profile);
    },
  });
}
