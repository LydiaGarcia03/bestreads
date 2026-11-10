import type { CatalogBook } from '@/features/catalog';
import type { LibraryBook, ReadingStatus } from './library';
import type { LibraryBookPatch } from './reads';
import type { Review } from './review';
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
  /** Removes the book with its private data (review, personal cover) and its public rating copy, if any. */
  removeBook(uid: string, bookId: string): Promise<void>;
  /** The owner's review of a book in the library, or `null` when there is none. */
  getReview(uid: string, bookId: string): Promise<Review | null>;
  /** Saves the review; an empty text deletes it. */
  saveReview(uid: string, bookId: string, text: string): Promise<void>;
  /** The owner's cover photo as a data URL, or `null`. */
  getPersonalCover(uid: string, bookId: string): Promise<string | null>;
  /** Saves (or with `null` removes) the cover photo and sets `hasPersonalCover`, in one write. */
  savePersonalCover(uid: string, bookId: string, dataUrl: string | null): Promise<void>;
  /** Books on a shelf, most recently updated first, up to `limit`. */
  listBooks(uid: string, options: ListBooksOptions): Promise<LibraryBook[]>;
  /** How many books are on a shelf. */
  countBooks(uid: string, filter: ShelfFilter): Promise<number>;
  /** The owner's books in the series named exactly `name`. */
  listSeriesBooks(uid: string, name: string): Promise<LibraryBook[]>;
  /** Series names used in the owner's library (for suggestions; may repeat). */
  listSeriesNames(uid: string): Promise<string[]>;

  /** The user's custom shelves, in their order. */
  listShelves(uid: string): Promise<Shelf[]>;
  createShelf(uid: string, shelf: Omit<Shelf, 'id'>): Promise<Shelf>;
  renameShelf(uid: string, shelfId: string, name: string): Promise<void>;
  /** Saves new positions (see `moveShelf`) in one write. */
  reorderShelves(uid: string, orders: readonly { id: string; order: number }[]): Promise<void>;
  /** Deletes the shelf and takes it off every book (books stay in the library). */
  deleteShelf(uid: string, shelfId: string): Promise<void>;
}
