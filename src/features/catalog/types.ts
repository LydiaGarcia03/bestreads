export type BookSource = 'googleBooks' | 'openLibrary';

export interface BookSeries {
  name: string;
  /** Position as the API writes it: "1", "2.5", "1-7"; `null` when unknown. */
  position: string | null;
}

/** A book as described by the public book APIs, independent of the API it came from. */
export interface CatalogBook {
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
  /** `YYYY`, `YYYY-MM` or `YYYY-MM-DD`, as precise as the API knows it. */
  publishedDate: string | null;
  /** A few subjects or genres, most relevant first. */
  categories: string[];
  /** How many people read or rated it, per the API (0 when unknown). Only used to rank search results. */
  popularity: number;
  /** The series it belongs to, when the API knows it (Open Library), e.g. "Dune", position "1". */
  series: BookSeries | null;
  /**
   * Subjects for search matching only (Open Library subjects, Google categories). Open Library often
   * lacks the series of famous sequels but tags them, e.g. "Hunger Games (Fictitious place)".
   */
  subjects: string[];
  source: BookSource;
}

export interface CatalogSearchOptions {
  /** Zero-based page number. */
  page: number;
  pageSize: number;
}

export interface CatalogSearchResult {
  books: CatalogBook[];
  hasMore: boolean;
}

/** Public book API boundary. Implemented by Google Books and Open Library; faked in tests. */
export interface CatalogProvider {
  search(query: string, options: CatalogSearchOptions, signal?: AbortSignal): Promise<CatalogSearchResult>;
  /** The book with this `bookId`, or `null` when this provider doesn't know it. */
  getBook(bookId: string, signal?: AbortSignal): Promise<CatalogBook | null>;
  /** Books many people are reading now, most popular first (empty when the API has no such list). */
  popular(limit: number, signal?: AbortSignal): Promise<CatalogBook[]>;
  /** Books of the series named `name` (empty when the API has no series data). */
  seriesBooks(name: string, signal?: AbortSignal): Promise<CatalogBook[]>;
}

/** Thrown by providers when the API can't be reached or answers with an error. */
export class CatalogError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CatalogError';
  }
}
