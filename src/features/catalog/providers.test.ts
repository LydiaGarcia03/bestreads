import { createTestBook, FakeCatalog } from '@/test/fakes';
import {
  createCatalogProvider,
  createGoogleBooksProvider,
  createMergedProvider,
  createOpenLibraryProvider,
  SEARCH_PAGE_SIZE,
  SEARCH_MAX_WAIT_MS,
  SEARCH_TIME_BUDGET_MS,
} from './providers';
import { CatalogError, type CatalogBook, type CatalogSearchOptions } from './types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function requestedUrl(fetchFn: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(fetchFn.mock.calls[call]?.[0]));
}

const FIRST_PAGE: CatalogSearchOptions = { page: 0, pageSize: SEARCH_PAGE_SIZE };
const GOOGLE_RESPONSE = {
  items: [{ id: 'g1', volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], ratingsCount: 12 } }],
};
const OPEN_LIBRARY_RESPONSE = {
  docs: [{ key: '/works/OL1W', title: 'Dune', isbn: ['9780441013593'], readinglog_count: 900, ratings_count: 100 }],
};

describe('createGoogleBooksProvider', () => {
  it('queries a page of the volumes API with a field mask and maps the results', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(GOOGLE_RESPONSE));
    const result = await createGoogleBooksProvider({ fetchFn }).search('dune', { page: 2, pageSize: 12 });

    const url = requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/books/v1/volumes');
    expect(url.searchParams.get('q')).toBe('dune');
    expect(url.searchParams.get('startIndex')).toBe('24');
    expect(url.searchParams.get('maxResults')).toBe('12');
    expect(url.searchParams.get('fields')).toContain('ratingsCount');
    expect(url.searchParams.has('key')).toBe(false);
    expect(result.hasMore).toBe(false);
    expect(result.books).toMatchObject([{ id: 'g1', popularity: 12 }]);
  });

  it('reports more pages when the page is full', async () => {
    const items = Array.from({ length: 2 }, (_, index) => ({ id: `g${index}`, volumeInfo: { title: 'T' } }));
    const fetchFn = vi.fn(async () => jsonResponse({ items }));
    const result = await createGoogleBooksProvider({ fetchFn }).search('dune', { page: 0, pageSize: 2 });
    expect(result.hasMore).toBe(true);
  });

  it('sends the API key when configured', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(GOOGLE_RESPONSE));
    await createGoogleBooksProvider({ apiKey: 'browser-key', fetchFn }).search('dune', FIRST_PAGE);
    expect(requestedUrl(fetchFn).searchParams.get('key')).toBe('browser-key');
  });

  it('passes the abort signal to fetch', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(GOOGLE_RESPONSE));
    const controller = new AbortController();
    await createGoogleBooksProvider({ fetchFn }).search('dune', FIRST_PAGE, controller.signal);
    expect(fetchFn).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal });
  });

  it('turns HTTP and network errors into CatalogError', async () => {
    const quota = vi.fn(async () => jsonResponse({ error: 'quota' }, 429));
    await expect(createGoogleBooksProvider({ fetchFn: quota }).search('dune', FIRST_PAGE)).rejects.toBeInstanceOf(
      CatalogError,
    );

    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createGoogleBooksProvider({ fetchFn: offline }).search('dune', FIRST_PAGE)).rejects.toBeInstanceOf(
      CatalogError,
    );
  });

  it('rethrows aborts unchanged', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const fetchFn = vi.fn(async () => {
      throw abort;
    });
    await expect(createGoogleBooksProvider({ fetchFn }).search('dune', FIRST_PAGE)).rejects.toBe(abort);
  });
});

