import { detectLanguage, type Language } from '@/shared/i18n';
import { loadLanguagePreference } from './storage';

/** Initial UI language: the saved choice, otherwise the browser's preferred languages. */
export function resolveInitialLanguage(browserLanguages: readonly string[] = navigator.languages): Language {
  return loadLanguagePreference() ?? detectLanguage(browserLanguages);
}
