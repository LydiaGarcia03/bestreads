import type { Auth, User } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { AuthError } from './authErrors';
import { createFirebaseAuthService } from './firebaseAuthService';
import type { AuthUser } from './types';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
}));

const mocked = vi.mocked(firebaseAuth);

function firebaseUser(overrides: Partial<User> = {}): User {
  return { uid: 'u1', displayName: null, email: 'a@b.co', photoURL: null, ...overrides } as User;
}

/** Creates the service and returns a function that simulates Firebase auth state changes. */
function setup() {
  const auth = { languageCode: null } as unknown as Auth;
  let emitAuthState: (user: User | null) => void = () => undefined;
  mocked.onAuthStateChanged.mockImplementation((_auth, next) => {
    emitAuthState = next as (user: User | null) => void;
    return () => undefined;
  });
  const service = createFirebaseAuthService(auth);
  return { auth, service, emitAuthState: (user: User | null) => emitAuthState(user) };
}

describe('createFirebaseAuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('notifies subscribers once the auth state is known, and late subscribers immediately', () => {
    const { service, emitAuthState } = setup();
    const early = vi.fn();
    service.subscribe(early);
    expect(early).not.toHaveBeenCalled();

    emitAuthState(firebaseUser({ displayName: 'Ana' }));
    const expected: AuthUser = { uid: 'u1', displayName: 'Ana', email: 'a@b.co', photoURL: null };
    expect(early).toHaveBeenCalledWith(expected);

    const late = vi.fn();
    service.subscribe(late);
    expect(late).toHaveBeenCalledWith(expected);
  });

  it('stops notifying after unsubscribe', () => {
    const { service, emitAuthState } = setup();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);
    unsubscribe();
    emitAuthState(null);
    expect(listener).not.toHaveBeenCalled();
  });

  it('sets the provider language', () => {
    const { auth, service } = setup();
    service.setLanguage('pt-BR');
    expect(auth.languageCode).toBe('pt-BR');
  });

  it('signs in with a Google popup', async () => {
    const { service } = setup();
    mocked.signInWithPopup.mockResolvedValue({} as firebaseAuth.UserCredential);
    await service.signInWithGoogle();
    expect(mocked.signInWithPopup).toHaveBeenCalledOnce();
    expect(mocked.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('falls back to a redirect when the popup is blocked', async () => {
    const { service } = setup();
    mocked.signInWithPopup.mockRejectedValue({ code: 'auth/popup-blocked' });
    await service.signInWithGoogle();
    expect(mocked.signInWithRedirect).toHaveBeenCalledOnce();
  });

  it('reports a closed popup as cancelled, without redirecting', async () => {
    const { service } = setup();
    mocked.signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    await expect(service.signInWithGoogle()).rejects.toMatchObject({ kind: 'cancelled' });
    expect(mocked.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('signs in with trimmed email and maps wrong credentials', async () => {
    const { auth, service } = setup();
    mocked.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });

    const result = service.signInWithEmail({ email: ' a@b.co ', password: 'secret1' });

    await expect(result).rejects.toBeInstanceOf(AuthError);
    await expect(result).rejects.toMatchObject({ kind: 'invalidCredentials' });
    expect(mocked.signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'a@b.co', 'secret1');
  });

  it('holds auth updates during sign-up until the display name is set', async () => {
    const { service, emitAuthState } = setup();
    emitAuthState(null);
    const listener = vi.fn();
    service.subscribe(listener);
    listener.mockClear();

    const created = firebaseUser();
    mocked.createUserWithEmailAndPassword.mockImplementation(async () => {
      emitAuthState(created);
      return { user: created } as firebaseAuth.UserCredential;
    });
    mocked.updateProfile.mockImplementation(async (user, profile) => {
      Object.assign(user, profile);
    });

    await service.signUpWithEmail({ email: 'a@b.co', password: 'secret1', displayName: ' Ana ' });

    expect(mocked.updateProfile).toHaveBeenCalledWith(created, { displayName: 'Ana' });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1', displayName: 'Ana' }));
  });

  it('maps sign-up errors and releases held updates', async () => {
    const { service, emitAuthState } = setup();
    emitAuthState(null);
    mocked.createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });

    await expect(
      service.signUpWithEmail({ email: 'a@b.co', password: 'secret1', displayName: 'Ana' }),
    ).rejects.toMatchObject({ kind: 'emailInUse' });

    const listener = vi.fn();
    service.subscribe(listener);
    emitAuthState(firebaseUser());
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ uid: 'u1' }));
  });

  it('sends a password reset email and signs out', async () => {
    const { auth, service } = setup();
    mocked.sendPasswordResetEmail.mockResolvedValue();
    mocked.signOut.mockResolvedValue();

    await service.sendPasswordReset(' a@b.co ');
    await service.signOut();

    expect(mocked.sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'a@b.co');
    expect(mocked.signOut).toHaveBeenCalledWith(auth);
  });
});
