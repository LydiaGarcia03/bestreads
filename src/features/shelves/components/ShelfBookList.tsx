import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookCover, buildBookPath, progressPercent, StarRating, type LibraryBook } from '@/features/books/lazy';

/**
 * Books on a shelf: a list with details on phones, a cover grid on desktop (lg).
 * Each book shows its rating, or its progress while being read.
 */
export function ShelfBookList({ books }: { books: readonly LibraryBook[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border lg:grid lg:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] lg:gap-x-6 lg:gap-y-8 lg:divide-y-0">
      {books.map((book) => (
        <li key={book.id}>
          <ShelfBook book={book} />
        </li>
      ))}
    </ul>
  );
}

function ShelfBook({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const percent = book.status === 'reading' ? progressPercent(book.progress, book.pageCount) : null;

  return (
    <Link to={buildBookPath(book.id)} className="group flex gap-4 py-3 text-fg hover:text-fg lg:flex-col lg:gap-2 lg:py-0">
      <BookCover src={book.coverUrl} title={book.title} className="w-14 shrink-0 lg:w-full" />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-[15px] font-bold group-hover:text-accent lg:text-sm">{book.title}</h3>
        {book.authors.length > 0 && <p className="line-clamp-1 text-sm text-fg-muted lg:text-xs">{book.authors.join(', ')}</p>}
        {book.rating !== null && <StarRating rating={book.rating} />}
        {percent !== null && (
          <p className="text-xs text-fg-muted">{t('shelves.progress', { value: percent })}</p>
        )}
      </div>
    </Link>
  );
}
