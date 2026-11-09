/**
 * Device-local preferences (localStorage). Used before login and as a fast
 * cache; signed-in preferences are synced to `users/{uid}` once Firebase is in place.
 * Every access is wrapped in try/catch: storage can be blocked (private mode, policies).
 */

export const STORAGE_KEYS = {
  theme: 'bestreads.theme',
  language: 'bestreads.language',
} as const;

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the preference lasts for this session only.
  }
}