describe('createOpenLibraryProvider', () => {
  it('queries a 1-based page of the search API with a prefix query and maps the results', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(OPEN_LIBRARY_RESPONSE));
    const result = await createOpenLibraryProvider({ fetchFn }).search('Dune', { page: 1, pageSize: 12 });

    const url = requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe('https://openlibrary.org/search.json');
    expect(url.searchParams.get('q')).toBe('(Dune) OR (dune*) OR series_name:(dune*)');
    expect(url.searchParams.get('fields')).toContain('series_name');
    expect(url.searchParams.get('page')).toBe('2');
    // Three candidates per result shown, for ranking to choose from.
    expect(url.searchParams.get('limit')).toBe('36');
    expect(url.searchParams.get('fields')).toContain('readinglog_count');
    expect(result.hasMore).toBe(false);
    expect(result.books).toMatchObject([{ id: 'ol-OL1W', popularity: 1000 }]);
  });

  it('does not call the API for text with nothing searchable', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(OPEN_LIBRARY_RESPONSE));
    expect(await createOpenLibraryProvider({ fetchFn }).search('"?"', FIRST_PAGE)).toEqual({ books: [], hasMore: false });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('createMergedProvider', () => {
  const google = (books = [createTestBook({ id: 'g-yester', title: 'The Yester Deep', authors: ['Henry Stephens'] })]) =>
    new FakeCatalog(books);
  const openLibrary = (
    books = [createTestBook({ id: 'ol-OL2W', title: 'Yesterday', authors: ['Ann Author'], popularity: 500, source: 'openLibrary' })],
  ) => new FakeCatalog(books);

  it('searches every provider at once and ranks the merged results', async () => {
    const first = google();
    const second = openLibrary();

    const result = await createMergedProvider([first, second]).search('yester', FIRST_PAGE);

    expect(first.search).toHaveBeenCalledWith('yester', FIRST_PAGE, expect.any(AbortSignal));
    expect(second.search).toHaveBeenCalledWith('yester', FIRST_PAGE, expect.any(AbortSignal));
    // Both titles start with "yester"; the popular one comes first.
    expect(result.books.map((book) => book.id)).toEqual(['ol-OL2W', 'g-yester']);
  });

  it('merges copies of the same work, led by the more read copy', async () => {
    const result = await createMergedProvider([
      google([createTestBook({ id: 'g1', title: 'Dune', authors: ['Frank Herbert'], coverUrl: null })]),
      openLibrary([
        createTestBook({ id: 'ol-OL1W', title: 'Dune', authors: ['Frank Herbert'], coverUrl: 'ol.jpg', popularity: 900 }),
      ]),
    ]).search('dune', FIRST_PAGE);

    expect(result.books).toHaveLength(1);
    expect(result.books[0]).toMatchObject({ id: 'ol-OL1W', coverUrl: 'ol.jpg', popularity: 900 });
  });

  it('reports more pages when any provider has more', async () => {
    const many = Array.from({ length: 3 }, (_, index) => createTestBook({ id: `g${index}`, title: `Book ${index}` }));
    const result = await createMergedProvider([google(many), openLibrary([])]).search('book', { page: 0, pageSize: 2 });
    expect(result.hasMore).toBe(true);
  });

  it('shows the other results when one provider fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = google();
    failing.search.mockRejectedValueOnce(new CatalogError('HTTP 429'));

    const result = await createMergedProvider([failing, openLibrary()]).search('yester', FIRST_PAGE);

    expect(result.books.map((book) => book.id)).toEqual(['ol-OL2W']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('fails when every provider fails', async () => {
    const first = google();
    const second = openLibrary();
    first.search.mockRejectedValueOnce(new CatalogError('HTTP 429'));
    second.search.mockRejectedValueOnce(new CatalogError('HTTP 503'));

    await expect(createMergedProvider([first, second]).search('x', FIRST_PAGE)).rejects.toThrow('HTTP 429');
  });

  describe('time limits', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const hangingProvider = () => {
      const slow = openLibrary();
      const signals: AbortSignal[] = [];
      slow.search.mockImplementationOnce((_query, _options, signal) => {
        if (signal) signals.push(signal);
        return new Promise(() => {});
      });
      return { slow, signals };
    };

    /** Advances to `ms` after the start and reports whether the search has finished by then. */
    const finishedBy = async (search: Promise<unknown>, ms: number) => {
      let isDone = false;
      void search.finally(() => (isDone = true));
      await vi.advanceTimersByTimeAsync(ms - 1);
      const before = isDone;
      await vi.advanceTimersByTimeAsync(1);
      return { before, after: isDone };
    };

    /** A provider answering `books` after `ms` (fake timers). */
    const answeringAfter = (ms: number, books: CatalogBook[]) => {
      const catalog = new FakeCatalog(books);
      catalog.search.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ books, hasMore: false }), ms)),
      );
      return catalog;
    };
    const bonsTempos = createTestBook({ id: 'g-bt', title: 'Bons tempos', authors: ['Caro Claire Burke'] });

    it('always waits for a slow primary, so its books are never lost', async () => {
      // The bug: Google (primary) answered after the budget and its only Portuguese edition was dropped.
      const search = createMergedProvider([answeringAfter(SEARCH_TIME_BUDGET_MS + 500, [bonsTempos]), openLibrary()]).search(
        'bons tempos',
        FIRST_PAGE,
      );

      expect(await finishedBy(search, SEARCH_TIME_BUDGET_MS + 500)).toEqual({ before: false, after: true });
      expect((await search).books.map((book) => book.id)).toContain('g-bt');
    });

    it('drops a supplement still running at the time budget once the primary answered', async () => {
      const { slow, signals } = hangingProvider();
      const search = createMergedProvider([google(), slow]).search('yester', FIRST_PAGE);

      expect(await finishedBy(search, SEARCH_TIME_BUDGET_MS)).toEqual({ before: false, after: true });
      expect((await search).books.map((book) => book.id)).toEqual(['g-yester']);
      expect(signals[0]?.aborted).toBe(true);
    });

    it('waits for the supplements up to the maximum when the primary fails', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const failing = google();
      failing.search.mockRejectedValueOnce(new CatalogError('HTTP 429'));
      const late = answeringAfter(SEARCH_MAX_WAIT_MS - 500, [createTestBook({ id: 'ol-1', title: 'Yesterday' })]);

      const search = createMergedProvider([failing, late]).search('yester', FIRST_PAGE);

      expect(await finishedBy(search, SEARCH_MAX_WAIT_MS - 500)).toEqual({ before: false, after: true });
      expect((await search).books.map((book) => book.id)).toEqual(['ol-1']);
      warn.mockRestore();
    });

    it('gives up on a primary slower than the maximum wait and shows the others', async () => {
      const hangingPrimary = google();
      hangingPrimary.search.mockImplementationOnce(() => new Promise(() => {}));
      const search = createMergedProvider([hangingPrimary, openLibrary()]).search('yester', FIRST_PAGE);

      expect(await finishedBy(search, SEARCH_MAX_WAIT_MS)).toEqual({ before: false, after: true });
      expect((await search).books.map((book) => book.id)).toEqual(['ol-OL2W']);
    });
  });
  it('aborts every search when the caller aborts', async () => {
    const controller = new AbortController();
    const signals: AbortSignal[] = [];
    const hanging = () => {
      const catalog = google();
      catalog.search.mockImplementationOnce(
        (_query, _options, signal) =>
          new Promise((_resolve, reject) => {
            if (signal) signals.push(signal);
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      );
      return catalog;
    };

    const search = createMergedProvider([hanging(), hanging()]).search('x', FIRST_PAGE, controller.signal);
    controller.abort();

    await expect(search).rejects.toThrow();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('looks a book up in the first provider that knows it', async () => {
    const book = createTestBook({ id: 'ol-OL1W' });
    expect(await createMergedProvider([new FakeCatalog([]), new FakeCatalog([book])]).getBook('ol-OL1W')).toEqual(book);
  });
});

describe('popular', () => {
  it('reads the yearly trending list from Open Library', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ works: [{ key: '/works/OL1W', title: 'Atomic Habits', author_name: ['James Clear'], cover_i: 9 }] }),
    );

    const books = await createOpenLibraryProvider({ fetchFn }).popular(12);

    const url = requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe('https://openlibrary.org/trending/yearly.json');
    expect(url.searchParams.get('limit')).toBe('12');
    expect(books).toMatchObject([{ id: 'ol-OL1W', title: 'Atomic Habits', authors: ['James Clear'] }]);
  });

  it('is empty for Google Books, without a request', async () => {
    const fetchFn = vi.fn();
    expect(await createGoogleBooksProvider({ fetchFn }).popular(12)).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('joins the providers’ lists without repeating a work, up to the limit', async () => {
    const first = new FakeCatalog([createTestBook({ id: 'a', title: 'Dune', authors: ['Frank Herbert'] })]);
    const second = new FakeCatalog([
      createTestBook({ id: 'b', title: 'Dune', authors: ['Frank Herbert'] }),
      createTestBook({ id: 'c', title: 'Emma', authors: ['Jane Austen'] }),
      createTestBook({ id: 'd', title: 'Circe', authors: ['Madeline Miller'] }),
    ]);

    const books = await createMergedProvider([first, second]).popular(2);

    expect(books.map((book) => book.id)).toEqual(['a', 'c']);
  });
});

