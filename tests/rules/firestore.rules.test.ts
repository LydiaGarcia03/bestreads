/**
 * Security rules tests for `firestore.rules`, run on the Firestore emulator (`npm run test:rules`).
 * They prove private paths are owner-only and nothing private can reach `public/...`.
 */
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const OWNER = 'owner-uid';
const OTHER = 'other-uid';
const BOOK = 'vol-1';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bestreads',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const as = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const anonymous = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;

/** Writes data as an admin (rules off), to set up a test. */
async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore() as unknown as Firestore, path), data);
  });
}

const userDoc = (overrides: Record<string, unknown> = {}) => ({
  displayName: 'Reader',
  photoURL: null,
  preferences: { theme: 'system', language: 'en' },
  createdAt: serverTimestamp(),
  ...overrides,
});

/** A library book as the app writes it (`newLibraryBookData` + timestamps). */
const bookDoc = (overrides: Record<string, unknown> = {}) => ({
  title: 'Dune',
  subtitle: null,
  authors: ['Frank Herbert'],
  coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
  description: null,
  pageCount: 412,
  isbn: '9780441013593',
  publishedYear: 1965,
  source: 'openLibrary',
  status: 'reading',
  shelfIds: [],
  rating: null,
  ratingPublic: false,
  progress: null,
  reads: [{ startedOn: '2026-11-01', finishedOn: null }],
  addedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

/** A stored book (timestamps already set), for seeding. */
const storedBook = (overrides: Record<string, unknown> = {}) => ({
  ...bookDoc(),
  addedAt: Timestamp.fromMillis(1_700_000_000_000),
  updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  ...overrides,
});

const bookPath = (uid = OWNER, bookId = BOOK) => `users/${uid}/books/${bookId}`;
const publicRatingPath = (uid = OWNER, bookId = BOOK) => `public/${uid}/ratings/${bookId}`;
const publicCopy = (overrides: Record<string, unknown> = {}) => ({
  title: 'Dune',
  authors: ['Frank Herbert'],
  coverUrl: 'https://covers.openlibrary.org/b/id/1-M.jpg',
  rating: 4.5,
  ratedAt: serverTimestamp(),
  ...overrides,
});

describe('users/{uid}', () => {
  it('lets the owner create and read their profile', async () => {
    await assertSucceeds(setDoc(doc(as(OWNER), `users/${OWNER}`), userDoc()));
    await assertSucceeds(getDoc(doc(as(OWNER), `users/${OWNER}`)));
  });

  it('keeps it from other users and visitors', async () => {
    await seed(`users/${OWNER}`, { ...userDoc(), createdAt: Timestamp.now() });
    await assertFails(getDoc(doc(as(OTHER), `users/${OWNER}`)));
    await assertFails(getDoc(doc(anonymous(), `users/${OWNER}`)));
    await assertFails(setDoc(doc(as(OTHER), `users/${OWNER}`), userDoc()));
  });

  it('rejects unknown fields, bad preferences and deletion', async () => {
    await assertFails(setDoc(doc(as(OWNER), `users/${OWNER}`), userDoc({ isAdmin: true })));
    await assertFails(
      setDoc(doc(as(OWNER), `users/${OWNER}`), userDoc({ preferences: { theme: 'pink', language: 'en' } })),
    );
    await seed(`users/${OWNER}`, { ...userDoc(), createdAt: Timestamp.now() });
    await assertFails(deleteDoc(doc(as(OWNER), `users/${OWNER}`)));
  });
});

describe('admins/{uid}', () => {
  it('can only be read by its own user and never written from the app', async () => {
    await seed(`admins/${OWNER}`, { createdAt: Timestamp.now() });
    await assertSucceeds(getDoc(doc(as(OWNER), `admins/${OWNER}`)));
    await assertFails(getDoc(doc(as(OTHER), `admins/${OWNER}`)));
    await assertFails(setDoc(doc(as(OTHER), `admins/${OTHER}`), { createdAt: serverTimestamp() }));
  });
});

describe('users/{uid}/books/{bookId}', () => {
  it('lets the owner add, read, update and remove a book', async () => {
    const db = as(OWNER);
    await assertSucceeds(setDoc(doc(db, bookPath()), bookDoc()));
    await assertSucceeds(getDoc(doc(db, bookPath())));
    await assertSucceeds(updateDoc(doc(db, bookPath()), { status: 'read', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, bookPath())));
  });

  it('keeps books from other users and visitors', async () => {
    await seed(bookPath(), storedBook());
    await assertFails(getDoc(doc(as(OTHER), bookPath())));
    await assertFails(getDoc(doc(anonymous(), bookPath())));
    await assertFails(setDoc(doc(as(OTHER), bookPath(OWNER, 'vol-2')), bookDoc()));
    await assertFails(deleteDoc(doc(as(OTHER), bookPath())));
  });

  it('validates the rating: multiples of 0.25 in (0, 5]', async () => {
    const db = as(OWNER);
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'a')), bookDoc({ rating: 3.75 })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'b')), bookDoc({ rating: 3.3 })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'c')), bookDoc({ rating: 0 })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'd')), bookDoc({ rating: 5.25 })));
  });

  it('validates status, progress, extra fields and timestamps', async () => {
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'a')), bookDoc({ status: 'lost' })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'b')), bookDoc({ progress: { unit: 'percent', value: 120 } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'c')), bookDoc({ review: 'Private text' })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'd')), bookDoc({ addedAt: Timestamp.fromMillis(0) })));
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'e')), bookDoc({ progress: { unit: 'pages', value: 120 } })));
  });

  it('keeps addedAt and accepts the optional personal cover flag', async () => {
    await seed(bookPath(), storedBook());
    const db = as(OWNER);
    await assertFails(updateDoc(doc(db, bookPath()), { addedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, bookPath()), { hasPersonalCover: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, bookPath()), { hasPersonalCover: 'yes', updatedAt: serverTimestamp() }));
  });
});

