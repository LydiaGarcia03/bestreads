export type BookSource = 'googleBooks' | 'openLibrary';

/** One book in search results, independent of the API it came from. */
export interface BookSearchResult {
  /** Google Books volume id, or `ol-<work id>` for Open Library (see `CLAUDE.md`). */
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  description: string | null;
  pageCount: number | null;
  isbn: string | null;
  publishedYear: number | null;
  source: BookSource;
}

/** Book search API boundary. Implemented by Google Books and Open Library; faked in tests. */
export interface BookSearchProvider {
  search(query: string, signal?: AbortSignal): Promise<BookSearchResult[]>;
}

/** Thrown by providers when the API can't be reached or answers with an error. */
export class BookSearchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BookSearchError';
  }
}
