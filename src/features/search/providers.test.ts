import { createTestBook, FakeBookSearchProvider } from '@/test/fakes';
import {
  createBookSearchProvider,
  createFallbackProvider,
  createGoogleBooksProvider,
  createOpenLibraryProvider,
  MAX_SEARCH_RESULTS,
} from './providers';
import { BookSearchError } from './types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function requestedUrl(fetchFn: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(fetchFn.mock.calls[call]?.[0]));
}

const GOOGLE_RESPONSE = { items: [{ id: 'g1', volumeInfo: { title: 'Dune', authors: ['Frank Herbert'] } }] };
const OPEN_LIBRARY_RESPONSE = { docs: [{ key: '/works/OL1W', title: 'Dune', isbn: ['9780441013593'] }] };

describe('createGoogleBooksProvider', () => {
  it('queries the volumes API with a field mask and maps the results', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(GOOGLE_RESPONSE));
    const results = await createGoogleBooksProvider({ fetchFn }).search('dune');

    const url = requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/books/v1/volumes');
    expect(url.searchParams.get('q')).toBe('dune');
    expect(url.searchParams.get('maxResults')).toBe(String(MAX_SEARCH_RESULTS));
    expect(url.searchParams.get('fields')).toContain('volumeInfo(');
    expect(url.searchParams.has('key')).toBe(false);
    expect(results.map((book) => book.id)).toEqual(['g1']);
  });

  it('sends the API key when configured', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(GOOGLE_RESPONSE));
    await createGoogleBooksProvider({ apiKey: 'browser-key', fetchFn }).search('dune');
    expect(requestedUrl(fetchFn).searchParams.get('key')).toBe('browser-key');
  });

  it('passes the abort signal to fetch', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(GOOGLE_RESPONSE));
    const controller = new AbortController();
    await createGoogleBooksProvider({ fetchFn }).search('dune', controller.signal);
    expect(fetchFn).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal });
  });

  it('turns HTTP and network errors into BookSearchError', async () => {
    const quota = vi.fn(async () => jsonResponse({ error: 'quota' }, 429));
    await expect(createGoogleBooksProvider({ fetchFn: quota }).search('dune')).rejects.toBeInstanceOf(BookSearchError);

    const offline = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createGoogleBooksProvider({ fetchFn: offline }).search('dune')).rejects.toBeInstanceOf(
      BookSearchError,
    );
  });

  it('rethrows aborts unchanged', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const fetchFn = vi.fn(async () => {
      throw abort;
    });
    await expect(createGoogleBooksProvider({ fetchFn }).search('dune')).rejects.toBe(abort);
  });
});

describe('createOpenLibraryProvider', () => {
  it('queries the search API with a field list and maps the results', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(OPEN_LIBRARY_RESPONSE));
    const results = await createOpenLibraryProvider({ fetchFn }).search('dune');

    const url = requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe('https://openlibrary.org/search.json');
    expect(url.searchParams.get('limit')).toBe(String(MAX_SEARCH_RESULTS));
    expect(url.searchParams.get('fields')).toContain('cover_i');
    expect(results.map((book) => book.id)).toEqual(['ol-OL1W']);
  });
});

describe('createFallbackProvider', () => {
  const primaryBook = createTestBook({ id: 'primary' });
  const fallbackBook = createTestBook({ id: 'fallback' });

  it('uses the primary results when there are any', async () => {
    const fallback = new FakeBookSearchProvider([fallbackBook]);
    const results = await createFallbackProvider(new FakeBookSearchProvider([primaryBook]), fallback).search('x');
    expect(results).toEqual([primaryBook]);
    expect(fallback.search).not.toHaveBeenCalled();
  });

  it('uses the fallback when the primary finds nothing', async () => {
    const results = await createFallbackProvider(
      new FakeBookSearchProvider([]),
      new FakeBookSearchProvider([fallbackBook]),
    ).search('x');
    expect(results).toEqual([fallbackBook]);
  });

  it('uses the fallback when the primary fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const primary = new FakeBookSearchProvider();
    primary.search.mockRejectedValueOnce(new BookSearchError('HTTP 429'));

    const results = await createFallbackProvider(primary, new FakeBookSearchProvider([fallbackBook])).search('x');

    expect(results).toEqual([fallbackBook]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not fall back after an abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const primary = new FakeBookSearchProvider();
    primary.search.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    const fallback = new FakeBookSearchProvider([fallbackBook]);

    await expect(createFallbackProvider(primary, fallback).search('x', controller.signal)).rejects.toThrow('Aborted');
    expect(fallback.search).not.toHaveBeenCalled();
  });
});

describe('createBookSearchProvider', () => {
  it('falls back to Open Library and fills covers by ISBN', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
      String(input).startsWith('https://www.googleapis.com')
        ? jsonResponse({}, 503)
        : jsonResponse(OPEN_LIBRARY_RESPONSE),
    );

    const [book] = await createBookSearchProvider({ fetchFn }).search('dune');

    expect(book?.source).toBe('openLibrary');
    expect(book?.coverUrl).toBe('https://covers.openlibrary.org/b/isbn/9780441013593-M.jpg?default=false');
    warn.mockRestore();
  });
});
