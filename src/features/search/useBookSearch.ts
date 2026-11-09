import { useQuery } from '@tanstack/react-query';
import { useBookSearchProvider } from './bookSearchContextValue';
import { normalizeQuery } from './searchQuery';

/** Shorter queries return too much noise and waste API quota. */
export const MIN_QUERY_LENGTH = 2;
/** Book data rarely changes; repeated searches in a session come from the cache. */
const SEARCH_STALE_TIME_MS = 60 * 60 * 1000;

export function bookSearchQueryKey(query: string) {
  return ['bookSearch', normalizeQuery(query).toLowerCase()] as const;
}

export function isSearchableQuery(query: string): boolean {
  return normalizeQuery(query).length >= MIN_QUERY_LENGTH;
}

/** Searches books for `query` (cached; disabled for queries shorter than `MIN_QUERY_LENGTH`). */
export function useBookSearch(query: string) {
  const provider = useBookSearchProvider();
  const normalized = normalizeQuery(query);

  return useQuery({
    queryKey: bookSearchQueryKey(normalized),
    queryFn: ({ signal }) => provider.search(normalized, signal),
    enabled: isSearchableQuery(normalized),
    staleTime: SEARCH_STALE_TIME_MS,
  });
}
