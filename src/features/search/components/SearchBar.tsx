import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildBookPath } from '@/features/books';
import type { CatalogBook } from '@/features/catalog';
import { useHotkey } from '@/shared/hooks/useHotkey';
import { SearchIcon } from '@/shared/ui/icons';
import { buildSearchPath, normalizeQuery, SEARCH_QUERY_PARAM, shouldAutoSearch } from '../searchQuery';
import { useSearchSuggestions } from '../useSearchSuggestions';
import { SearchSuggestions } from './SearchSuggestions';

const FOCUS_SHORTCUT = '/';
const NO_OPTION = -1;

/**
 * Top bar search field. `/` focuses it; Enter opens the search screen.
 * After a typing pause, text of `AUTO_SEARCH_MIN_LENGTH`+ characters shows book suggestions in a dropdown
 * (arrow keys move through them, Escape closes it).
 */
export function SearchBar({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const urlQuery = normalizeQuery(searchParams.get(SEARCH_QUERY_PARAM));

  const [value, setValue] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  // Show the URL query when it changes from outside (back button, links), without touching what is being typed.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    if (normalizeQuery(value) !== urlQuery) setValue(urlQuery);
  }

  const suggestions = useSearchSuggestions(value);
  const [isOpen, setIsOpen] = useState(false);
  // The highlight belongs to one set of suggestions; a new query starts with nothing highlighted.
  const [active, setActive] = useState({ query: '', index: NO_OPTION });
  const activeIndex = active.query === suggestions.query ? active.index : NO_OPTION;
  const seeAllIndex = suggestions.books.length;

  const isExpanded = isOpen && suggestions.query !== '' && shouldAutoSearch(value);
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  useHotkey(FOCUS_SHORTCUT, (event) => {
    event.preventDefault();
    inputRef.current?.focus();
  });

  const close = () => {
    setIsOpen(false);
    setActive({ query: '', index: NO_OPTION });
  };

  const leaveField = (path: string) => {
    close();
    inputRef.current?.blur();
    navigate(path);
  };

  const openSearchScreen = (raw: string) => {
    const path = buildSearchPath(raw);
    if (!path) return;
    setValue(normalizeQuery(raw));
    leaveField(path);
  };

  const selectBook = (book: CatalogBook) => leaveField(buildBookPath(book.id));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const book = isExpanded ? suggestions.books[activeIndex] : undefined;
    if (book) selectBook(book);
    else openSearchScreen(isExpanded && activeIndex === seeAllIndex ? suggestions.query : value);
  };

  const moveHighlight = (step: number) => {
    const optionCount = seeAllIndex + 1;
    const next = activeIndex === NO_OPTION && step < 0 ? optionCount - 1 : (activeIndex + step + optionCount) % optionCount;
    setActive({ query: suggestions.query, index: next });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && isExpanded) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!isExpanded) {
      setIsOpen(true);
      return;
    }
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label className="flex h-11 items-center gap-2.5 rounded-md border border-border bg-surface px-3 focus-within:border-accent lg:bg-bg">
        <SearchIcon className="shrink-0 text-fg-muted" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? listboxId : undefined}
          aria-activedescendant={isExpanded && activeIndex !== NO_OPTION ? optionId(activeIndex) : undefined}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={close}
          onKeyDown={handleKeyDown}
          aria-label={t('search.label')}
          placeholder={t('search.placeholder')}
          enterKeyHint="search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
        />
        <kbd
          title={t('search.shortcutHint')}
          className="hidden rounded border border-border-strong px-1.5 font-sans text-xs text-fg-muted lg:inline"
        >
          {FOCUS_SHORTCUT}
        </kbd>
      </label>

      {isExpanded && (
        <SearchSuggestions
          id={listboxId}
          query={suggestions.query}
          books={suggestions.books}
          isPending={suggestions.isPending}
          isError={suggestions.isError}
          isStale={suggestions.isStale}
          activeIndex={activeIndex}
          optionId={optionId}
          onSelectBook={selectBook}
          onSeeAll={() => openSearchScreen(suggestions.query)}
          onHover={(index) => setActive({ query: suggestions.query, index })}
        />
      )}
    </form>
  );
}
