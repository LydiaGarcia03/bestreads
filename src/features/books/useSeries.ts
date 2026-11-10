import { useQuery } from '@tanstack/react-query';
import { useCatalog } from '@/features/catalog';
import { useLoadLibraryRepository } from './libraryContextValue';
import { distinctSeriesNames, seriesKey } from './series';
import { libraryQueryKeys, requireUid, useUid } from './useLibrary';

/** Series change only through this app, which refreshes these queries. */
const SERIES_STALE_TIME_MS = 5 * 60 * 1000;
/** Published volumes of a series rarely change; a day of caching saves API calls. */
const CATALOG_SERIES_STALE_TIME_MS = 24 * 60 * 60 * 1000;

/** The volumes the public catalogs know for the series `name` (none requested when `null`). */
export function useCatalogSeries(name: string | null) {
  const catalog = useCatalog();

  return useQuery({
    queryKey: ['catalogSeries', name ? seriesKey(name) : ''],
    // `enabled` guarantees a name here.
    queryFn: ({ signal }) => catalog.seriesBooks(name as string, signal),
    enabled: name !== null,
    staleTime: CATALOG_SERIES_STALE_TIME_MS,
  });
}

/** Series names already used in the library, for suggestions. Only requested when `enabled` (editing). */
export function useSeriesNames({ enabled }: { enabled: boolean }) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.seriesNames(uid ?? ''),
    queryFn: async () => distinctSeriesNames(await (await loadRepository()).listSeriesNames(requireUid(uid))),
    enabled: enabled && uid !== null,
    staleTime: SERIES_STALE_TIME_MS,
  });
}

/** The owner's books in the series `name` (none requested when `name` is `null`). */
export function useSeriesBooks(name: string | null) {
  const uid = useUid();
  const loadRepository = useLoadLibraryRepository();

  return useQuery({
    queryKey: libraryQueryKeys.series(uid ?? '', name ? seriesKey(name) : ''),
    // `enabled` guarantees a name here.
    queryFn: async () => (await loadRepository()).listSeriesBooks(requireUid(uid), name as string),
    enabled: uid !== null && name !== null,
    staleTime: SERIES_STALE_TIME_MS,
  });
}
