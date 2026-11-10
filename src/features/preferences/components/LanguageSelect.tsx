import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/shared/i18n';
import { CheckIcon, ChevronDownIcon, LanguageIcon } from '@/shared/ui/icons';
import { useMenu } from '@/shared/ui/useMenu';
import { useLanguage } from '../useLanguage';

const MENU_ALIGNMENT = { start: 'left-0', end: 'right-0' } as const;

export interface LanguageSelectProps {
  /** Which edge of the button the menu lines up with (`end` in the top bar's right corner). */
  align?: keyof typeof MENU_ALIGNMENT;
}

/** Language menu button: icon + `EN` / `PT-BR`, opening a list of languages in their own names. */
export function LanguageSelect({ align = 'end' }: LanguageSelectProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { isOpen, containerRef, choose, buttonProps, menuProps } = useMenu();

  return (
    <div ref={containerRef} className="relative w-fit">
      <button
        {...buttonProps}
        aria-label={`${t('language.label')}: ${t(`language.names.${language}`)}`}
        className="flex h-11 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-fg hover:bg-surface-muted aria-expanded:bg-surface-muted"
      >
        <LanguageIcon className="text-fg-muted" />
        {t(`language.options.${language}`)}
        <ChevronDownIcon size={14} className="text-fg-muted" />
      </button>

      {isOpen && (
        <ul
          {...menuProps}
          aria-label={t('language.label')}
          className={`absolute top-full z-30 mt-1 min-w-48 overflow-hidden rounded-md border border-border-strong bg-surface py-1 shadow-lg ${MENU_ALIGNMENT[align]}`}
        >
          {SUPPORTED_LANGUAGES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={code === language}
                tabIndex={-1}
                lang={code}
                onClick={() => choose(() => setLanguage(code))}
                className="flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-sm text-fg hover:bg-surface-muted focus:bg-surface-muted focus:outline-none aria-checked:font-bold aria-checked:text-accent"
              >
                <span className="flex-1">{t(`language.names.${code}`)}</span>
                {code === language && <CheckIcon />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
