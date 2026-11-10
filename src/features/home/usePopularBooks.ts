import { useQuery } from '@tanstack/react-query';
import { useCatalog } from '@/features/catalog';
import { isRecommendable } from './recommendationRules';

/** Books shown in "Popular books". */
export const POPULAR_LIMIT = 12;
/** Extra books requested, so the list stays full after `isRecommendable` removes some. */
const POPULAR_SPARE = 8;
/** The list is yearly, so one fetch a day is plenty. */
const POPULAR_STALE_TIME_MS = 24 * 60 * 60 * 1000;

/** Books many people are reading now (see `CatalogProvider.popular`), without excluded authors. */
export function usePopularBooks() {
  const catalog = useCatalog();
  const requested = POPULAR_LIMIT + POPULAR_SPARE;

  return useQuery({
    queryKey: ['popularBooks', requested],
    queryFn: ({ signal }) => catalog.popular(requested, signal),
    select: (books) => books.filter(isRecommendable).slice(0, POPULAR_LIMIT),
    staleTime: POPULAR_STALE_TIME_MS,
  });
}
