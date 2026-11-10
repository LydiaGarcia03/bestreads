// Public API for lazily loaded screens only (shelves screen, desktop "My shelves" menu).
// Importing it from initial-bundle code would pull all of this into the initial JS; use `./index.ts` there.
export { BookCover, buildBookPath } from './index';
export type { LibraryBook, ReadingStatus, Shelf, ShelfFilter } from './index';
export { SHELF_QUERY_PARAM, SHELVES_PATH } from './shelfPath';
export { ShelfNameForm } from './components/ShelfNameForm';
export { StarRating } from './components/StarRating';
export { LibraryBookCover } from './components/LibraryBookCover';
export { groupBySeries, type ShelfEntry } from './seriesGroups';
export { libraryVolumeState } from './seriesTimeline';
export { SeriesDot } from './components/SeriesDot';
export { ProgressForm } from './components/ProgressSection';
export { useUpdateBook } from './useLibrary';
export { progressPercent } from './progress';
export { buildShelfPath, parseShelfKey, SHELF_LIMITS, shelfKey, validateShelfName } from './shelves';
export {
  SHELF_BOOKS_LIMIT,
  useCreateShelf,
  useDeleteShelf,
  useRenameShelf,
  useShelfBooks,
  useShelfCount,
  useShelfMove,
  useShelves,
} from './useShelves';
