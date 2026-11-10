/** How search results are shown. Pure, no I/O. */

export const SEARCH_VIEWS = ['list', 'grid'] as const;
export type SearchView = (typeof SEARCH_VIEWS)[number];

/** The list shows more details per book, so it is the default. */
export const DEFAULT_SEARCH_VIEW: SearchView = 'list';

export function isSearchView(value: unknown): value is SearchView {
  return typeof value === 'string' && (SEARCH_VIEWS as readonly string[]).includes(value);
}
