import { matchTier, mergeResultLists, rankResults } from './catalogRanking';
import { fillMissingCovers, uniqueById } from './catalogResults';
import { defaultFetch, fetchJson, fetchJsonOrNull, type FetchFn } from './fetchJson';
import {
  GOOGLE_BOOKS_FIELDS,
  GOOGLE_VOLUME_FIELDS,
  googleItemCount,
  mapGoogleBooksResponse,
  mapGoogleVolume,
} from './googleBooksMapper';
import {
  mapOpenLibraryDescription,
  mapOpenLibraryResponse,
  mapOpenLibraryTrending,
  OPEN_LIBRARY_FIELDS,
  openLibraryDocCount,
  openLibraryQuery,
  openLibraryWorkId,
  workKeyFromEdition,
} from './openLibraryMapper';
import type { CatalogBook, CatalogProvider, CatalogSearchResult } from './types';

/** Small pages answer faster; more are loaded on demand. */
export const SEARCH_PAGE_SIZE = 12;
/**
 * Once the answers so far hold enough good matches (`MIN_GOOD_MATCHES`), the other APIs may answer
 * until this long after the search started; later results are dropped. Measured: Open Library
 * ~0.25–0.5 s, Google ~0.5–1.5 s (Google has the Portuguese and new books, so it gets its usual time).
 */
export const SEARCH_TIME_BUDGET_MS = 1500;
/** Without enough good matches yet, the other APIs are worth waiting for, up to this long. */
export const SEARCH_MAX_WAIT_MS = 4000;
/** Good matches (see `matchTier`) that make the answers so far worth showing without the slower APIs. */
export const MIN_GOOD_MATCHES = 3;

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_URL = 'https://openlibrary.org';
const OPEN_LIBRARY_SEARCH_URL = `${OPEN_LIBRARY_URL}/search.json`;
/** Most read over the last year: steadier than the daily or weekly lists. */
const OPEN_LIBRARY_TRENDING_URL = `${OPEN_LIBRARY_URL}/trending/yearly.json`;
const NO_RESULTS: CatalogSearchResult = { books: [], hasMore: false };

export interface GoogleBooksOptions {
  /** Optional browser key (restricted by HTTP referrer). Without it, Google applies a shared anonymous quota. */
  apiKey?: string;
  fetchFn?: FetchFn;
}

export function createGoogleBooksProvider({ apiKey, fetchFn = defaultFetch }: GoogleBooksOptions = {}): CatalogProvider {
  const withKey = (params: URLSearchParams) => {
    if (apiKey) params.set('key', apiKey);
    return params.toString();
  };

  return {
    async search(query, { page, pageSize }, signal) {
      const params = new URLSearchParams({
        q: query,
        startIndex: String(page * pageSize),
        maxResults: String(pageSize),
        printType: 'books',
        fields: GOOGLE_BOOKS_FIELDS,
      });
      const response = await fetchJson(fetchFn, `${GOOGLE_BOOKS_URL}?${withKey(params)}`, signal);
      return { books: mapGoogleBooksResponse(response), hasMore: googleItemCount(response) === pageSize };
    },

    async getBook(bookId, signal) {
      if (openLibraryWorkId(bookId)) return null;
      const params = new URLSearchParams({ fields: GOOGLE_VOLUME_FIELDS });
      const url = `${GOOGLE_BOOKS_URL}/${encodeURIComponent(bookId)}?${withKey(params)}`;
      return mapGoogleVolume(await fetchJsonOrNull(fetchFn, url, signal));
    },

    // Google Books has no popularity list.
    popular: async () => [],
  };
}

