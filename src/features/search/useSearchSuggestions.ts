import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { normalizeQuery, SEARCH_DEBOUNCE_MS, shouldAutoSearch } from './searchQuery';
import { useBookSearch } from './useBookSearch';

/** Books shown in the search bar dropdown. */
export const SUGGESTION_LIMIT = 5;

/**
 * Suggestions for the text being typed: searched after a typing pause, once it has
 * `AUTO_SEARCH_MIN_LENGTH`+ characters. Shares the search screen's cache, so "See all results" opens instantly.
 */
export function useSearchSuggestions(text: string) {
  const settled = useDebouncedValue(normalizeQuery(text), SEARCH_DEBOUNCE_MS);
  const query = shouldAutoSearch(settled) ? settled : '';
  const search = useBookSearch(query);

  return {
    /** The query the suggestions belong to; empty while there is nothing to suggest. */
    query,
    books: (search.data ?? []).slice(0, SUGGESTION_LIMIT),
    isPending: search.isPending,
    isError: search.isError,
    /** Suggestions from the previous query, shown while the new ones load. */
    isStale: search.isPlaceholderData,
  };
}
