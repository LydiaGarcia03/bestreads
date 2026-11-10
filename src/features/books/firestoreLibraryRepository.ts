import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase/firestore';
import { getFirebaseApp } from '@/shared/firebase/app';
import { newLibraryBookData, readLibraryBook, type LibraryBook } from './library';
import { publicRatingOf } from './rating';
import { sortShelves, type Shelf, type ShelfFilter } from './shelves';
import type { LibraryRepository } from './types';

const USERS = 'users';
const BOOKS = 'books';
const SHELVES = 'shelves';
const PRIVATE = 'private';
const REVIEW = 'review';
const COVER = 'cover';
const PUBLIC = 'public';
const RATINGS = 'ratings';
/** Firestore's limit of writes per batch. */
const MAX_BATCH_WRITES = 500;

function readShelf(id: string, data: DocumentData): Shelf {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    order: typeof data.order === 'number' ? data.order : 0,
  };
}

/** Firestore timestamps → `Date`, so the domain never sees SDK types. */
function withDates(data: DocumentData): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value instanceof Timestamp ? value.toDate() : value]),
  );
}

/** Firestore implementation of `LibraryRepository`. Loaded on demand (see `services.ts`). */
export function createFirestoreLibraryRepository(db: Firestore = getFirestore(getFirebaseApp())): LibraryRepository {
  const booksOf = (uid: string) => collection(db, USERS, uid, BOOKS);
  const bookRef = (uid: string, bookId: string) => doc(db, USERS, uid, BOOKS, bookId);
  const publicRatingRef = (uid: string, bookId: string) => doc(db, PUBLIC, uid, RATINGS, bookId);
  const privateRef = (uid: string, bookId: string, name: string) => doc(db, USERS, uid, BOOKS, bookId, PRIVATE, name);
  const shelvesOf = (uid: string) => collection(db, USERS, uid, SHELVES);
  const shelfRef = (uid: string, shelfId: string) => doc(db, USERS, uid, SHELVES, shelfId);
  const toBook = (id: string, data: DocumentData): LibraryBook => readLibraryBook(id, withDates(data));
  // One equality or array-contains filter, so no composite index is needed.
  const booksOn = (uid: string, filter: ShelfFilter): Query =>
    filter.kind === 'status'
      ? query(booksOf(uid), where('status', '==', filter.status))
      : query(booksOf(uid), where('shelfIds', 'array-contains', filter.shelfId));

  return {
    async getBook(uid, bookId) {
      const snapshot = await getDoc(bookRef(uid, bookId));
      return snapshot.exists() ? toBook(snapshot.id, snapshot.data()) : null;
    },

    async addBook(uid, book, status, today) {
      const ref = bookRef(uid, book.id);
      const data = newLibraryBookData(book, status, today);
      // A transaction makes "add" safe against double taps and other devices: an existing book is never overwritten.
      const existing = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists()) return toBook(snapshot.id, snapshot.data());
        transaction.set(ref, { ...data, addedAt: serverTimestamp(), updatedAt: serverTimestamp() });
        return null;
      });
      return existing ?? { id: book.id, ...data, addedAt: null, updatedAt: null };
    },

    async updateBook(uid, bookId, patch) {
      await updateDoc(bookRef(uid, bookId), { ...patch, updatedAt: serverTimestamp() });
    },

    async updateRating(uid, book, { rating, ratingPublic }) {
      // One batch, so the public copy never disagrees with the private rating (the rules check both).
      const batch = writeBatch(db);
      batch.update(bookRef(uid, book.id), { rating, ratingPublic, updatedAt: serverTimestamp() });
      const publicCopy = publicRatingOf(book, rating, ratingPublic);
      if (publicCopy) batch.set(publicRatingRef(uid, book.id), { ...publicCopy, ratedAt: serverTimestamp() });
      else batch.delete(publicRatingRef(uid, book.id));
      await batch.commit();
    },

    async removeBook(uid, bookId) {
      // Subcollections are not deleted with their parent, so the private documents go explicitly.
      const batch = writeBatch(db);
      batch.delete(privateRef(uid, bookId, REVIEW));
      batch.delete(privateRef(uid, bookId, COVER));
      batch.delete(publicRatingRef(uid, bookId));
      batch.delete(bookRef(uid, bookId));
      await batch.commit();
    },

    async getReview(uid, bookId) {
      const snapshot = await getDoc(privateRef(uid, bookId, REVIEW));
      if (!snapshot.exists()) return null;
      const data = withDates(snapshot.data());
      return {
        text: typeof data.text === 'string' ? data.text : '',
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : null,
      };
    },

    async getPersonalCover(uid, bookId) {
      const snapshot = await getDoc(privateRef(uid, bookId, COVER));
      const dataUrl = snapshot.exists() ? snapshot.data().dataUrl : null;
      return typeof dataUrl === 'string' ? dataUrl : null;
    },

    async savePersonalCover(uid, bookId, dataUrl) {
      // One batch: the flag on the book (read by lists) never disagrees with the cover document.
      const batch = writeBatch(db);
      if (dataUrl) batch.set(privateRef(uid, bookId, COVER), { dataUrl, updatedAt: serverTimestamp() });
      else batch.delete(privateRef(uid, bookId, COVER));
      batch.update(bookRef(uid, bookId), { hasPersonalCover: dataUrl !== null, updatedAt: serverTimestamp() });
      await batch.commit();
    },

    async saveReview(uid, bookId, text) {
      const ref = privateRef(uid, bookId, REVIEW);
      if (text) await setDoc(ref, { text, updatedAt: serverTimestamp() });
      else await deleteDoc(ref);
    },

    async listBooks(uid, { filter, limit: count }) {
      // Sorted in memory, so the query needs no composite index (shelves are small and limited).
      const snapshot = await getDocs(query(booksOn(uid, filter), limit(count)));
      return snapshot.docs
        .map((document) => toBook(document.id, document.data()))
        .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    },

    async countBooks(uid, filter) {
      // An aggregation: billed as one read per 1,000 books counted, without downloading them.
      const snapshot = await getCountFromServer(booksOn(uid, filter));
      return snapshot.data().count;
    },

    async listShelves(uid) {
      const snapshot = await getDocs(shelvesOf(uid));
      return sortShelves(snapshot.docs.map((document) => readShelf(document.id, document.data())));
    },

    async createShelf(uid, { name, order }) {
      const ref = await addDoc(shelvesOf(uid), { name, order, createdAt: serverTimestamp() });
      return { id: ref.id, name, order };
    },

    async renameShelf(uid, shelfId, name) {
      await updateDoc(shelfRef(uid, shelfId), { name });
    },

    async reorderShelves(uid, orders) {
      const batch = writeBatch(db);
      orders.forEach(({ id, order }) => batch.update(shelfRef(uid, id), { order }));
      await batch.commit();
    },

    async deleteShelf(uid, shelfId) {
      const onShelf = await getDocs(booksOn(uid, { kind: 'custom', shelfId }));
      const removals = onShelf.docs.map((document) => document.ref);
      // The shelf goes last, so a failed run can be retried and still finds its books.
      for (let start = 0; start < removals.length; start += MAX_BATCH_WRITES) {
        const batch = writeBatch(db);
        removals
          .slice(start, start + MAX_BATCH_WRITES)
          .forEach((ref) => batch.update(ref, { shelfIds: arrayRemove(shelfId), updatedAt: serverTimestamp() }));
        await batch.commit();
      }
      await deleteDoc(shelfRef(uid, shelfId));
    },
  };
}
