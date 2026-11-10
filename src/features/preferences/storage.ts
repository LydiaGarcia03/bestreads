/**
 * Device-local preferences (localStorage). Used before login and as a fast cache;
 * signed-in preferences are also synced to `users/{uid}` (see `features/account`).
 */
import { isSupportedLanguage, type Language } from '@/shared/i18n';
import { readLocalValue as readPreference, writeLocalValue as writePreference } from '@/shared/storage/localStorage';
import { DEFAULT_THEME_PREFERENCE, isThemePreference, type ThemePreference } from './theme';

export const STORAGE_KEYS = {
  theme: 'bestreads.theme',
  language: 'bestreads.language',
} as const;

export { readPreference, writePreference };

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
