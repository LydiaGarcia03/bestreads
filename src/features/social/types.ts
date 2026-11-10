import type { FollowCounts } from './follows';
import type { PublicProfile, PublicProfileDetails } from './publicProfile';
import type { PublicRatingsCursor, PublicRatingsPage } from './publicRating';

/** Thrown by `claimUsername` when someone else already has the username. */
export class UsernameTakenError extends Error {
  constructor(readonly username: string) {
    super(`Username "${username}" is taken`);
    this.name = 'UsernameTakenError';
  }
}

/** Thrown by `claimUsername` when the user already has a username (it can't be changed). */
export class UsernameAlreadySetError extends Error {
  constructor() {
    super('This user already has a username');
    this.name = 'UsernameAlreadySetError';
  }
}

/** `usernames/{username}` and `public/{uid}` storage boundary. Implemented with Firestore; faked in tests. */
export interface SocialRepository {
  /** The user's public profile, or `null` before they choose a username. */
  getPublicProfile(uid: string): Promise<PublicProfile | null>;
  /**
   * Reserves `username` (already validated and normalized) and creates the public profile, atomically.
   * Rejects with `UsernameTakenError` or `UsernameAlreadySetError`.
   */
  claimUsername(uid: string, username: string, details: PublicProfileDetails): Promise<PublicProfile>;
  /** The profile owning `username` (normalized), or `null` when nobody has it. */
  findProfileByUsername(username: string): Promise<PublicProfile | null>;
  /** One page of `uid`'s public ratings, newest first, starting after `after`. */
  listPublicRatings(uid: string, options: { pageSize: number; after: PublicRatingsCursor | null }): Promise<PublicRatingsPage>;
  isFollowing(followerUid: string, followedUid: string): Promise<boolean>;
  follow(followerUid: string, followedUid: string): Promise<void>;
  unfollow(followerUid: string, followedUid: string): Promise<void>;
  countFollows(uid: string): Promise<FollowCounts>;
  /** Public profiles `uid` follows (at most `FOLLOW_LIST_LIMIT`); profiles removed since are skipped. */
  listFollowing(uid: string): Promise<PublicProfile[]>;
  /** Public profiles following `uid` (at most `FOLLOW_LIST_LIMIT`); profiles removed since are skipped. */
  listFollowers(uid: string): Promise<PublicProfile[]>;
}
