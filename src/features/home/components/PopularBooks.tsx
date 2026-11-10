import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookCover, buildBookPath } from '@/features/books/lazy';
import { Button } from '@/shared/ui/Button';
import { usePopularBooks } from '../usePopularBooks';

/** "Popular books": what many readers are reading this year; a row of covers on phones, a grid on desktop. */
export function PopularBooks() {
  const { t } = useTranslation();
  const headingId = useId();
  const popular = usePopularBooks();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="font-serif text-sm font-bold tracking-wide text-fg-muted uppercase lg:text-lg lg:tracking-normal lg:text-fg lg:normal-case">
          {t('home.popular')}
        </h2>
        <p className="text-sm text-fg-muted">{t('home.popularHint')}</p>
      </div>

      {popular.isPending && (
        <p role="status" className="text-sm text-fg-muted">
          {t('home.popularLoading')}
        </p>
      )}
      {popular.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>{t('home.popularError')}</p>
          <Button variant="secondary" onClick={() => void popular.refetch()} className="h-9">
            {t('books.retry')}
          </Button>
        </div>
      )}

      {popular.isSuccess && (
        <ul className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] lg:gap-x-6 lg:gap-y-8 lg:overflow-visible lg:px-0 lg:pb-0">
          {popular.data.map((book) => (
            <li key={book.id} className="w-28 shrink-0 lg:w-auto">
              <Link to={buildBookPath(book.id)} className="group flex flex-col gap-1.5 text-fg hover:text-fg">
                <BookCover src={book.coverUrl} title={book.title} className="w-full" />
                <h3 className="line-clamp-2 text-sm font-bold group-hover:text-accent">{book.title}</h3>
                {book.authors.length > 0 && <p className="line-clamp-1 text-xs text-fg-muted">{book.authors.join(', ')}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
