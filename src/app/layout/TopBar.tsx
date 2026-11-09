import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LanguageSelect } from '@/features/preferences';
import { SearchBar } from '@/features/search';
import { UserIcon } from '@/shared/ui/icons';
import { PATHS } from '../paths';
import { Logo } from './Logo';

/**
 * Mobile: logo + actions on the first row, full-width search below.
 * Desktop (lg): one row — logo, large search, actions on the right.
 */
export function TopBar() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-border bg-bg pt-[env(safe-area-inset-top)] lg:bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2.5 px-5 py-3 lg:flex-nowrap lg:px-6">
        <Logo />
        <SearchBar className="order-last w-full lg:order-none lg:max-w-[560px] lg:flex-1" />
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
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