describe('private review and cover', () => {
  const reviewPath = `${bookPath()}/private/review`;
  const coverPath = `${bookPath()}/private/cover`;
  const coverDataUrl = 'data:image/webp;base64,UklGRg==';

  it('are owner-only, for books in the library', async () => {
    await seed(bookPath(), storedBook());
    const db = as(OWNER);
    await assertSucceeds(setDoc(doc(db, reviewPath), { text: 'Loved it.', updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, coverPath), { dataUrl: coverDataUrl, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(db, reviewPath)));

    await assertFails(getDoc(doc(as(OTHER), reviewPath)));
    await assertFails(getDoc(doc(as(OTHER), coverPath)));
    await assertFails(getDoc(doc(anonymous(), reviewPath)));
    await assertFails(setDoc(doc(as(OTHER), reviewPath), { text: 'Mine now', updatedAt: serverTimestamp() }));
  });

  it('need the book to be in the library', async () => {
    await assertFails(setDoc(doc(as(OWNER), reviewPath), { text: 'Loved it.', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as(OWNER), coverPath), { dataUrl: coverDataUrl, updatedAt: serverTimestamp() }));
  });

  it('validate their content', async () => {
    await seed(bookPath(), storedBook());
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, reviewPath), { text: '', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, reviewPath), { text: 'x'.repeat(20_001), updatedAt: serverTimestamp() }));
    await assertFails(
      setDoc(doc(db, coverPath), { dataUrl: 'data:image/png;base64,iVBORw0KGgo=', updatedAt: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(db, coverPath), { dataUrl: `data:image/webp;base64,${'A'.repeat(220_001)}`, updatedAt: serverTimestamp() }),
    );
    await assertFails(setDoc(doc(db, coverPath), { dataUrl: 'https://example.com/a.jpg', updatedAt: serverTimestamp() }));
  });
});

describe('public/{uid}/ratings/{bookId}', () => {
  /** Publishes a rating the way the app does: private book and public copy in one batch. */
  const publish = (db: Firestore, book: Record<string, unknown>, copy: Record<string, unknown>) => {
    const batch = writeBatch(db);
    batch.update(doc(db, bookPath()), { ...book, updatedAt: serverTimestamp() });
    batch.set(doc(db, publicRatingPath()), copy);
    return batch.commit();
  };

  beforeEach(async () => {
    await seed(bookPath(), storedBook());
  });

  it('publishes a public rating together with the private one, readable by signed-in users only', async () => {
    await assertSucceeds(publish(as(OWNER), { rating: 4.5, ratingPublic: true }, publicCopy()));
    await assertSucceeds(getDoc(doc(as(OTHER), publicRatingPath())));
    await assertFails(getDoc(doc(anonymous(), publicRatingPath())));
  });

  it('never accepts private data in the public copy', async () => {
    for (const privateField of [
      { review: 'Only for me' },
      { progress: { unit: 'pages', value: 10 } },
      { reads: [] },
      { personalCover: 'data:image/webp;base64,UklGRg==' },
    ]) {
      await assertFails(publish(as(OWNER), { rating: 4.5, ratingPublic: true }, publicCopy(privateField)));
    }
  });

  it('requires the copy to match a public, rated book in the library', async () => {
    const db = as(OWNER);
    await assertFails(publish(db, { rating: 4.5, ratingPublic: true }, publicCopy({ rating: 5 })));
    await assertFails(publish(db, { rating: 4.5, ratingPublic: false }, publicCopy()));
    await assertFails(setDoc(doc(db, publicRatingPath(OWNER, 'not-in-library')), publicCopy()));
  });

  it('lets only the owner write or delete their public ratings', async () => {
    await assertFails(setDoc(doc(as(OTHER), publicRatingPath()), publicCopy()));
    await seed(publicRatingPath(), { ...publicCopy(), ratedAt: Timestamp.now() });
    await assertFails(deleteDoc(doc(as(OTHER), publicRatingPath())));
    await assertSucceeds(deleteDoc(doc(as(OWNER), publicRatingPath())));
  });
});

describe('users/{uid}/shelves/{shelfId}', () => {
  it('are owner-only with a valid name', async () => {
    const db = as(OWNER);
    const shelf = (name: string) => ({ name, order: 1, createdAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/shelves/s1`), shelf('Favorites')));
    await assertFails(setDoc(doc(db, `users/${OWNER}/shelves/s2`), shelf('')));
    await assertFails(setDoc(doc(db, `users/${OWNER}/shelves/s3`), shelf('x'.repeat(51))));
    await assertFails(getDoc(doc(as(OTHER), `users/${OWNER}/shelves/s1`)));
    await assertFails(setDoc(doc(as(OTHER), `users/${OWNER}/shelves/s4`), shelf('Mine')));
  });
});

describe('everything else', () => {
  it('is closed by default', async () => {
    await assertFails(setDoc(doc(as(OWNER), `public/${OWNER}`), { displayName: 'Reader' }));
    await assertFails(setDoc(doc(as(OWNER), 'anything/else'), { a: 1 }));
    await assertFails(getDoc(doc(as(OWNER), 'anything/else')));
  });
});