describe('createCatalogProvider', () => {
  it('still answers from Open Library when Google fails, filling covers by ISBN', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).startsWith('https://www.googleapis.com')
        ? jsonResponse({}, 503)
        : jsonResponse(OPEN_LIBRARY_RESPONSE),
    );

    const { books } = await createCatalogProvider({ fetchFn }).search('dune', FIRST_PAGE);

    expect(books[0]?.coverUrl).toBe('https://covers.openlibrary.org/b/isbn/9780441013593-M.jpg?default=false');
    warn.mockRestore();
  });

  it('asks both APIs and puts the matching, most read book first', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).startsWith('https://www.googleapis.com')
        ? jsonResponse({ items: [{ id: 'g9', volumeInfo: { title: 'Transactions', authors: ['Society'] } }] })
        : jsonResponse(OPEN_LIBRARY_RESPONSE),
    );

    const { books } = await createCatalogProvider({ fetchFn }).search('dun', FIRST_PAGE);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(books.map((book) => book.id)).toEqual(['ol-OL1W', 'g9']);
  });
});

/** Fake fetch that answers by URL prefix; unknown URLs get a 404. */
function routedFetch(routes: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix));
    return match ? jsonResponse(routes[match]) : jsonResponse({ error: 'not found' }, 404);
  });
}

