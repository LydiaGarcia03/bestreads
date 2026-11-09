/**
 * Device-local preferences (localStorage). Used before login and as a fast cache;
 * signed-in preferences will also be synced to `users/{uid}` (Phase 1.5).
 * Every access is wrapped in try/catch: storage can be blocked (private mode, policies).
 */
import { isSupportedLanguage, type Language } from '@/shared/i18n';
import { DEFAULT_THEME_PREFERENCE, isThemePreference, type ThemePreference } from './theme';

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

export function loadThemePreference(): ThemePreference {
  const stored = readPreference(STORAGE_KEYS.theme);
  return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
}

export function saveThemePreference(preference: ThemePreference): void {
  writePreference(STORAGE_KEYS.theme, preference);
}

/** Returns the stored language, or `null` when none (or an unsupported one) is saved. */
export function loadLanguagePreference(): Language | null {
  const stored = readPreference(STORAGE_KEYS.language);
  return isSupportedLanguage(stored) ? stored : null;
}

export function saveLanguagePreference(language: Language): void {
  writePreference(STORAGE_KEYS.language, language);
}
