/** Social routes: pure, no router import. */

/** Friends screen: choosing a username, finding and following people. */
export const FRIENDS_PATH = '/friends';

export const PROFILE_PATH = '/u/:username';

export function buildProfilePath(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}
