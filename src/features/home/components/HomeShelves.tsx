import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import {
  buildShelfPath,
  parseShelfKey,
  SHELF_QUERY_PARAM,
  shelfKey,
  useShelfBooks,
  type ShelfFilter,
} from '@/features/books/lazy';
import { ShelfBookList, ShelfChips, useShelfOptions } from '@/features/shelves';

const HOME_PATH = '/';
/** "Currently reading" has its own section above, so Home opens on the books already read. */
const DEFAULT_HOME_SHELF: ShelfFilter = { kind: 'status', status: 'read' };
/** Books shown on Home; the shelves screen has the rest. */
const MAX_BOOKS = 12;

/** "My shelves": chips to pick a shelf (kept in `?shelf=`) and its latest books, with a link to all of them. */
export function HomeShelves() {
  const { t } = useTranslation();
  const headingId = useId();
  const [searchParams] = useSearchParams();
  const { options } = useShelfOptions();
  const filter = parseShelfKey(searchParams.get(SHELF_QUERY_PARAM)) ?? DEFAULT_HOME_SHELF;
  const books = useShelfBooks(filter);
  const shown = (books.data ?? []).slice(0, MAX_BOOKS);
  const total = books.data?.length ?? 0;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="font-serif text-sm font-bold tracking-wide text-fg-muted uppercase lg:text-lg lg:tracking-normal lg:text-fg lg:normal-case">
        {t('shelves.myShelves')}
      </h2>
      <ShelfChips options={options} selected={shelfKey(filter)} path={HOME_PATH} />

      {books.isPending && (
        <p role="status" className="text-sm text-fg-muted">
          {t('shelves.loading')}
        </p>
      )}
      {books.isError && (
        <p role="alert" className="text-sm">
          {t('shelves.loadError')}
        </p>
      )}
      {books.isSuccess && total === 0 && <p className="text-sm text-fg-muted">{t('shelves.empty')}</p>}
      {shown.length > 0 && <ShelfBookList books={shown} />}
      {total > 0 && (
        <Link to={buildShelfPath(filter)} className="w-fit text-sm font-bold">
          {t('home.seeShelf', { count: total })}
        </Link>
      )}
    </section>
  );
}
