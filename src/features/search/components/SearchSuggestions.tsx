import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BookCover } from '@/features/books';
import type { CatalogBook } from '@/features/catalog';
import { SeriesLabel } from './SeriesLabel';

export interface SearchSuggestionsProps {
  id: string;
  query: string;
  books: readonly CatalogBook[];
  isPending: boolean;
  isError: boolean;
  isStale: boolean;
  /** Highlighted option: a book index, or `books.length` for "See all results". */
  activeIndex: number;
  optionId: (index: number) => string;
  onSelectBook: (book: CatalogBook) => void;
  onSeeAll: () => void;
  onHover: (index: number) => void;
}

/** Keeps focus in the search field while an option is clicked, so the dropdown doesn't close first. */
const keepInputFocus = (event: MouseEvent) => event.preventDefault();

/** Dropdown under the search bar: up to five books with cover and author, then "See all results". */
export function SearchSuggestions({
  id,
  query,
  books,
  isPending,
  isError,
  isStale,
  activeIndex,
  optionId,
  onSelectBook,
  onSeeAll,
  onHover,
}: SearchSuggestionsProps) {
  const { t } = useTranslation();
  const seeAllIndex = books.length;
  const optionClass = (index: number) =>
    `flex cursor-pointer items-center gap-3 px-3 py-2 ${index === activeIndex ? 'bg-surface-muted' : ''}`;

  return (
    <div
      onMouseDown={keepInputFocus}
      className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
    >
      {isPending && (
        <p role="status" className="px-3 py-3 text-sm text-fg-muted">
          {t('search.searching')}
        </p>
      )}
      {isError && !isPending && (
        <p role="alert" className="px-3 py-3 text-sm text-fg-muted">
          {t('search.error')}
        </p>
      )}
      {!isPending && !isError && books.length === 0 && !isStale && (
        <p className="px-3 py-3 text-sm text-fg-muted">{t('search.noResults')}</p>
      )}

      <ul
        id={id}
        role="listbox"
        aria-label={t('search.suggestions')}
        aria-busy={isStale}
        className={`max-h-[70vh] overflow-y-auto ${isStale ? 'opacity-50 transition-opacity' : ''}`}
      >
        {books.map((book, index) => (
          <li
            key={book.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            onClick={() => onSelectBook(book)}
            onMouseEnter={() => onHover(index)}
            className={`${optionClass(index)} border-b border-border`}
          >
            <BookCover src={book.coverUrl} title={book.title} className="w-10 shrink-0" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-2 text-sm font-bold text-fg">
                {book.title}
                <SeriesLabel series={book.series} />
              </span>
              {book.authors.length > 0 && (
                <span className="line-clamp-1 text-sm text-fg-muted">
                  {t('books.by', { authors: book.authors.join(', ') })}
                </span>
              )}
            </div>
          </li>
        ))}
        <li
          id={optionId(seeAllIndex)}
          role="option"
          aria-selected={seeAllIndex === activeIndex}
          onClick={onSeeAll}
          onMouseEnter={() => onHover(seeAllIndex)}
          className={`${optionClass(seeAllIndex)} min-h-11 justify-center text-sm text-accent`}
        >
          {t('search.seeAll', { query })}
        </li>
      </ul>
    </div>
  );
}
