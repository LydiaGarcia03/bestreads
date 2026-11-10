import type { DocumentSnapshot, Firestore, Transaction } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import { createFirestoreSocialRepository } from './firestoreSocialRepository';
import { FOLLOW_LIST_LIMIT } from './follows';
import { UsernameAlreadySetError, UsernameTakenError } from './types';

vi.mock('firebase/firestore', () => {
  class Timestamp {
    constructor(readonly millis: number) {}
    static fromDate(date: Date) {
      return new Timestamp(date.getTime());
    }
    toDate() {
      return new Date(this.millis);
    }
  }
  return {
    Timestamp,
    getFirestore: vi.fn(),
    doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
    collection: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getCountFromServer: vi.fn(),
    query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints })),
    where: vi.fn((...args: unknown[]) => ({ where: args })),
    orderBy: vi.fn((...args: unknown[]) => ({ orderBy: args })),
    startAfter: vi.fn((...args: unknown[]) => ({ startAfter: args })),
    limit: vi.fn((count: number) => ({ limit: count })),
    documentId: vi.fn(() => '__name__'),
    runTransaction: vi.fn(),
    writeBatch: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  };
});

const mocked = vi.mocked(firestore);
const db = {} as Firestore;
const DETAILS = { displayName: 'Ana', photoURL: null };

function snapshot(data: Record<string, unknown> | undefined) {
  return { exists: () => data !== undefined, data: () => data } as unknown as DocumentSnapshot;
}

/** Runs the transaction callback against `existing` documents (by path) and records its writes. */
function fakeTransaction(existing: Record<string, Record<string, unknown>>) {
  const set = vi.fn();
  const transaction = {
    get: vi.fn(async (ref: { path: string }) => snapshot(existing[ref.path])),
    set,
  } as unknown as Transaction;
  mocked.runTransaction.mockImplementation(async (_db, update) => update(transaction));
  return { set };
}

