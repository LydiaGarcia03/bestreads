import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useHotkey } from '@/shared/hooks/useHotkey';
import { SearchIcon } from '@/shared/ui/icons';
import {
  buildSearchPath,
  normalizeQuery,
  SEARCH_DEBOUNCE_MS,
  SEARCH_PATH,
  SEARCH_QUERY_PARAM,
} from '../searchQuery';

const FOCUS_SHORTCUT = '/';

/**
 * Top bar search field. `/` focuses it.
 * On the search screen, results follow the typing (debounced); elsewhere, Enter opens the search screen.
 */
export function SearchBar({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnSearchScreen = useMatch(SEARCH_PATH) !== null;
  const inputRef = useRef<HTMLInputElement>(null);
  const urlQuery = normalizeQuery(searchParams.get(SEARCH_QUERY_PARAM));

  const [value, setValue] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  // Show the URL query when it changes from outside (back button, links), without touching what is being typed.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    if (normalizeQuery(value) !== urlQuery) setValue(urlQuery);
  }

  const debouncedValue = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    const settled = normalizeQuery(debouncedValue);
    // Skip while still typing (e.g. right after Enter, the debounced value can lag behind).
    if (!isOnSearchScreen || settled !== normalizeQuery(value) || settled === urlQuery) return;
    const path = buildSearchPath(settled);
    if (path) navigate(path, { replace: true });
  }, [debouncedValue, value, isOnSearchScreen, urlQuery, navigate]);

  useHotkey(FOCUS_SHORTCUT, (event) => {
    event.preventDefault();
    inputRef.current?.focus();
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = buildSearchPath(value);
    if (!path) return;
    setValue(normalizeQuery(value));
    navigate(path);
  };

  return (
    <form role="search" onSubmit={handleSubmit} className={className}>
      <label className="flex h-11 items-center gap-2.5 rounded-md border border-border bg-surface px-3 focus-within:border-accent lg:bg-bg">
        <SearchIcon className="shrink-0 text-fg-muted" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
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
    </form>
  );
}
