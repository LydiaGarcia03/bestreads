import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  LibraryBookCover,
  buildBookPath,
  buildShelfPath,
  ProgressForm,
  progressPercent,
  useShelfBooks,
  useUpdateBook,
  type LibraryBook,
  type ShelfFilter,
} from '@/features/books/lazy';
import { Button } from '@/shared/ui/Button';

const READING: ShelfFilter = { kind: 'status', status: 'reading' };
/** Cards shown on Home; the rest are one tap away on the shelf. */
const MAX_CARDS = 3;

/** "Currently reading": a card per book being read, with progress and "Update progress". */
export function CurrentlyReading() {
  const { t } = useTranslation();
  const headingId = useId();
  const books = useShelfBooks(READING);
  const reading = books.data ?? [];

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="font-serif text-sm font-bold tracking-wide text-fg-muted uppercase">
        {t('home.currentlyReading')}
      </h2>

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
      {books.isSuccess && reading.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong p-4 text-sm text-fg-muted">
          <p>{t('home.notReading')}</p>
        </div>
      )}

      {reading.slice(0, MAX_CARDS).map((book) => (
        <ReadingCard key={book.id} book={book} />
      ))}

      {reading.length > MAX_CARDS && (
        <Link to={buildShelfPath(READING)} className="w-fit text-sm font-bold">
          {t('home.seeAllReading', { count: reading.length })}
        </Link>
      )}
    </section>
  );
}

function ReadingCard({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const titleId = useId();
  const updateBook = useUpdateBook();
  const [isEditing, setIsEditing] = useState(false);
  const percent = progressPercent(book.progress, book.pageCount);
  const bookPath = buildBookPath(book.id);

  const progressText = (() => {
    if (!book.progress) return t('progress.notStarted');
    if (book.progress.unit === 'pages' && book.pageCount) {
      return t('home.pageOf', { page: book.progress.value, total: book.pageCount, percent });
    }
    return t('progress.percent', { value: percent ?? book.progress.value });
  })();

  return (
    <article
      aria-labelledby={titleId}
      className="flex gap-4 rounded-md border border-border bg-surface p-3.5 lg:gap-5 lg:p-5"
    >
      <Link to={bookPath} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <LibraryBookCover book={book} className="w-[68px] lg:w-[100px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 id={titleId} className="line-clamp-2 text-base font-bold lg:text-[22px] lg:leading-tight">
          <Link to={bookPath} className="text-fg hover:text-accent">
            {book.title}
          </Link>
        </h3>
        {book.authors.length > 0 && (
          <p className="line-clamp-1 text-[13px] text-fg-muted lg:text-sm">
            {t('books.by', { authors: book.authors.join(', ') })}
          </p>
        )}

        {isEditing ? (
          <div className="mt-1">
            <ProgressForm
              book={book}
              onCancel={() => setIsEditing(false)}
              onSave={(progress) => {
                updateBook.mutate({ bookId: book.id, patch: { progress } });
                setIsEditing(false);
              }}
            />
          </div>
        ) : (
          <>
            <div
              role="progressbar"
              aria-label={t('progress.title')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ?? 0}
              className="mt-1 h-2 overflow-hidden rounded-full bg-border"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${percent ?? 0}%` }} />
            </div>
            <p className="text-xs text-fg-muted lg:text-[13px]">{progressText}</p>
            <div className="mt-1 flex flex-wrap gap-2.5">
              <Button variant="secondary" onClick={() => setIsEditing(true)} className="h-9 lg:h-10">
                {t('progress.update')}
              </Button>
              <Link
                to={bookPath}
                className="hidden h-10 items-center rounded-md border border-border-strong px-4 text-sm text-fg hover:border-accent hover:text-fg lg:inline-flex"
              >
                {t('home.openBook')}
              </Link>
            </div>
          </>
        )}

        {updateBook.isError && (
          <p role="alert" className="text-xs font-bold text-danger">
            {t('books.saveError')}
          </p>
        )}
      </div>
    </article>
  );
}
