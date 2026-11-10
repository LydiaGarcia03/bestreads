/** Follow relation rules: pure, no React or I/O. Mirrored in `firestore.rules` (`follows`). */

/** `follows/{followerUid}_{followedUid}`: one document per pair, so a follow can't be duplicated. */
export function followId(followerUid: string, followedUid: string): string {
  return `${followerUid}_${followedUid}`;
}

/** Most people shown in a following or followers list (and followed users read for the feed). */
export const FOLLOW_LIST_LIMIT = 100;

export interface FollowCounts {
  followers: number;
  following: number;
}

/** Whether `viewerUid` may follow `profileUid`: never themselves. */
export function canFollow(viewerUid: string, profileUid: string): boolean {
  return viewerUid !== profileUid;
}
