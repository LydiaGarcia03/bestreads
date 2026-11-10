/** Username rules: pure, no React or I/O. Mirrored in `firestore.rules` (`isValidUsername`). */

export const USERNAME_LIMITS = { min: 3, max: 20 } as const;

/** Lowercase letters, digits and `_`, as stored. */
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/** Names that could pass for the app or its staff. Mirrored in `firestore.rules`. */
export const RESERVED_USERNAMES: readonly string[] = [
  'admin',
  'administrator',
  'bestreads',
  'help',
  'moderator',
  'official',
  'root',
  'support',
  'system',
];

export type UsernameError = 'empty' | 'tooShort' | 'tooLong' | 'invalidCharacters' | 'reserved';

export type UsernameValidation = { ok: true; username: string } | { ok: false; error: UsernameError };

/** The username as stored: no surrounding spaces, no leading `@`, lowercase. */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}

export function validateUsername(input: string): UsernameValidation {
  const username = normalizeUsername(input);
  if (username.length === 0) return { ok: false, error: 'empty' };
  if (!USERNAME_PATTERN.test(username)) return { ok: false, error: 'invalidCharacters' };
  if (username.length < USERNAME_LIMITS.min) return { ok: false, error: 'tooShort' };
  if (username.length > USERNAME_LIMITS.max) return { ok: false, error: 'tooLong' };
  if (RESERVED_USERNAMES.includes(username)) return { ok: false, error: 'reserved' };
  return { ok: true, username };
}
