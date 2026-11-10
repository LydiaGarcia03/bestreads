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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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

  it('accepts an optional, valid series', async () => {
    const db = as(OWNER);
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'a')), bookDoc({ series: { name: 'Dune', volume: 1 } })));
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'b')), bookDoc({ series: { name: 'Discworld', volume: 2.5 } })));
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'c')), bookDoc({ series: { name: 'Saga', volume: null } })));
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'd')), bookDoc({ series: null })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'e')), bookDoc({ series: { name: '', volume: 1 } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'f')), bookDoc({ series: { name: 'Dune', volume: -1 } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'g')), bookDoc({ series: { name: 'Dune', volume: 1, note: 'x' } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'h')), bookDoc({ series: 'Dune' })));
  });

  it('accepts an optional, valid reading plan only while reading', async () => {
    const db = as(OWNER);
    const plan = { pagesPerDay: 25, time: '21:30', weekdays: [1, 3, 5], reminder: true };
    const reading = (overrides: Record<string, unknown>) => bookDoc({ status: 'reading', ...overrides });
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'a')), reading({ plan })));
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'b')), reading({ plan: { ...plan, time: null, reminder: false } })));
    await assertSucceeds(setDoc(doc(db, bookPath(OWNER, 'c')), bookDoc({ status: 'read', plan: null })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'd')), bookDoc({ status: 'read', plan })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'e')), reading({ plan: { ...plan, pagesPerDay: 0 } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'f')), reading({ plan: { ...plan, pagesPerDay: 2.5 } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'g')), reading({ plan: { ...plan, time: '24:00' } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'h')), reading({ plan: { ...plan, weekdays: [] } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'i')), reading({ plan: { ...plan, weekdays: [1, 1] } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'j')), reading({ plan: { ...plan, weekdays: [7] } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'k')), reading({ plan: { ...plan, time: null } })));
    await assertFails(setDoc(doc(db, bookPath(OWNER, 'l')), reading({ plan: { ...plan, note: 'x' } })));
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

describe('usernames/{username} and public/{uid}', () => {
  const profile = (overrides: Record<string, unknown> = {}) => ({
    username: 'reader',
    displayName: 'Reader',
    photoURL: null,
    ...overrides,
  });

  /** Claims a username the way the app does: the username and the public profile in one write. */
  const claim = (db: Firestore, uid: string, username: string, owner = uid, data = profile({ username })) => {
    const batch = writeBatch(db);
    batch.set(doc(db, `usernames/${username}`), { uid: owner, createdAt: serverTimestamp() });
    batch.set(doc(db, `public/${uid}`), data);
    return batch.commit();
  };

  it('lets a user claim a free username with their public profile, readable one at a time', async () => {
    await assertSucceeds(claim(as(OWNER), OWNER, 'reader'));
    await assertSucceeds(getDoc(doc(as(OTHER), 'usernames/reader')));
    await assertSucceeds(getDoc(doc(as(OTHER), `public/${OWNER}`)));
    await assertFails(getDoc(doc(anonymous(), `public/${OWNER}`)));
    await assertFails(getDoc(doc(anonymous(), 'usernames/reader')));
  });

  it('never lists usernames or public profiles', async () => {
    await claim(as(OWNER), OWNER, 'reader');
    await assertFails(getDocs(collection(as(OTHER), 'usernames')));
    await assertFails(getDocs(collection(as(OTHER), 'public')));
  });

  it('refuses a taken, invalid or reserved username', async () => {
    await claim(as(OWNER), OWNER, 'reader');
    await assertFails(claim(as(OTHER), OTHER, 'reader'));
    for (const username of ['ab', 'x'.repeat(21), 'Reader', 'read-er', 'admin']) {
      await assertFails(claim(as(OTHER), OTHER, username));
    }
    await assertSucceeds(claim(as(OTHER), OTHER, 'other_1'));
  });

  it('needs both documents to agree and gives one username per user', async () => {
    const db = as(OTHER);
    // Only one of the two documents.
    await assertFails(setDoc(doc(db, 'usernames/lonely'), { uid: OTHER, createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, `public/${OTHER}`), profile({ username: 'lonely' })));
    // A username for someone else, or a profile pointing to another username.
    await assertFails(claim(db, OTHER, 'stolen', OWNER));
    await assertFails(claim(db, OTHER, 'mine', OTHER, profile({ username: 'other' })));
    // A second username.
    await assertSucceeds(claim(db, OTHER, 'first'));
    await assertFails(claim(db, OTHER, 'second'));
  });

  it('keeps the profile owner-only, without extra fields or a new username', async () => {
    await claim(as(OWNER), OWNER, 'reader');
    const db = as(OWNER);
    await assertSucceeds(updateDoc(doc(db, `public/${OWNER}`), { displayName: 'New name', photoURL: 'https://p.example/a.jpg' }));
    await assertFails(updateDoc(doc(db, `public/${OWNER}`), { username: 'renamed' }));
    await assertFails(updateDoc(doc(db, `public/${OWNER}`), { email: 'reader@example.com' }));
    await assertFails(updateDoc(doc(as(OTHER), `public/${OWNER}`), { displayName: 'Hacked' }));
    await assertFails(updateDoc(doc(db, 'usernames/reader'), { uid: OTHER }));
    await assertFails(deleteDoc(doc(db, 'usernames/reader')));
    await assertFails(deleteDoc(doc(db, `public/${OWNER}`)));
  });
});

