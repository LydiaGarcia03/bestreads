// Public API used by code in the initial bundle (routes, top bar, providers). Keep it small:
// everything re-exported here ships in the initial JS. UI and hooks used only by lazily loaded
// screens are exported from `./lazy.ts` instead. Pages are not exported: routes lazy-load them.
export { BOOK_PATH, buildBookPath } from './bookPath';
export { SHELVES_PATH } from './shelfPath';
export { BookCover, type BookCoverProps } from './components/BookCover';
export {
  isReadingStatus,
  READING_STATUSES,
  type LibraryBook,
  type ReadingProgress,
  type ReadingStatus,
  type ReadPeriod,
} from './library';
export { LibraryContextProvider } from './LibraryContextProvider';
export { isValidRating } from './rating';
export { loadFirestoreLibraryRepository } from './services';
export type { LibraryBookPatch } from './reads';
export type { Shelf, ShelfFilter, ShelfNameError } from './shelves';
export type { LibraryRepository, ListBooksOptions, RatingChange } from './types';