export function createOpenLibraryProvider({ fetchFn = defaultFetch }: { fetchFn?: FetchFn } = {}): CatalogProvider {
  const searchDocs = async (query: string, page: number, pageSize: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      q: query,
      // Open Library pages are 1-based.
      page: String(page + 1),
      limit: String(pageSize),
      fields: OPEN_LIBRARY_FIELDS,
    });
    return fetchJson(fetchFn, `${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`, signal);
  };

  return {
    async search(query, { page, pageSize }, signal) {
      const prefixQuery = openLibraryQuery(query);
      if (!prefixQuery) return NO_RESULTS;
      const response = await searchDocs(prefixQuery, page, pageSize, signal);
      return { books: mapOpenLibraryResponse(response), hasMore: openLibraryDocCount(response) === pageSize };
    },

    async getBook(bookId, signal) {
      const workId = openLibraryWorkId(bookId);
      if (!workId) return null;
      // The search API has authors, cover and pages; the work itself has the description.
      const [response, work] = await Promise.all([
        searchDocs(`key:/works/${workId}`, 0, 1, signal),
        fetchJsonOrNull(fetchFn, `${OPEN_LIBRARY_URL}/works/${workId}.json`, signal),
      ]);
      const book = mapOpenLibraryResponse(response)[0];
      if (!book) return null;
      return { ...book, description: mapOpenLibraryDescription(work) };
    },

    async popular(limit, signal) {
      const params = new URLSearchParams({ limit: String(limit) });
      const response = await fetchJson(fetchFn, `${OPEN_LIBRARY_TRENDING_URL}?${params.toString()}`, signal);
      return mapOpenLibraryTrending(response);
    },
  };
}

/** Open Library description for an ISBN (edition → work), or `null` when there is none. */
export async function fetchOpenLibraryDescriptionByIsbn(
  isbn: string,
  { fetchFn = defaultFetch, signal }: { fetchFn?: FetchFn; signal?: AbortSignal } = {},
): Promise<string | null> {
  const edition = await fetchJsonOrNull(fetchFn, `${OPEN_LIBRARY_URL}/isbn/${isbn}.json`, signal);
  const workKey = workKeyFromEdition(edition);
  if (!workKey) return null;
  return mapOpenLibraryDescription(await fetchJsonOrNull(fetchFn, `${OPEN_LIBRARY_URL}${workKey}.json`, signal));
}

type Outcome = { ok: true; result: CatalogSearchResult } | { ok: false; error: unknown };

interface Deadlines {
  /** Applies once the results so far are `isEnough`. */
  budgetMs: number;
  /** Applies otherwise. */
  maxWaitMs: number;
  isEnough: (results: CatalogSearchResult[]) => boolean;
}

const successes = (outcomes: readonly (Outcome | undefined)[]) =>
  outcomes.flatMap((outcome) => (outcome?.ok ? [outcome.result] : []));

/**
 * Runs every search at once. Resolves when all have settled or, once one has succeeded, at a deadline
 * counted from the start (see `Deadlines`); searches still running then are aborted and left out (`undefined`).
 */
async function searchAll(
  providers: readonly CatalogProvider[],
  run: (provider: CatalogProvider, signal: AbortSignal) => Promise<CatalogSearchResult>,
  { budgetMs, maxWaitMs, isEnough }: Deadlines,
  signal?: AbortSignal,
): Promise<(Outcome | undefined)[]> {
  const startedAt = Date.now();
  const controllers = providers.map(() => new AbortController());
  const abortAll = () => controllers.forEach((controller) => controller.abort(signal?.reason));
  signal?.addEventListener('abort', abortAll, { once: true });

  const outcomes: (Outcome | undefined)[] = providers.map(() => undefined);
  let onFirstSuccess = () => {};
  const firstSuccess = new Promise<void>((resolve) => (onFirstSuccess = resolve));
  const settled = Promise.all(
    providers.map((provider, index) =>
      run(provider, (controllers[index] as AbortController).signal).then(
        (result) => {
          outcomes[index] = { ok: true, result };
          onFirstSuccess();
        },
        (error: unknown) => {
          outcomes[index] = { ok: false, error };
        },
      ),
    ),
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([settled, firstSuccess]);
    const deadlineMs = isEnough(successes(outcomes)) ? budgetMs : maxWaitMs;
    const remainingMs = Math.max(0, startedAt + deadlineMs - Date.now());
    await Promise.race([settled, new Promise((resolve) => (timer = setTimeout(resolve, remainingMs)))]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortAll);
  }
  outcomes.forEach((outcome, index) => {
    if (!outcome) controllers[index]?.abort();
  });
  return [...outcomes];
}

