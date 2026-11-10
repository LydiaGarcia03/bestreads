import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  buildShelfPath,
  SHELF_LIMITS,
  SHELF_QUERY_PARAM,
  SHELVES_PATH,
  ShelfNameForm,
  shelfKey,
  useCreateShelf,
  useShelfCount,
} from '@/features/books/lazy';
import { DEFAULT_SHELF } from './fixedShelves';
import { useShelfOptions, type ShelfOption } from './useShelfOptions';

/**
 * "My shelves" in the desktop side menu: every shelf with its count, and "+ New shelf".
 * Lazy-loaded by the side menu on desktop only, so phones never download it or request the counts.
 */
export function MyShelvesNav() {
  const { t } = useTranslation();
  const { options, shelves } = useShelfOptions();
  const createShelf = useCreateShelf();
  const [isCreating, setIsCreating] = useState(false);
  const location = useLocation();
  const current =
    location.pathname === SHELVES_PATH
      ? (new URLSearchParams(location.search).get(SHELF_QUERY_PARAM) ?? shelfKey(DEFAULT_SHELF))
      : null;

  return (
    <div className="mt-4 flex flex-col gap-1">
      <h2 className="mx-3 mb-1 font-serif text-xs font-bold tracking-wide text-fg-muted uppercase">{t('shelves.myShelves')}</h2>
      <ul className="flex flex-col">
        {options.map((option) => (
          <li key={shelfKey(option.filter)}>
            <ShelfNavLink option={option} isCurrent={current === shelfKey(option.filter)} />
          </li>
        ))}
      </ul>

      {isCreating ? (
        <div className="mx-3 mt-1">
          <ShelfNameForm
            label={t('shelves.newShelfLabel')}
            submitLabel={t('shelves.create')}
            shelves={shelves.data ?? []}
            isBusy={createShelf.isPending}
            autoFocus
            onSubmit={(name) => createShelf.mutate(name, { onSuccess: () => setIsCreating(false) })}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      ) : (
        (shelves.data?.length ?? 0) < SHELF_LIMITS.count && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="mx-3 mt-1.5 h-9 rounded-md border border-dashed border-fg-muted text-[13px] text-fg hover:border-accent"
          >
            {t('shelves.newShelf')}
          </button>
        )
      )}
      {createShelf.isError && (
        <p role="alert" className="mx-3 text-xs font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </div>
  );
}

function ShelfNavLink({ option, isCurrent }: { option: ShelfOption; isCurrent: boolean }) {
  const count = useShelfCount(option.filter);

  return (
    // A plain Link: NavLink would mark every shelf current, since they share one path and differ by query.
    <Link
      to={buildShelfPath(option.filter)}
      aria-current={isCurrent ? 'page' : undefined}
      className={`flex h-9 items-center justify-between gap-3 rounded-md px-3 text-sm ${
        isCurrent ? 'bg-surface font-bold text-accent hover:text-accent' : 'text-fg hover:bg-surface hover:text-fg'
      }`}
    >
      <span className="truncate">{option.name}</span>
      {count.data !== undefined && (
        <>
          {/* Keeps the name and count apart in the accessible name ("Read 24"). */}{' '}
          <span className="text-fg-muted">{count.data}</span>
        </>
      )}
    </Link>
  );
}
