import type { Firestore } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import { createTestBook, TEST_TODAY } from '@/test/fakes';
import { createFirestoreLibraryRepository } from './firestoreLibraryRepository';
import { newLibraryBookData } from './library';

vi.mock('firebase/firestore', () => {
  class Timestamp {
    constructor(private readonly date: Date) {}
    toDate() {
      return this.date;
    }
  }
  return {
    Timestamp,
    getFirestore: vi.fn(),
    collection: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
    doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints })),
    where: vi.fn((...args: unknown[]) => ({ where: args })),
    limit: vi.fn((count: number) => ({ limit: count })),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getCountFromServer: vi.fn(),
    arrayRemove: vi.fn((value: unknown) => ({ arrayRemove: value })),
    writeBatch: vi.fn(),
    runTransaction: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  };
});

const mocked = vi.mocked(firestore);
const db = {} as Firestore;
const UID = 'u1';

function snapshot(id: string, data: Record<string, unknown> | undefined) {
  return { id, exists: () => data !== undefined, data: () => data };
}

/** Runs the transaction callback against a fake transaction whose `get` returns `existing`. */
function mockTransaction(existing: Record<string, unknown> | undefined) {
  const transaction = { get: vi.fn(async () => snapshot('vol-1', existing)), set: vi.fn() };
  mocked.runTransaction.mockImplementation(async (_db, run) => run(transaction as never));
  return transaction;
}

/** A fake write batch that records its operations in order. */
function mockBatch() {
  const operations: unknown[][] = [];
  const batch = {
    set: vi.fn((ref: { path: string }, data: unknown) => operations.push(['set', ref.path, data])),
    update: vi.fn((ref: { path: string }, data: unknown) => operations.push(['update', ref.path, data])),
    delete: vi.fn((ref: { path: string }) => operations.push(['delete', ref.path])),
    commit: vi.fn(async () => undefined),
  };
  mocked.writeBatch.mockReturnValue(batch as never);
  return { batch, operations };
}

