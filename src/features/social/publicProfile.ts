/** `public/{uid}` document domain: pure shaping, no Firestore import. */

/** What other signed-in users can see about someone: never anything from `users/{uid}/...`. */
export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string | null;
  photoURL: string | null;
}

/** Display name and photo shown on the public profile (already within the stored limits). */
export interface PublicProfileDetails {
  displayName: string | null;
  photoURL: string | null;
}

const nullableString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** Reads a stored public profile, or `null` when it has no username (not a usable profile). */
export function readPublicProfile(uid: string, data: Readonly<Record<string, unknown>>): PublicProfile | null {
  if (typeof data.username !== 'string' || data.username.length === 0) return null;
  return {
    uid,
    username: data.username,
    displayName: nullableString(data.displayName),
    photoURL: nullableString(data.photoURL),
  };
}

/** `@username`, as shown in the app. */
export function formatUsername(username: string): string {
  return `@${username}`;
}
