import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from '@/shared/i18n';
import { GlobeIcon } from '@/shared/ui/icons';
import { useLanguage } from '../useLanguage';

/** Compact language dropdown for the top bar (globe icon + EN / PT-BR). */
export function LanguageSelect() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const selectId = useId();

  return (
    <label htmlFor={selectId} className="flex h-11 items-center gap-1 px-0.5 text-fg-muted">
      <GlobeIcon />
      <select
        id={selectId}
        aria-label={t('language.label')}
        value={language}
        onChange={(event) => {
          const next = event.target.value;
          if (isSupportedLanguage(next)) setLanguage(next);
        }}
        className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-bold text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {t(`language.options.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
