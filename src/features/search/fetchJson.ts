import { BookSearchError } from './types';

export type FetchFn = typeof fetch;

/** Calls the global `fetch` lazily and unbound-safe (a detached `window.fetch` throws "Illegal invocation"). */
export const defaultFetch: FetchFn = (input, init) => fetch(input, init);

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * GETs JSON, turning network failures and HTTP errors into `BookSearchError`.
 * Aborts are rethrown unchanged so the query library can tell them apart.
 */
export async function fetchJson(fetchFn: FetchFn, url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFn(url, { signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new BookSearchError(`Request failed: ${url}`, { cause: error });
  }
  if (!response.ok) throw new BookSearchError(`HTTP ${response.status}: ${url}`);
  return response.json();
}
