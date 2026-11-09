import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { MAIN_NAV_ITEMS } from '../navigation';

/** Desktop-only side menu (from `lg`). The user's shelves are added below the tabs in Phase 2. */
export function SideNav() {
  const { t } = useTranslation();

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
    </nav>
  );
}