/**
 * Searches every provider at once and returns one list: copies of the same work merged,
 * then ranked by match quality and popularity (`rankResults`). Fails only when every provider fails.
 * Looks books up in the first provider that knows the id (each returns `null` for the others' ids).
 * Put the provider with the richest data first: it wins when the same work comes from several.
 */
export function createMergedProvider(
  providers: readonly CatalogProvider[],
  { budgetMs = SEARCH_TIME_BUDGET_MS, maxWaitMs = SEARCH_MAX_WAIT_MS }: Partial<Omit<Deadlines, 'isEnough'>> = {},
): CatalogProvider {
  return {
    async search(query, options, signal) {
      const run = (provider: CatalogProvider, child: AbortSignal) => provider.search(query, options, child);
      const isEnough = (results: CatalogSearchResult[]) =>
        results.flatMap((result) => result.books).filter((book) => matchTier(book, query) > 0).length >=
        MIN_GOOD_MATCHES;
      const outcomes = await searchAll(providers, run, { budgetMs, maxWaitMs, isEnough }, signal);
      signal?.throwIfAborted();

      const results = successes(outcomes);
      const failures = outcomes.flatMap((outcome) => (outcome && !outcome.ok ? [outcome.error] : []));
      if (results.length === 0) throw failures[0] ?? new Error('No book search answered');
      // Expected when Google's quota runs out; the other API still answers.
      if (failures.length > 0) console.warn('A book search failed; showing the others', failures);

      return {
        books: rankResults(mergeResultLists(results.map((result) => result.books)), query),
        hasMore: results.some((result) => result.hasMore),
      };
    },

    async getBook(bookId, signal) {
      for (const provider of providers) {
        const book = await provider.getBook(bookId, signal);
        if (book) return book;
      }
      return null;
    },

    async popular(limit, signal) {
      const lists = await Promise.all(providers.map((provider) => provider.popular(limit, signal)));
      return mergeResultLists(lists).slice(0, limit);
    },
  };
}

type DescriptionLookup = (isbn: string, signal?: AbortSignal) => Promise<string | null>;

/** Removes duplicates, fills missing covers from Open Library by ISBN and missing descriptions via `describe`. */
export function withResultCleanup(provider: CatalogProvider, describe?: DescriptionLookup): CatalogProvider {
  const addDescription = async (book: CatalogBook, signal?: AbortSignal): Promise<CatalogBook> => {
    if (book.description || !book.isbn || !describe) return book;
    try {
      return { ...book, description: await describe(book.isbn, signal) };
    } catch (error) {
      if (signal?.aborted) throw error;
      // The description is optional; the book page works without it.
      console.warn('Description fallback failed', error);
      return book;
    }
  };

  return {
    async search(query, options, signal) {
      const result = await provider.search(query, options, signal);
      return { ...result, books: fillMissingCovers(uniqueById(result.books)) };
    },

    async getBook(bookId, signal) {
      const book = await provider.getBook(bookId, signal);
      if (!book) return null;
      const [withCover] = fillMissingCovers([book]);
      return addDescription(withCover ?? book, signal);
    },

    async popular(limit, signal) {
      return fillMissingCovers(uniqueById(await provider.popular(limit, signal)));
    },
  };
}

/**
 * Production catalog: Google Books (whole words, strong in Portuguese and new books) and Open Library
 * (prefixes like "yester" → "Yesterday", reader counts) searched together and ranked as one list;
 * Open Library also fills missing covers and descriptions.
 */
export function createCatalogProvider(options: GoogleBooksOptions = {}): CatalogProvider {
  return withResultCleanup(
    createMergedProvider([createGoogleBooksProvider(options), createOpenLibraryProvider(options)]),
    (isbn, signal) => fetchOpenLibraryDescriptionByIsbn(isbn, { fetchFn: options.fetchFn, signal }),
  );
}
