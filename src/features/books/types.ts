import type { CatalogBook } from '@/features/catalog';
import type { LibraryBook, ReadingStatus } from './library';
import type { LibraryBookPatch } from './reads';
import type { Shelf, ShelfFilter } from './shelves';

export interface RatingChange {
  rating: number | null;
  ratingPublic: boolean;
}

export interface ListBooksOptions {
  filter: ShelfFilter;
  limit: number;
}

/** `users/{uid}/books` and `users/{uid}/shelves` storage boundary. Implemented with Firestore; faked in tests. */
export interface LibraryRepository {
  getBook(uid: string, bookId: string): Promise<LibraryBook | null>;
  /**
   * Adds the book with `status` on `today` (`YYYY-MM-DD`, see `newLibraryBookData`);
   * if it is already in the library, keeps it and returns it unchanged.
   */
  addBook(uid: string, book: CatalogBook, status: ReadingStatus, today: string): Promise<LibraryBook>;
  /** Changes status, progress, reads and/or shelves. */
  updateBook(uid: string, bookId: string, patch: LibraryBookPatch): Promise<void>;
  /**
   * Saves the rating and whether it is public, in one atomic write with its public copy:
   * published (`publicRatingOf`) when public and rated, deleted otherwise.
   */
  updateRating(uid: string, book: LibraryBook, change: RatingChange): Promise<void>;
  /** Removes the book and its public rating copy, if any. */
  removeBook(uid: string, bookId: string): Promise<void>;
  /** Books on a shelf, most recently updated first, up to `limit`. */
  listBooks(uid: string, options: ListBooksOptions): Promise<LibraryBook[]>;
  /** How many books are on a shelf. */
  countBooks(uid: string, filter: ShelfFilter): Promise<number>;

  /** The user's custom shelves, in their order. */
  listShelves(uid: string): Promise<Shelf[]>;
  createShelf(uid: string, shelf: Omit<Shelf, 'id'>): Promise<Shelf>;
  renameShelf(uid: string, shelfId: string, name: string): Promise<void>;
  /** Saves new positions (see `moveShelf`) in one write. */
  reorderShelves(uid: string, orders: readonly { id: string; order: number }[]): Promise<void>;
  /** Deletes the shelf and takes it off every book (books stay in the library). */
  deleteShelf(uid: string, shelfId: string): Promise<void>;
}
