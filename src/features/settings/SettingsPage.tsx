import { useTranslation } from 'react-i18next';
import { AccountDetails } from '@/features/auth';
import { LanguageSelect, ThemeSelector } from '@/features/preferences';
import { PublicProfileCard } from '@/features/social/lazy';
import { PageHeading } from '@/shared/ui/PageHeading';

/** Settings screen: account, public profile, appearance and language. */
export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeading>{t('pages.settings.title')}</PageHeading>

      <section aria-labelledby="settings-account" className="flex flex-col gap-3">
        <h2 id="settings-account" className="text-sm font-bold tracking-wide text-fg-muted uppercase">
          {t('settings.account')}
        </h2>
        <AccountDetails />
      </section>

      <section aria-labelledby="settings-public-profile" className="flex flex-col gap-3">
        <h2 id="settings-public-profile" className="text-sm font-bold tracking-wide text-fg-muted uppercase">
          {t('social.profileSection')}
        </h2>
        <PublicProfileCard />
      </section>

      <section aria-labelledby="settings-appearance" className="flex flex-col gap-3">
        <h2 id="settings-appearance" className="text-sm font-bold tracking-wide text-fg-muted uppercase">
          {t('settings.appearance')}
        </h2>
        <ThemeSelector />
      </section>

      <section aria-labelledby="settings-language" className="flex flex-col gap-3">
        <h2 id="settings-language" className="text-sm font-bold tracking-wide text-fg-muted uppercase">
          {t('settings.languageSection')}
        </h2>
        <LanguageSelect align="start" />
      </section>
    </div>
  );
}
