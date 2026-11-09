/** Search URL rules: pure, no React or I/O. */

export const SEARCH_PATH = '/search';
export const SEARCH_QUERY_PARAM = 'q';
/** Typing pause before search results update (keeps API calls low). */
export const SEARCH_DEBOUNCE_MS = 400;

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
