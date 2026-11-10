import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  buildBookPath,
  groupBySeries,
  LibraryBookCover,
  libraryVolumeState,
  progressPercent,
  SeriesDot,
  StarRating,
  type LibraryBook,
} from '@/features/books/lazy';

const GRID =
  'flex flex-col divide-y divide-border lg:grid lg:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] lg:gap-x-6 lg:gap-y-8 lg:divide-y-0';

/**
 * Books on a shelf: a list with details on phones, a cover grid on desktop (lg).
 * Books of the same series form one ordered, collapsible group with a dot timeline.
 * Each book shows its rating, or its progress while being read.
 */
export function ShelfBookList({ books }: { books: readonly LibraryBook[] }) {
  return (
    <ul className={GRID}>
      {groupBySeries(books).map((entry) =>
        entry.kind === 'book' ? (
          <li key={entry.book.id}>
            <ShelfBook book={entry.book} />
          </li>
        ) : (
          <li key={`series:${entry.key}`} className="lg:col-span-full">
            <SeriesGroup name={entry.name} books={entry.books} />
          </li>
        ),
      )}
    </ul>
  );
}

function SeriesGroup({ name, books }: { name: string; books: readonly LibraryBook[] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const listId = useId();

  return (
    <section aria-label={name} className="py-3 lg:py-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg text-left text-fg hover:text-accent"
      >
        <span aria-hidden="true" className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-serif text-base font-bold">{name}</span>{' '}
          <span className="text-xs text-fg-muted">{t('shelves.seriesCount', { count: books.length })}</span>
        </span>
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {books.map((book) => (
            <SeriesDot key={book.id} state={libraryVolumeState(book)} />
          ))}
        </span>
      </button>
      {expanded && (
        <ol id={listId} className={`${GRID} mt-2 border-l-2 border-border pl-4 lg:mt-4`}>
          {books.map((book) => (
            <li key={book.id}>
              <ShelfBook book={book} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ShelfBook({ book }: { book: LibraryBook }) {
  const { t, i18n } = useTranslation();
  const percent = book.status === 'reading' ? progressPercent(book.progress, book.pageCount) : null;
  const volume = book.series?.volume ?? null;

  return (
    <Link to={buildBookPath(book.id)} className="group flex gap-4 py-3 text-fg hover:text-fg lg:flex-col lg:gap-2 lg:py-0">
      <LibraryBookCover book={book} className="w-14 shrink-0 lg:w-full" />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-[15px] font-bold group-hover:text-accent lg:text-sm">{book.title}</h3>
        {book.authors.length > 0 && <p className="line-clamp-1 text-sm text-fg-muted lg:text-xs">{book.authors.join(', ')}</p>}
        {volume !== null && (
          <p className="text-xs text-fg-muted">
            {t('shelves.seriesVolume', { volume: new Intl.NumberFormat(i18n.resolvedLanguage).format(volume) })}
          </p>
        )}
        {book.rating !== null && <StarRating rating={book.rating} />}
        {percent !== null && <p className="text-xs text-fg-muted">{t('shelves.progress', { value: percent })}</p>}
      </div>
    </Link>
  );
}