describe('follows/{followerUid}_{followedUid}', () => {
  const THIRD = 'third-uid';
  const follow = (follower: string, followed: string, overrides: Record<string, unknown> = {}) => ({
    followerUid: follower,
    followedUid: followed,
    createdAt: serverTimestamp(),
    ...overrides,
  });
  const followPath = (follower: string, followed: string) => `follows/${follower}_${followed}`;

  beforeEach(async () => {
    for (const [uid, username] of [
      [OWNER, 'owner'],
      [OTHER, 'other'],
    ]) {
      await seed(`usernames/${username}`, { uid, createdAt: Timestamp.now() });
      await seed(`public/${uid}`, { username, displayName: null, photoURL: null });
    }
  });

  it('lets a user follow another public profile, readable and countable by signed-in users', async () => {
    await assertSucceeds(setDoc(doc(as(OWNER), followPath(OWNER, OTHER)), follow(OWNER, OTHER)));
    await assertSucceeds(getDoc(doc(as(THIRD), followPath(OWNER, OTHER))));
    await assertSucceeds(getDocs(query(collection(as(THIRD), 'follows'), where('followedUid', '==', OTHER))));
    await assertFails(getDoc(doc(anonymous(), followPath(OWNER, OTHER))));
  });

  it('only between two public profiles, never yourself', async () => {
    // THIRD has no public profile: can't follow, can't be followed.
    await assertFails(setDoc(doc(as(THIRD), followPath(THIRD, OTHER)), follow(THIRD, OTHER)));
    await assertFails(setDoc(doc(as(OWNER), followPath(OWNER, THIRD)), follow(OWNER, THIRD)));
    await assertFails(setDoc(doc(as(OWNER), followPath(OWNER, OWNER)), follow(OWNER, OWNER)));
  });

  it('only as yourself, with the id matching the pair and no extra fields', async () => {
    await assertFails(setDoc(doc(as(OTHER), followPath(OWNER, OTHER)), follow(OWNER, OTHER)));
    await assertFails(setDoc(doc(as(OWNER), 'follows/whatever'), follow(OWNER, OTHER)));
    await assertFails(setDoc(doc(as(OWNER), followPath(OWNER, OTHER)), follow(OWNER, OTHER, { note: 'hi' })));
    await assertFails(
      setDoc(doc(as(OWNER), followPath(OWNER, OTHER)), follow(OWNER, OTHER, { createdAt: Timestamp.fromMillis(0) })),
    );
  });

  it('can be removed only by the follower and never edited', async () => {
    await seed(followPath(OWNER, OTHER), { followerUid: OWNER, followedUid: OTHER, createdAt: Timestamp.now() });
    await assertFails(updateDoc(doc(as(OWNER), followPath(OWNER, OTHER)), { followedUid: THIRD }));
    await assertFails(deleteDoc(doc(as(OTHER), followPath(OWNER, OTHER))));
    await assertSucceeds(deleteDoc(doc(as(OWNER), followPath(OWNER, OTHER))));
  });
});

