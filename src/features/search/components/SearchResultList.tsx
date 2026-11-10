import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookCover, buildBookPath } from '@/features/books';
import type { CatalogBook } from '@/features/catalog';
import { formatPublishedDate } from '../publishedDate';
import { SeriesLabel } from './SeriesLabel';
import type { SearchView } from '../searchView';

/** List: one row per book with details. Grid: covers with title and author. */
export function SearchResultList({ results, view }: { results: readonly CatalogBook[]; view: SearchView }) {
  const listClass =
    view === 'list'
      ? 'flex flex-col divide-y divide-border'
      : 'grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-8 xl:grid-cols-6';

  return (
    <ul className={listClass}>
      {results.map((book) => (
        <li key={book.id}>{view === 'list' ? <ListItem book={book} /> : <GridItem book={book} />}</li>
      ))}
    </ul>
  );
}

function ListItem({ book }: { book: CatalogBook }) {
  const { t, i18n } = useTranslation();
  const facts = [
    book.publishedDate
      ? t('search.published', { date: formatPublishedDate(book.publishedDate, i18n.resolvedLanguage ?? 'en') })
      : null,
    book.pageCount ? t('search.pageCount', { count: book.pageCount }) : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <Link to={buildBookPath(book.id)} className="group flex gap-4 py-4 text-fg hover:text-fg">
      <BookCover src={book.coverUrl} title={book.title} className="w-16 shrink-0 lg:w-20" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="line-clamp-2 text-base font-bold group-hover:text-accent">
          {book.title}
          <SeriesLabel series={book.series} />
        </h2>
        {book.subtitle && <p className="line-clamp-1 text-sm text-fg-muted">{book.subtitle}</p>}
        {book.authors.length > 0 && (
          <p className="line-clamp-1 text-sm">{t('books.by', { authors: book.authors.join(', ') })}</p>
        )}
        {facts.length > 0 && <p className="text-xs text-fg-muted">{facts.join(' · ')}</p>}
        {book.categories.length > 0 && (
          <ul aria-label={t('search.categories')} className="mt-0.5 flex flex-wrap gap-1.5">
            {book.categories.map((category) => (
              <li key={category} className="rounded-full border border-border-strong px-2 py-0.5 text-xs text-fg-muted">
                {category}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

function GridItem({ book }: { book: CatalogBook }) {
  return (
    <Link to={buildBookPath(book.id)} className="group flex flex-col gap-2 text-fg hover:text-fg">
      <BookCover src={book.coverUrl} title={book.title} className="w-full" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="line-clamp-2 text-sm font-bold group-hover:text-accent">
          {book.title}
          <SeriesLabel series={book.series} />
        </h2>
        {book.authors.length > 0 && <p className="line-clamp-1 text-xs text-fg-muted">{book.authors.join(', ')}</p>}
      </div>
    </Link>
  );
}