describe('getBook', () => {
  const GOOGLE_VOLUME = {
    id: 'g1',
    volumeInfo: {
      title: 'Dune',
      authors: ['Frank Herbert'],
      industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780441013593' }],
    },
  };

  it('looks up a Google volume by id with the key and field mask', async () => {
    const fetchFn = routedFetch({ 'https://www.googleapis.com/books/v1/volumes/g1': GOOGLE_VOLUME });
    const book = await createGoogleBooksProvider({ apiKey: 'k', fetchFn }).getBook('g1');

    const url = requestedUrl(fetchFn);
    expect(url.pathname).toBe('/books/v1/volumes/g1');
    expect(url.searchParams.get('key')).toBe('k');
    expect(url.searchParams.get('fields')).toContain('volumeInfo(');
    expect(book?.title).toBe('Dune');
  });

  it('returns null for unknown Google ids and never asks Google about Open Library ids', async () => {
    const fetchFn = routedFetch({});
    const google = createGoogleBooksProvider({ fetchFn });
    expect(await google.getBook('missing')).toBeNull();

    fetchFn.mockClear();
    expect(await google.getBook('ol-OL1W')).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('looks up an Open Library work with its description', async () => {
    const fetchFn = routedFetch({
      'https://openlibrary.org/search.json': { docs: [{ key: '/works/OL1W', title: 'Dune', cover_i: 7 }] },
      'https://openlibrary.org/works/OL1W.json': { description: { type: '/type/text', value: 'Spice.' } },
    });

    const book = await createOpenLibraryProvider({ fetchFn }).getBook('ol-OL1W');

    expect(book).toMatchObject({ id: 'ol-OL1W', title: 'Dune', description: 'Spice.' });
    expect(requestedUrl(fetchFn).searchParams.get('q')).toBe('key:/works/OL1W');
  });

  it('returns null for ids Open Library does not own or does not know', async () => {
    const fetchFn = routedFetch({ 'https://openlibrary.org/search.json': { docs: [] } });
    const openLibrary = createOpenLibraryProvider({ fetchFn });
    expect(await openLibrary.getBook('g1')).toBeNull();
    expect(await openLibrary.getBook('ol-OL404W')).toBeNull();
  });

  it('adds the Open Library description by ISBN when Google has none', async () => {
    const fetchFn = routedFetch({
      'https://www.googleapis.com/books/v1/volumes/g1': GOOGLE_VOLUME,
      'https://openlibrary.org/isbn/9780441013593.json': { works: [{ key: '/works/OL1W' }] },
      'https://openlibrary.org/works/OL1W.json': { description: 'Desert planet.' },
    });

    const book = await createCatalogProvider({ fetchFn }).getBook('g1');

    expect(book?.description).toBe('Desert planet.');
    expect(book?.coverUrl).toBe('https://covers.openlibrary.org/b/isbn/9780441013593-M.jpg?default=false');
  });

  it('keeps the book when the description fallback fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).startsWith('https://www.googleapis.com') ? jsonResponse(GOOGLE_VOLUME) : jsonResponse({}, 500),
    );

    const book = await createCatalogProvider({ fetchFn }).getBook('g1');

    expect(book?.title).toBe('Dune');
    expect(book?.description).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns null when no provider knows the book', async () => {
    expect(await createCatalogProvider({ fetchFn: routedFetch({}) }).getBook('missing')).toBeNull();
  });
});
