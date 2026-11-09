import { QueryClient } from '@tanstack/react-query';

/** Default freshness for server data; queries override it when their data changes slower or faster. */
const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

export function createQueryClient({ retry = 1 }: { retry?: number | false } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        retry,
        refetchOnWindowFocus: false,
      },
    },
  });
}