describe('createFirestoreLibraryRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads a book with timestamps as dates', async () => {
    const addedAt = new Date('2026-11-01T00:00:00Z');
    mocked.getDoc.mockResolvedValue(
      snapshot('vol-1', {
        ...newLibraryBookData(createTestBook(), 'reading', TEST_TODAY),
        addedAt: new firestore.Timestamp(addedAt as never, 0),
      }) as never,
    );

    const book = await createFirestoreLibraryRepository(db).getBook(UID, 'vol-1');

    expect(mocked.doc).toHaveBeenCalledWith(db, 'users', UID, 'books', 'vol-1');
    expect(book).toMatchObject({ id: 'vol-1', status: 'reading', addedAt });
  });

  it('returns null for a book that is not in the library', async () => {
    mocked.getDoc.mockResolvedValue(snapshot('vol-1', undefined) as never);
    expect(await createFirestoreLibraryRepository(db).getBook(UID, 'vol-1')).toBeNull();
  });

  it('adds a new book with server timestamps', async () => {
    const transaction = mockTransaction(undefined);

    const added = await createFirestoreLibraryRepository(db).addBook(UID, createTestBook(), 'wantToRead', TEST_TODAY);

    expect(transaction.set).toHaveBeenCalledWith(
      { path: `users/${UID}/books/vol-1` },
      {
        ...newLibraryBookData(createTestBook(), 'wantToRead', TEST_TODAY),
        addedAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      },
    );
    expect(added).toMatchObject({ id: 'vol-1', status: 'wantToRead' });
  });

  it('never overwrites a book that is already in the library', async () => {
    const transaction = mockTransaction({ ...newLibraryBookData(createTestBook(), 'read', TEST_TODAY), rating: 4 });

    const existing = await createFirestoreLibraryRepository(db).addBook(UID, createTestBook(), 'wantToRead', TEST_TODAY);

    expect(transaction.set).not.toHaveBeenCalled();
    expect(existing).toMatchObject({ status: 'read', rating: 4 });
  });

  it('updates only the changed fields and the update time', async () => {
    const reads = [{ startedOn: '2026-11-01', finishedOn: TEST_TODAY }];
    await createFirestoreLibraryRepository(db).updateBook(UID, 'vol-1', { status: 'read', reads });
    expect(mocked.updateDoc).toHaveBeenCalledWith(
      { path: `users/${UID}/books/vol-1` },
      { status: 'read', reads, updatedAt: 'SERVER_TIMESTAMP' },
    );
  });

  it('removes a book together with its private data and public rating copy', async () => {
    const { batch, operations } = mockBatch();

    await createFirestoreLibraryRepository(db).removeBook(UID, 'vol-1');

    expect(operations).toEqual([
      ['delete', `users/${UID}/books/vol-1/private/review`],
      ['delete', `users/${UID}/books/vol-1/private/cover`],
      ['delete', `public/${UID}/ratings/vol-1`],
      ['delete', `users/${UID}/books/vol-1`],
    ]);
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  describe('series', () => {
    it('lists the books of a series and the series names in use', async () => {
      const data = newLibraryBookData(createTestBook(), 'read', TEST_TODAY);
      mocked.getDocs.mockResolvedValue({
        docs: [snapshot('a', { ...data, series: { name: 'Dune', volume: 1 } }), snapshot('b', { ...data, series: null })],
      } as never);
      const repository = createFirestoreLibraryRepository(db);

      const books = await repository.listSeriesBooks(UID, 'Dune');
      expect(mocked.where).toHaveBeenLastCalledWith('series.name', '==', 'Dune');
      expect(books[0]?.series).toEqual({ name: 'Dune', volume: 1 });

      expect(await repository.listSeriesNames(UID)).toEqual(['Dune', '']);
      expect(mocked.where).toHaveBeenLastCalledWith('series', '!=', null);
    });
  });

  describe('personal cover', () => {
    const dataUrl = 'data:image/webp;base64,QUJD';

    it('reads the cover data URL', async () => {
      mocked.getDoc.mockResolvedValue(snapshot('cover', { dataUrl, updatedAt: null }) as never);
      expect(await createFirestoreLibraryRepository(db).getPersonalCover(UID, 'vol-1')).toBe(dataUrl);
      expect(mocked.doc).toHaveBeenLastCalledWith(db, 'users', UID, 'books', 'vol-1', 'private', 'cover');
    });

    it('saves the cover and flags the book in one batch, and removes both together', async () => {
      const { batch, operations } = mockBatch();
      const repository = createFirestoreLibraryRepository(db);

      await repository.savePersonalCover(UID, 'vol-1', dataUrl);
      await repository.savePersonalCover(UID, 'vol-1', null);

      expect(operations).toEqual([
        ['set', `users/${UID}/books/vol-1/private/cover`, { dataUrl, updatedAt: 'SERVER_TIMESTAMP' }],
        ['update', `users/${UID}/books/vol-1`, { hasPersonalCover: true, updatedAt: 'SERVER_TIMESTAMP' }],
        ['delete', `users/${UID}/books/vol-1/private/cover`],
        ['update', `users/${UID}/books/vol-1`, { hasPersonalCover: false, updatedAt: 'SERVER_TIMESTAMP' }],
      ]);
      expect(batch.commit).toHaveBeenCalledTimes(2);
    });
  });

  describe('review', () => {
    it('reads the review with its date', async () => {
      const updatedAt = new Date('2026-11-09T12:00:00Z');
      mocked.getDoc.mockResolvedValue(
        snapshot('review', { text: 'Loved it.', updatedAt: new firestore.Timestamp(updatedAt as never, 0) }) as never,
      );

      const review = await createFirestoreLibraryRepository(db).getReview(UID, 'vol-1');

      expect(mocked.doc).toHaveBeenLastCalledWith(db, 'users', UID, 'books', 'vol-1', 'private', 'review');
      expect(review).toEqual({ text: 'Loved it.', updatedAt });
    });

    it('is null when there is no review', async () => {
      mocked.getDoc.mockResolvedValue(snapshot('review', undefined) as never);
      expect(await createFirestoreLibraryRepository(db).getReview(UID, 'vol-1')).toBeNull();
    });

    it('saves a review, and deletes it when emptied', async () => {
      const repository = createFirestoreLibraryRepository(db);

      await repository.saveReview(UID, 'vol-1', 'Loved it.');
      expect(mocked.setDoc).toHaveBeenCalledWith(
        { path: `users/${UID}/books/vol-1/private/review` },
        { text: 'Loved it.', updatedAt: 'SERVER_TIMESTAMP' },
      );

      await repository.saveReview(UID, 'vol-1', '');
      expect(mocked.deleteDoc).toHaveBeenCalledWith({ path: `users/${UID}/books/vol-1/private/review` });
    });
  });

  describe('updateRating', () => {
    const book = { id: 'vol-1', ...newLibraryBookData(createTestBook(), 'read', TEST_TODAY), addedAt: null, updatedAt: null };

    it('saves a public rating and publishes the slim copy in the same batch', async () => {
      const { batch, operations } = mockBatch();

      await createFirestoreLibraryRepository(db).updateRating(UID, book, { rating: 3.75, ratingPublic: true });

      expect(operations).toEqual([
        ['update', `users/${UID}/books/vol-1`, { rating: 3.75, ratingPublic: true, updatedAt: 'SERVER_TIMESTAMP' }],
        [
          'set',
          `public/${UID}/ratings/vol-1`,
          {
            title: 'Project Hail Mary',
            authors: ['Andy Weir'],
            coverUrl: 'https://books.example/cover.jpg',
            rating: 3.75,
            ratedAt: 'SERVER_TIMESTAMP',
          },
        ],
      ]);
      expect(batch.commit).toHaveBeenCalledOnce();
    });

    it.each([
      ['private', { rating: 4, ratingPublic: false }],
      ['cleared', { rating: null, ratingPublic: true }],
    ])('deletes the public copy of a %s rating', async (_case, change) => {
      const { operations } = mockBatch();

      await createFirestoreLibraryRepository(db).updateRating(UID, book, change);

      expect(operations).toEqual([
        ['update', `users/${UID}/books/vol-1`, { ...change, updatedAt: 'SERVER_TIMESTAMP' }],
        ['delete', `public/${UID}/ratings/vol-1`],
      ]);
    });
  });

  it('lists books by status, most recently updated first', async () => {
    const older = { ...newLibraryBookData(createTestBook(), 'reading', TEST_TODAY), updatedAt: new firestore.Timestamp(new Date(1) as never, 0) };
    const newer = { ...older, updatedAt: new firestore.Timestamp(new Date(2) as never, 0) };
    mocked.getDocs.mockResolvedValue({ docs: [snapshot('a', older), snapshot('b', newer)] } as never);

    const books = await createFirestoreLibraryRepository(db).listBooks(UID, {
      filter: { kind: 'status', status: 'reading' },
      limit: 10,
    });

    expect(mocked.where).toHaveBeenCalledWith('status', '==', 'reading');
    expect(mocked.limit).toHaveBeenCalledWith(10);
    expect(books.map((book) => book.id)).toEqual(['b', 'a']);
  });

  it('lists and counts the books of a custom shelf', async () => {
    mocked.getDocs.mockResolvedValue({ docs: [] } as never);
    mocked.getCountFromServer.mockResolvedValue({ data: () => ({ count: 7 }) } as never);
    const repository = createFirestoreLibraryRepository(db);

    await repository.listBooks(UID, { filter: { kind: 'custom', shelfId: 's1' }, limit: 10 });
    expect(mocked.where).toHaveBeenLastCalledWith('shelfIds', 'array-contains', 's1');

    expect(await repository.countBooks(UID, { kind: 'status', status: 'read' })).toBe(7);
    expect(mocked.where).toHaveBeenLastCalledWith('status', '==', 'read');
  });

  describe('shelves', () => {
    it('lists shelves in order, reading missing fields safely', async () => {
      mocked.getDocs.mockResolvedValue({
        docs: [snapshot('b', { name: 'Later', order: 2 }), snapshot('a', { name: 'First', order: 1 }), snapshot('c', {})],
      } as never);

      const shelves = await createFirestoreLibraryRepository(db).listShelves(UID);

      expect(mocked.collection).toHaveBeenLastCalledWith(db, 'users', UID, 'shelves');
      expect(shelves).toEqual([
        { id: 'c', name: '', order: 0 },
        { id: 'a', name: 'First', order: 1 },
        { id: 'b', name: 'Later', order: 2 },
      ]);
    });

    it('creates a shelf with a server timestamp', async () => {
      mocked.addDoc.mockResolvedValue({ id: 'new-id' } as never);

      const shelf = await createFirestoreLibraryRepository(db).createShelf(UID, { name: 'Sci-fi', order: 3 });

      expect(mocked.addDoc).toHaveBeenCalledWith(
        { path: `users/${UID}/shelves` },
        { name: 'Sci-fi', order: 3, createdAt: 'SERVER_TIMESTAMP' },
      );
      expect(shelf).toEqual({ id: 'new-id', name: 'Sci-fi', order: 3 });
    });

    it('renames and reorders shelves', async () => {
      const { operations } = mockBatch();
      const repository = createFirestoreLibraryRepository(db);

      await repository.renameShelf(UID, 's1', 'Classics');
      expect(mocked.updateDoc).toHaveBeenCalledWith({ path: `users/${UID}/shelves/s1` }, { name: 'Classics' });

      await repository.reorderShelves(UID, [
        { id: 's1', order: 2 },
        { id: 's2', order: 1 },
      ]);
      expect(operations).toEqual([
        ['update', `users/${UID}/shelves/s1`, { order: 2 }],
        ['update', `users/${UID}/shelves/s2`, { order: 1 }],
      ]);
    });

    it('takes a deleted shelf off its books, then deletes it', async () => {
      const { operations } = mockBatch();
      mocked.getDocs.mockResolvedValue({
        docs: [{ ref: { path: `users/${UID}/books/b1` } }, { ref: { path: `users/${UID}/books/b2` } }],
      } as never);

      await createFirestoreLibraryRepository(db).deleteShelf(UID, 's1');

      expect(mocked.where).toHaveBeenLastCalledWith('shelfIds', 'array-contains', 's1');
      expect(operations).toEqual([
        ['update', `users/${UID}/books/b1`, { shelfIds: { arrayRemove: 's1' }, updatedAt: 'SERVER_TIMESTAMP' }],
        ['update', `users/${UID}/books/b2`, { shelfIds: { arrayRemove: 's1' }, updatedAt: 'SERVER_TIMESTAMP' }],
      ]);
      expect(mocked.deleteDoc).toHaveBeenCalledWith({ path: `users/${UID}/shelves/s1` });
    });
  });
});
