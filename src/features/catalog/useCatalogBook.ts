import { useQuery } from '@tanstack/react-query';
import { useCatalog } from './catalogContextValue';

/** Book data from the APIs barely changes; a day of caching saves quota. */
const BOOK_STALE_TIME_MS = 24 * 60 * 60 * 1000;

export function catalogBookQueryKey(bookId: string) {
  return ['catalogBook', bookId] as const;
}

/** Book details from the public APIs (`data` is `null` when no API knows this `bookId`). */
export function useCatalogBook(bookId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const catalog = useCatalog();

  return useQuery({
    queryKey: catalogBookQueryKey(bookId),
    queryFn: ({ signal }) => catalog.getBook(bookId, signal),
    staleTime: BOOK_STALE_TIME_MS,
    enabled,
  });
}
