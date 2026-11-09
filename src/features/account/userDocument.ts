/** `users/{uid}` document domain: pure shaping and validation, no Firestore import. */
import { DISPLAY_NAME_MAX_LENGTH, type AuthUser } from '@/features/auth';
import { isThemePreference, type ThemePreference } from '@/features/preferences';
import { isSupportedLanguage, type Language } from '@/shared/i18n';

/** Mirrors the photo URL limit in `firestore.rules`. */
export const PHOTO_URL_MAX_LENGTH = 2048;

export interface UserPreferences {
  theme: ThemePreference;
  language: Language;
}

export interface UserProfile {
  displayName: string | null;
  photoURL: string | null;
}

/** Profile fields stored for a user, kept within the limits `firestore.rules` accepts. */
export function profileFromAuthUser(user: AuthUser): UserProfile {
  const displayName = user.displayName?.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || null;
  const photoURL = user.photoURL && user.photoURL.length <= PHOTO_URL_MAX_LENGTH ? user.photoURL : null;
  return { displayName, photoURL };
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Reads the stored profile fields from raw document data. */
export function readStoredProfile(data: Readonly<Record<string, unknown>>): UserProfile {
  return { displayName: nullableString(data.displayName), photoURL: nullableString(data.photoURL) };
}

/** Reads stored preferences, using `fallback` for any missing or invalid field. */
export function readStoredPreferences(value: unknown, fallback: UserPreferences): UserPreferences {
  if (typeof value !== 'object' || value === null) return fallback;
  const { theme, language } = value as Record<string, unknown>;
  return {
    theme: isThemePreference(theme) ? theme : fallback.theme,
    language: isSupportedLanguage(language) ? language : fallback.language,
  };
}

/** Fields of `next` that differ from `previous`, or `null` when nothing changed. */
function changedFields<T extends object>(previous: T, next: T): Partial<T> | null {
  const keys = Object.keys(next) as (keyof T)[];
  const changed = keys.filter((key) => previous[key] !== next[key]);
  if (changed.length === 0) return null;
  return Object.fromEntries(changed.map((key) => [key, next[key]])) as Partial<T>;
}

export function profileChanges(stored: UserProfile, current: UserProfile): Partial<UserProfile> | null {
  return changedFields(stored, current);
}

export function preferenceChanges(
  stored: UserPreferences,
  current: UserPreferences,
): Partial<UserPreferences> | null {
  return changedFields(stored, current);
}
