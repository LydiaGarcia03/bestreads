import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookCover, buildBookPath } from '@/features/books';
import type { BookSearchResult } from '../types';

/** Mobile: list with small covers. Desktop (lg): cover grid. */
export function SearchResultList({ results }: { results: readonly BookSearchResult[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8 lg:divide-y-0 xl:grid-cols-5">
      {results.map((book) => (
        <li key={book.id}>
          <SearchResultItem book={book} />
        </li>
      ))}
    </ul>
  );
}

function SearchResultItem({ book }: { book: BookSearchResult }) {
  const { t } = useTranslation();
  const details = [
    book.publishedYear?.toString(),
    book.pageCount ? t('search.pageCount', { count: book.pageCount }) : undefined,
  ].filter(Boolean);

  return (
    <Link
      to={buildBookPath(book.id)}
      className="group flex gap-4 py-3 text-fg hover:text-fg lg:flex-col lg:gap-3 lg:py-0"
    >
      <BookCover src={book.coverUrl} title={book.title} className="w-16 shrink-0 lg:w-full" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="line-clamp-2 text-base font-bold group-hover:text-accent lg:text-sm">{book.title}</h2>
        {book.authors.length > 0 && (
          <p className="line-clamp-1 text-sm text-fg-muted">{book.authors.join(', ')}</p>
        )}
        {details.length > 0 && <p className="text-xs text-fg-muted">{details.join(' · ')}</p>}
      </div>
    </Link>
  );
}
