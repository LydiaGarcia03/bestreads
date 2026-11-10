/** Search URL rules: pure, no React or I/O. */

export const SEARCH_PATH = '/search';
export const SEARCH_QUERY_PARAM = 'q';
/** Typing pause before results appear or update (keeps API calls low while typing). */
export const SEARCH_DEBOUNCE_MS = 1000;
/** Typing this many characters opens the results without pressing Enter. */
export const AUTO_SEARCH_MIN_LENGTH = 4;

/** Whether the typed text is long enough to search on its own. */
export function shouldAutoSearch(raw: string): boolean {
  return normalizeQuery(raw).length >= AUTO_SEARCH_MIN_LENGTH;
}

/** Collapses whitespace; returns an empty string for blank input. */
export function normalizeQuery(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ');
}

/** Path for the search screen, or `null` when the query is blank. */
export function buildSearchPath(raw: string): string | null {
  const query = normalizeQuery(raw);
  if (!query) return null;
  const params = new URLSearchParams({ [SEARCH_QUERY_PARAM]: query });
  return `${SEARCH_PATH}?${params.toString()}`;
}
