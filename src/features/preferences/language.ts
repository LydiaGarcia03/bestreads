import { DEFAULT_LANGUAGE, type Language } from '@/shared/i18n';
import { loadLanguagePreference } from './storage';

/** Initial UI language: the saved choice, otherwise English (the browser language is not used). */
export function resolveInitialLanguage(): Language {
  return loadLanguagePreference() ?? DEFAULT_LANGUAGE;
}
