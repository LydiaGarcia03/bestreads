import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buildBookPath, LibraryBookCover, StarRating, type LibraryBook } from '@/features/books/lazy';
import type { FinishedRead, YearReview } from '../yearReview';

/** The year's totals as stat tiles: books, pages, average rating. */
export function YearStats({ review }: { review: YearReview }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const decimal = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 });

  return (
    <dl className="grid grid-cols-3 gap-3">
      <Stat label={t('year.stats.books', { count: review.finished.length })} value={number.format(review.finished.length)} />
      <Stat label={t('year.stats.pages', { count: review.pages })} value={number.format(review.pages)} />
      <Stat
        label={t('year.stats.average')}
        value={review.averageRating === null ? '–' : decimal.format(review.averageRating)}
      />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-1 rounded-md border border-border bg-surface p-3 lg:p-4">
      <dt className="text-xs text-fg-muted lg:text-sm">{label}</dt>
      <dd className="font-serif text-2xl font-bold lg:text-3xl">{value}</dd>
    </div>
  );
}

/** Best-rated books, the longest one and the most-read author. */
export function YearHighlights({ review }: { review: YearReview }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5">
      {review.topRated.length > 0 && (
        <Highlight title={t('year.highlights.topRated')}>
          <ul className="grid grid-cols-3 gap-3 sm:max-w-md">
            {review.topRated.map((book) => (
              <li key={book.id}>
                <BookTile book={book}>{book.rating !== null && <StarRating rating={book.rating} size={12} />}</BookTile>
              </li>
            ))}
          </ul>
        </Highlight>
      )}
      {review.longest?.pageCount && (
        <Highlight title={t('year.highlights.longest')}>
          <p className="text-sm">
            <Link to={buildBookPath(review.longest.id)} className="font-bold">
              {review.longest.title}
            </Link>{' '}
            · {t('books.pageCount', { count: review.longest.pageCount })}
          </p>
        </Highlight>
      )}
      {review.topAuthor && (
        <Highlight title={t('year.highlights.topAuthor')}>
          <p className="text-sm">
            <span className="font-bold">{review.topAuthor.name}</span> ·{' '}
            {t('year.highlights.reads', { count: review.topAuthor.count })}
          </p>
        </Highlight>
      )}
    </div>
  );
}

function Highlight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-fg-muted">{title}</h3>
      {children}
    </div>
  );
}

function BookTile({ book, children }: { book: LibraryBook; children?: ReactNode }) {
  return (
    <Link to={buildBookPath(book.id)} className="group flex flex-col gap-1.5 text-fg hover:text-fg">
      <LibraryBookCover book={book} className="w-full" />
      <span className="line-clamp-2 text-xs font-bold group-hover:text-accent">{book.title}</span>
      {children}
    </Link>
  );
}

/** Every finished read of the year, newest first, as a cover grid with the finish date. */
export function FinishedBooks({ finished }: { finished: readonly FinishedRead[] }) {
  const { t, i18n } = useTranslation();
  const format = new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short' });

  return (
    <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] lg:gap-x-5">
      {[...finished].reverse().map(({ book, finishedOn }) => {
        const [year = 0, month = 1, day = 1] = finishedOn.split('-').map(Number);
        return (
          <li key={`${book.id}/${finishedOn}`}>
            <BookTile book={book}>
              <span className="text-xs text-fg-muted">
                {t('year.finishedOn', { date: format.format(new Date(year, month - 1, day)) })}
              </span>
            </BookTile>
          </li>
        );
      })}
    </ul>
  );
}
