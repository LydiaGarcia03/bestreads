import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext';
import { isThemePreference, THEME_PREFERENCES } from '../theme';

/** Segmented radio group: System / Light / Dark. */
export function ThemeSelector() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold">{t('settings.theme.label')}</legend>
      <div className="inline-flex w-full max-w-sm rounded-md border border-border-strong bg-surface p-1">
        {THEME_PREFERENCES.map((option) => (
          <label
            key={option}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded text-sm text-fg has-checked:bg-chip-active has-checked:font-bold has-checked:text-on-chip-active has-focus-visible:outline-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name="theme"
              value={option}
              checked={preference === option}
              onChange={(event) => {
                if (isThemePreference(event.target.value)) setPreference(event.target.value);
              }}
              className="sr-only"
            />
            {t(`settings.theme.${option}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
