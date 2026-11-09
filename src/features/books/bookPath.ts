/** Book page route: pure, no router import. */

export const BOOK_PATH = '/book/:bookId';

export function buildBookPath(bookId: string): string {
  return `/book/${encodeURIComponent(bookId)}`;
}