describe('public ratings listing', () => {
  it('lets signed-in users list a profile’s public ratings, newest first', async () => {
    await seed(`public/${OWNER}/ratings/${BOOK}`, { ...publicCopy(), ratedAt: Timestamp.now() });
    await assertSucceeds(
      getDocs(query(collection(as(OTHER), `public/${OWNER}/ratings`), orderBy('ratedAt', 'desc'), limit(20))),
    );
    await assertFails(getDocs(collection(anonymous(), `public/${OWNER}/ratings`)));
  });
});

describe('moderation by admins', () => {
  const ADMIN = 'admin-uid';
  const followPath = `follows/${OTHER}_${OWNER}`;

  beforeEach(async () => {
    await seed(`admins/${ADMIN}`, { createdAt: Timestamp.now() });
    await seed('usernames/owner', { uid: OWNER, createdAt: Timestamp.now() });
    await seed(`public/${OWNER}`, { username: 'owner', displayName: 'Owner', photoURL: null });
    await seed(publicRatingPath(), { ...publicCopy(), ratedAt: Timestamp.now() });
    await seed(followPath, { followerUid: OTHER, followedUid: OWNER, createdAt: Timestamp.now() });
    await seed(`users/${OWNER}`, { ...userDoc(), createdAt: Timestamp.now() });
    await seed(bookPath(), storedBook({ rating: 4.5, ratingPublic: true }));
    await seed(`users/${OWNER}/books/${BOOK}/private/review`, { text: 'Only for me', updatedAt: Timestamp.now() });
  });

  it('lets an admin remove public ratings, follows, public profiles and usernames', async () => {
    const db = as(ADMIN);
    await assertSucceeds(getDocs(collection(db, `public/${OWNER}/ratings`)));
    await assertSucceeds(deleteDoc(doc(db, publicRatingPath())));
    await assertSucceeds(deleteDoc(doc(db, followPath)));
    await assertSucceeds(deleteDoc(doc(db, `public/${OWNER}`)));
    await assertSucceeds(deleteDoc(doc(db, 'usernames/owner')));
  });

  it('never lets anyone else remove them', async () => {
    const db = as(OTHER);
    await assertFails(deleteDoc(doc(db, publicRatingPath())));
    await assertFails(deleteDoc(doc(as(OWNER), followPath)));
    await assertFails(deleteDoc(doc(db, `public/${OWNER}`)));
    await assertFails(deleteDoc(doc(db, 'usernames/owner')));
  });

  it('never gives an admin access to private data or edits of public data', async () => {
    const db = as(ADMIN);
    await assertFails(getDoc(doc(db, `users/${OWNER}`)));
    await assertFails(getDoc(doc(db, bookPath())));
    await assertFails(getDoc(doc(db, `users/${OWNER}/books/${BOOK}/private/review`)));
    await assertFails(getDocs(collection(db, `users/${OWNER}/books`)));
    await assertFails(updateDoc(doc(db, bookPath()), { ratingPublic: false }));
    await assertFails(updateDoc(doc(db, `public/${OWNER}`), { displayName: 'Edited' }));
    await assertFails(setDoc(doc(db, publicRatingPath()), publicCopy({ rating: 1 })));
    await assertFails(getDocs(collection(db, 'public')));
    await assertFails(getDocs(collection(db, 'usernames')));
  });

  it('keeps a removed username blocked, while the owner can choose a new one', async () => {
    await deleteDoc(doc(as(ADMIN), `public/${OWNER}`));
    const claim = (username: string) => {
      const db = as(OWNER);
      const batch = writeBatch(db);
      batch.set(doc(db, `usernames/${username}`), { uid: OWNER, createdAt: serverTimestamp() });
      batch.set(doc(db, `public/${OWNER}`), { username, displayName: 'Owner', photoURL: null });
      return batch.commit();
    };
    await assertFails(claim('owner'));
    await assertSucceeds(claim('owner_2'));
  });
});

describe('everything else', () => {
  it('is closed by default', async () => {
    await assertFails(setDoc(doc(as(OWNER), 'anything/else'), { a: 1 }));
    await assertFails(getDoc(doc(as(OWNER), 'anything/else')));
  });
});
