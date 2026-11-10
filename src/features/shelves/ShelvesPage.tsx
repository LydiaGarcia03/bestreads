import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { parseShelfKey, SHELF_QUERY_PARAM, shelfKey, useShelfBooks } from '@/features/books/lazy';
import { Button } from '@/shared/ui/Button';
import { PageHeading } from '@/shared/ui/PageHeading';
import { ManageShelves } from './components/ManageShelves';
import { ShelfBookList } from './components/ShelfBookList';
import { ShelfChips } from './components/ShelfChips';
import { DEFAULT_SHELF } from './fixedShelves';
import { useShelfOptions } from './useShelfOptions';

/**
 * Shelves screen (`/shelves?shelf=…`): filter chips for every shelf, the chosen shelf's books
 * (list on phones, cover grid on desktop) and the user's shelves to manage.
 */
export function ShelvesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { options, shelves } = useShelfOptions();
  const filter = parseShelfKey(searchParams.get(SHELF_QUERY_PARAM)) ?? DEFAULT_SHELF;
  const selected = shelfKey(filter);
  const option = options.find((candidate) => shelfKey(candidate.filter) === selected);
  // A custom shelf that doesn't exist (deleted, or a stale link) once the shelves have loaded.
  const isUnknownShelf = filter.kind === 'custom' && shelves.isSuccess && !option;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <section aria-labelledby="shelf-heading" className="flex min-w-0 flex-1 flex-col gap-5">
        <PageHeading>{t('pages.shelves.title')}</PageHeading>
        <ShelfChips options={options} selected={selected} />
        {/* Keeps its height while custom shelf names load, so the list doesn't jump. */}
        <h2 id="shelf-heading" className="min-h-7 text-lg font-bold">
          {option?.name ?? (isUnknownShelf ? t('shelves.unknownShelf') : null)}
        </h2>
        {isUnknownShelf ? (
          <p className="text-fg-muted">{t('shelves.unknownShelfHint')}</p>
        ) : (
          <ShelfBooks filterKey={selected} />
        )}
      </section>

      <aside className="w-full border-t border-border pt-6 lg:sticky lg:top-6 lg:w-80 lg:shrink-0 lg:border-0 lg:pt-0">
        <ManageShelves shelves={shelves.data ?? []} />
      </aside>
    </div>
  );
}

function ShelfBooks({ filterKey }: { filterKey: string }) {
  const { t } = useTranslation();
  const books = useShelfBooks(parseShelfKey(filterKey));

  if (books.isPending) {
    return (
      <p role="status" className="text-fg-muted">
        {t('shelves.loading')}
      </p>
    );
  }
  if (books.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>{t('shelves.loadError')}</p>
        <Button variant="secondary" onClick={() => void books.refetch()}>
          {t('books.retry')}
        </Button>
      </div>
    );
  }
  if (books.data.length === 0) return <p className="text-fg-muted">{t('shelves.empty')}</p>;
  return <ShelfBookList books={books.data} />;
}
