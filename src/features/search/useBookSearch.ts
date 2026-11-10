import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { numberSeriesByRelease, SEARCH_PAGE_SIZE, uniqueWorks, useCatalog } from '@/features/catalog';
import { normalizeQuery } from './searchQuery';

/** Shorter queries return too much noise and waste API quota. */
export const MIN_QUERY_LENGTH = 2;
/** Book data rarely changes; repeated searches in a session come from the cache. */
const SEARCH_STALE_TIME_MS = 60 * 60 * 1000;
const FIRST_PAGE = 0;

export function bookSearchQueryKey(query: string) {
  return ['bookSearch', normalizeQuery(query).toLowerCase()] as const;
}

export function isSearchableQuery(query: string): boolean {
  return normalizeQuery(query).length >= MIN_QUERY_LENGTH;
}

/**
 * Searches books for `query`, one page at a time (`fetchNextPage` loads more).
 * While a new query loads, the previous results stay on screen (`isPlaceholderData`).
 */
export function useBookSearch(query: string) {
  const catalog = useCatalog();
  const normalized = normalizeQuery(query);

  return useInfiniteQuery({
    queryKey: bookSearchQueryKey(normalized),
    queryFn: ({ pageParam, signal }) =>
      catalog.search(normalized, { page: pageParam, pageSize: SEARCH_PAGE_SIZE }, signal),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length : undefined),
    // Each page is ranked on its own; a work already shown on an earlier page is not repeated. Series
    // without positions are numbered by release over everything loaded, so later pages fit in.
    select: (data) => numberSeriesByRelease(uniqueWorks(data.pages.flatMap((page) => page.books))),
    enabled: isSearchableQuery(normalized),
    staleTime: SEARCH_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}
