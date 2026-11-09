import type { DocumentSnapshot, Firestore } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import type { AuthUser } from '@/features/auth';
import { createFirestoreUserRepository } from './firestoreUserRepository';
import type { UserPreferences } from './userDocument';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ path: `${collection}/${id}` })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

const mocked = vi.mocked(firestore);
const db = {} as Firestore;
const USER: AuthUser = { uid: 'u1', displayName: 'Ana', email: 'a@b.co', photoURL: null };
const LOCAL: UserPreferences = { theme: 'dark', language: 'pt-BR' };

function snapshot(data: Record<string, unknown> | undefined) {
  return { exists: () => data !== undefined, data: () => data } as unknown as DocumentSnapshot;
}

describe('createFirestoreUserRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates users/{uid} with the profile and local preferences on first login', async () => {
    mocked.getDoc.mockResolvedValue(snapshot(undefined));

    const stored = await createFirestoreUserRepository(db).ensureUser(USER, LOCAL);

    expect(stored).toEqual(LOCAL);
    expect(mocked.doc).toHaveBeenCalledWith(db, 'users', 'u1');
    expect(mocked.setDoc).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { displayName: 'Ana', photoURL: null, preferences: LOCAL, createdAt: 'SERVER_TIMESTAMP' },
    );
  });

  it('returns stored preferences without writing when the profile is unchanged', async () => {
    mocked.getDoc.mockResolvedValue(
      snapshot({ displayName: 'Ana', photoURL: null, preferences: { theme: 'light', language: 'en' } }),
    );

    const stored = await createFirestoreUserRepository(db).ensureUser(USER, LOCAL);

    expect(stored).toEqual({ theme: 'light', language: 'en' });
    expect(mocked.setDoc).not.toHaveBeenCalled();
    expect(mocked.updateDoc).not.toHaveBeenCalled();
  });

  it('updates only the profile fields that changed', async () => {
    mocked.getDoc.mockResolvedValue(
      snapshot({ displayName: null, photoURL: null, preferences: { theme: 'light', language: 'en' } }),
    );

    await createFirestoreUserRepository(db).ensureUser(USER, LOCAL);

    expect(mocked.updateDoc).toHaveBeenCalledWith({ path: 'users/u1' }, { displayName: 'Ana' });
  });

  it('saves preference changes as nested field updates', async () => {
    await createFirestoreUserRepository(db).savePreferences('u1', { theme: 'system' });

    expect(mocked.updateDoc).toHaveBeenCalledWith({ path: 'users/u1' }, { 'preferences.theme': 'system' });
  });

  it('propagates Firestore errors', async () => {
    mocked.getDoc.mockRejectedValue(new Error('permission-denied'));
    await expect(createFirestoreUserRepository(db).ensureUser(USER, LOCAL)).rejects.toThrow('permission-denied');
  });
});
