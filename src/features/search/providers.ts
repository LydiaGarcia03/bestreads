import { defaultFetch, fetchJson, type FetchFn } from './fetchJson';
import { GOOGLE_BOOKS_FIELDS, mapGoogleBooksResponse } from './googleBooksMapper';
import { mapOpenLibraryResponse, OPEN_LIBRARY_FIELDS } from './openLibraryMapper';
import { fillMissingCovers, uniqueById } from './searchResults';
import type { BookSearchProvider } from './types';

export const MAX_SEARCH_RESULTS = 20;

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';

export interface GoogleBooksOptions {
  /** Optional browser key (restricted by HTTP referrer). Without it, Google applies a shared anonymous quota. */
  apiKey?: string;
  fetchFn?: FetchFn;
}

export function createGoogleBooksProvider({
  apiKey,
  fetchFn = defaultFetch,
}: GoogleBooksOptions = {}): BookSearchProvider {
  return {
    async search(query, signal) {
      const params = new URLSearchParams({
        q: query,
        maxResults: String(MAX_SEARCH_RESULTS),
        printType: 'books',
        fields: GOOGLE_BOOKS_FIELDS,
      });
      if (apiKey) params.set('key', apiKey);
      return mapGoogleBooksResponse(await fetchJson(fetchFn, `${GOOGLE_BOOKS_URL}?${params.toString()}`, signal));
    },
  };
}

export function createOpenLibraryProvider({ fetchFn = defaultFetch }: { fetchFn?: FetchFn } = {}): BookSearchProvider {
  return {
    async search(query, signal) {
      const params = new URLSearchParams({
        q: query,
        limit: String(MAX_SEARCH_RESULTS),
        fields: OPEN_LIBRARY_FIELDS,
      });
      return mapOpenLibraryResponse(
        await fetchJson(fetchFn, `${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`, signal),
      );
    },
  };
}

/** Uses `primary`, and `fallback` when the primary fails (quota, outage) or finds nothing. */
export function createFallbackProvider(primary: BookSearchProvider, fallback: BookSearchProvider): BookSearchProvider {
  return {
    async search(query, signal) {
      try {
        const results = await primary.search(query, signal);
        if (results.length > 0) return results;
      } catch (error) {
        if (signal?.aborted) throw error;
        // Expected when Google's quota runs out; the fallback answers instead.
        console.warn('Primary book search failed, using the fallback', error);
      }
      return fallback.search(query, signal);
    },
  };
}

/** Removes duplicates and fills missing covers from Open Library by ISBN. */
export function withResultCleanup(provider: BookSearchProvider): BookSearchProvider {
  return {
    async search(query, signal) {
      return fillMissingCovers(uniqueById(await provider.search(query, signal)));
    },
  };
}

/** Production search: Google Books first, Open Library as fallback. */
export function createBookSearchProvider(options: GoogleBooksOptions = {}): BookSearchProvider {
  return withResultCleanup(
    createFallbackProvider(createGoogleBooksProvider(options), createOpenLibraryProvider(options)),
  );
}
