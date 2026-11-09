import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { MAIN_NAV_ITEMS } from '../navigation';

/** Mobile-only bottom navigation (hidden from `lg`). */
export function BottomTabBar() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface-nav pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-[68px] grid-cols-4">
        {MAIN_NAV_ITEMS.map(({ id, to, Icon, end }) => (
          <li key={id} className="flex">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? 'font-bold text-accent hover:text-accent' : 'text-fg-muted hover:text-fg'
                }`
              }
            >
              <Icon size={22} />
              {t(`nav.${id}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
