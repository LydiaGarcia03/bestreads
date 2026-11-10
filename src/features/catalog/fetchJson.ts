import { CatalogError } from './types';

export type FetchFn = typeof fetch;

/** Calls the global `fetch` lazily and unbound-safe (a detached `window.fetch` throws "Illegal invocation"). */
export const defaultFetch: FetchFn = (input, init) => fetch(input, init);

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * GETs JSON, turning network failures and HTTP errors into `CatalogError`.
 * Aborts are rethrown unchanged so the query library can tell them apart.
 */
export async function fetchJson(fetchFn: FetchFn, url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFn(url, { signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new CatalogError(`Request failed: ${url}`, { cause: error });
  }
  if (!response.ok) throw new CatalogError(`HTTP ${response.status}: ${url}`, { cause: response.status });
  return response.json();
}

const HTTP_NOT_FOUND = 404;

/** Like `fetchJson`, but resolves to `null` when the resource doesn't exist (HTTP 404). */
export async function fetchJsonOrNull(fetchFn: FetchFn, url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return await fetchJson(fetchFn, url, signal);
  } catch (error) {
    if (error instanceof CatalogError && error.cause === HTTP_NOT_FOUND) return null;
    throw error;
  }
}
