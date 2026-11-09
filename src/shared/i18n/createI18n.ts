import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, type Language } from './languages';
import { resources } from './resources';

function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
}

/**
 * Creates an isolated, synchronously initialized i18next instance.
 * Both languages are bundled (a few KB), so no lazy loading is needed.
 */
export function createI18n(language: Language): i18n {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(resources),
    initAsync: false,
    interpolation: { escapeValue: false }, // React already escapes output.
    returnNull: false,
  });

  syncDocumentLanguage(language);
  instance.on('languageChanged', syncDocumentLanguage);

  return instance;
}
