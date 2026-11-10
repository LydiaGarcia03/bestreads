import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { MAIN_NAV_ITEMS } from '../navigation';

// Desktop only: lazy, so phones never download it (nor request the shelf counts).
const MyShelvesNav = lazy(() =>
  import('@/features/shelves/MyShelvesNav').then((module) => ({ default: module.MyShelvesNav })),
);

/** Desktop-only side menu (from `lg`): the main tabs, then the user's shelves. */
export function SideNav() {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <nav aria-label={t('nav.main')} className="sticky top-6 hidden w-60 shrink-0 self-start lg:block">
      <ul className="flex flex-col gap-1">
        {MAIN_NAV_ITEMS.map(({ id, to, Icon, end }) => (
          <li key={id}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md border px-3 text-sm ${
                  isActive
                    ? 'border-border bg-surface font-bold text-accent hover:text-accent'
                    : 'border-transparent text-fg hover:bg-surface hover:text-fg'
                }`
              }
            >
              <Icon />
              {t(`nav.${id}`)}
            </NavLink>
          </li>
        ))}
      </ul>
      {isDesktop && (
        <Suspense fallback={null}>
          <MyShelvesNav />
        </Suspense>
      )}
    </nav>
  );
}
