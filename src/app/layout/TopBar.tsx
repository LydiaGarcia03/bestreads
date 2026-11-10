import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LanguageSelect } from '@/features/preferences';
import { InstallAppButton } from '@/features/pwa';
import { SearchBar } from '@/features/search';
import { UserIcon } from '@/shared/ui/icons';
import { PATHS } from '../paths';
import { Logo } from './Logo';

/**
 * Mobile: logo + actions on the first row, full-width search below.
 * Desktop (lg): one row in three columns — logo on the left, search centered, actions on the right.
 */
export function TopBar() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-border bg-bg pt-[env(safe-area-inset-top)] lg:bg-surface">
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-2.5 px-5 py-3 lg:grid lg:grid-cols-[1fr_minmax(0,560px)_1fr] lg:px-6">
        <Logo />
        <SearchBar className="order-last w-full lg:order-none" />
        <div className="ml-auto flex items-center gap-2 lg:justify-self-end lg:gap-3">
          <InstallAppButton />
          <LanguageSelect />
          <Link
            to={PATHS.settings}
            aria-label={t('header.profileAndSettings')}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg hover:text-accent lg:bg-bg"
          >
            <UserIcon size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
