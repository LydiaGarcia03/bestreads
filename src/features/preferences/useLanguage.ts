import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE, isSupportedLanguage, type Language } from '@/shared/i18n';
import { saveLanguagePreference } from './storage';

export interface UseLanguageResult {
  language: Language;
  setLanguage: (language: Language) => void;
}

export function useLanguage(): UseLanguageResult {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage;
  const language = isSupportedLanguage(current) ? current : DEFAULT_LANGUAGE;

  const setLanguage = useCallback(
    (next: Language) => {
      saveLanguagePreference(next);
      void i18n.changeLanguage(next);
    },
    [i18n],
  );

  return { language, setLanguage };
}