describe('createFirestoreSocialRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads a public profile, or null when there is none', async () => {
    const repository = createFirestoreSocialRepository(db);

    mocked.getDoc.mockResolvedValueOnce(snapshot({ username: 'ana', displayName: 'Ana', photoURL: null }));
    expect(await repository.getPublicProfile('u1')).toEqual({ uid: 'u1', username: 'ana', ...DETAILS });
    expect(mocked.doc).toHaveBeenCalledWith(db, 'public', 'u1');

    mocked.getDoc.mockResolvedValueOnce(snapshot(undefined));
    expect(await repository.getPublicProfile('u2')).toBeNull();
  });

  it('claims a free username together with the public profile', async () => {
    const { set } = fakeTransaction({});

    const profile = await createFirestoreSocialRepository(db).claimUsername('u1', 'ana', DETAILS);

    expect(profile).toEqual({ uid: 'u1', username: 'ana', ...DETAILS });
    expect(set).toHaveBeenCalledWith({ path: 'usernames/ana' }, { uid: 'u1', createdAt: 'SERVER_TIMESTAMP' });
    expect(set).toHaveBeenCalledWith({ path: 'public/u1' }, { username: 'ana', ...DETAILS });
  });

  it('refuses a taken username without writing', async () => {
    const { set } = fakeTransaction({ 'usernames/ana': { uid: 'someone-else' } });

    await expect(createFirestoreSocialRepository(db).claimUsername('u1', 'ana', DETAILS)).rejects.toBeInstanceOf(
      UsernameTakenError,
    );
    expect(set).not.toHaveBeenCalled();
  });

  it('finds a profile by username, or null when nobody has it', async () => {
    const repository = createFirestoreSocialRepository(db);

    mocked.getDoc
      .mockResolvedValueOnce(snapshot({ uid: 'u1' }))
      .mockResolvedValueOnce(snapshot({ username: 'ana', displayName: 'Ana', photoURL: null }));
    expect(await repository.findProfileByUsername('ana')).toEqual({ uid: 'u1', username: 'ana', ...DETAILS });
    expect(mocked.doc).toHaveBeenCalledWith(db, 'usernames', 'ana');

    mocked.getDoc.mockResolvedValueOnce(snapshot(undefined));
    expect(await repository.findProfileByUsername('nobody')).toBeNull();
  });

  it('lists public ratings newest first and continues after a cursor', async () => {
    const ratedAt = new firestore.Timestamp(1_700_000_000_000, 0);
    const docs = ['b1', 'b2'].map((id) => ({
      id,
      data: () => ({ title: `Book ${id}`, authors: ['A'], coverUrl: null, rating: 4, ratedAt }),
    }));
    mocked.getDocs.mockResolvedValue({ docs } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);
    const repository = createFirestoreSocialRepository(db);

    const page = await repository.listPublicRatings('u1', { pageSize: 2, after: null });

    expect(mocked.collection).toHaveBeenCalledWith(db, 'public', 'u1', 'ratings');
    expect(mocked.orderBy).toHaveBeenCalledWith('ratedAt', 'desc');
    expect(mocked.startAfter).not.toHaveBeenCalled();
    expect(page.ratings.map((rating) => rating.bookId)).toEqual(['b1', 'b2']);
    expect(page.ratings[0]?.ratedAt).toEqual(ratedAt.toDate());
    expect(page.next).toEqual({ bookId: 'b2', ratedAt: ratedAt.toDate() });

    await repository.listPublicRatings('u1', { pageSize: 5, after: page.next });
    expect(mocked.startAfter).toHaveBeenCalledWith(expect.objectContaining({ millis: 1_700_000_000_000 }), 'b2');
  });

  it('follows, unfollows and checks one follow document per pair', async () => {
    const repository = createFirestoreSocialRepository(db);

    await repository.follow('u1', 'u2');
    expect(mocked.setDoc).toHaveBeenCalledWith(
      { path: 'follows/u1_u2' },
      { followerUid: 'u1', followedUid: 'u2', createdAt: 'SERVER_TIMESTAMP' },
    );

    await repository.unfollow('u1', 'u2');
    expect(mocked.deleteDoc).toHaveBeenCalledWith({ path: 'follows/u1_u2' });

    mocked.getDoc.mockResolvedValueOnce(snapshot({ followerUid: 'u1' }));
    expect(await repository.isFollowing('u1', 'u2')).toBe(true);
  });

  it('counts followers and following', async () => {
    const count = (value: number) => ({ data: () => ({ count: value }) });
    mocked.getCountFromServer
      .mockResolvedValueOnce(count(3) as unknown as Awaited<ReturnType<typeof firestore.getCountFromServer>>)
      .mockResolvedValueOnce(count(5) as unknown as Awaited<ReturnType<typeof firestore.getCountFromServer>>);

    expect(await createFirestoreSocialRepository(db).countFollows('u1')).toEqual({ followers: 3, following: 5 });
    expect(mocked.where).toHaveBeenCalledWith('followedUid', '==', 'u1');
    expect(mocked.where).toHaveBeenCalledWith('followerUid', '==', 'u1');
  });

  it('lists the profiles someone follows, skipping removed profiles', async () => {
    const follows = ['u2', 'gone'].map((followedUid) => ({ data: () => ({ followerUid: 'u1', followedUid }) }));
    mocked.getDocs.mockResolvedValueOnce({ docs: follows } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);
    mocked.getDoc
      .mockResolvedValueOnce(snapshot({ username: 'ana', displayName: 'Ana', photoURL: null }))
      .mockResolvedValueOnce(snapshot(undefined));

    expect(await createFirestoreSocialRepository(db).listFollowing('u1')).toEqual([
      { uid: 'u2', username: 'ana', ...DETAILS },
    ]);
    expect(mocked.where).toHaveBeenCalledWith('followerUid', '==', 'u1');
    expect(mocked.limit).toHaveBeenCalledWith(FOLLOW_LIST_LIMIT);
  });

  it('lists the profiles following someone', async () => {
    const follows = [{ data: () => ({ followerUid: 'u3', followedUid: 'u1' }) }];
    mocked.getDocs.mockResolvedValueOnce({ docs: follows } as unknown as Awaited<ReturnType<typeof firestore.getDocs>>);
    mocked.getDoc.mockResolvedValueOnce(snapshot({ username: 'rafa', displayName: null, photoURL: null }));

    expect(await createFirestoreSocialRepository(db).listFollowers('u1')).toEqual([
      { uid: 'u3', username: 'rafa', displayName: null, photoURL: null },
    ]);
    expect(mocked.where).toHaveBeenCalledWith('followedUid', '==', 'u1');
    expect(mocked.doc).toHaveBeenCalledWith(db, 'public', 'u3');
  });

  it('checks the admin marker', async () => {
    mocked.getDoc.mockResolvedValueOnce(snapshot({ createdAt: 'then' })).mockResolvedValueOnce(snapshot(undefined));
    const repository = createFirestoreSocialRepository(db);

    expect(await repository.isAdmin('u1')).toBe(true);
    expect(mocked.doc).toHaveBeenCalledWith(db, 'admins', 'u1');
    expect(await repository.isAdmin('u2')).toBe(false);
  });

  it('removes one public rating', async () => {
    await createFirestoreSocialRepository(db).removePublicRating('u1', 'b1');
    expect(mocked.deleteDoc).toHaveBeenCalledWith({ path: 'public/u1/ratings/b1' });
  });

  it('removes a profile after its ratings and follows, in chunks', async () => {
    const batchDelete = vi.fn();
    const commit = vi.fn(async () => {});
    mocked.writeBatch.mockReturnValue({ delete: batchDelete, commit } as unknown as firestore.WriteBatch);
    const docs = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, index) => ({ ref: { path: `${prefix}/${index}` } }));
    const result = (items: { ref: { path: string } }[]) =>
      ({ docs: items, empty: items.length === 0, size: items.length }) as unknown as Awaited<
        ReturnType<typeof firestore.getDocs>
      >;
    mocked.getDocs
      .mockResolvedValueOnce(result(docs(400, 'ratings'))) // a full chunk: ask again
      .mockResolvedValueOnce(result(docs(3, 'ratings')))
      .mockResolvedValueOnce(result(docs(2, 'followers')))
      .mockResolvedValueOnce(result([]));

    await createFirestoreSocialRepository(db).removePublicProfile('u1');

    expect(mocked.collection).toHaveBeenCalledWith(db, 'public', 'u1', 'ratings');
    expect(mocked.where).toHaveBeenCalledWith('followedUid', '==', 'u1');
    expect(mocked.where).toHaveBeenCalledWith('followerUid', '==', 'u1');
    expect(batchDelete).toHaveBeenCalledTimes(405);
    expect(commit).toHaveBeenCalledTimes(3);
    expect(mocked.deleteDoc).toHaveBeenCalledWith({ path: 'public/u1' });
    expect(mocked.deleteDoc.mock.invocationCallOrder[0]).toBeGreaterThan(Math.max(...commit.mock.invocationCallOrder));
  });

  it('refuses a second username without writing', async () => {
    const { set } = fakeTransaction({ 'public/u1': { username: 'first' } });

    await expect(createFirestoreSocialRepository(db).claimUsername('u1', 'second', DETAILS)).rejects.toBeInstanceOf(
      UsernameAlreadySetError,
    );
    expect(set).not.toHaveBeenCalled();
  });
});
