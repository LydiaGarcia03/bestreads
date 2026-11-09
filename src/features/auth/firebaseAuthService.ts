import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirebaseApp } from '@/shared/firebase/app';
import { errorCode, toAuthError } from './authErrors';
import type { AuthService, AuthUser } from './types';

/** Popup errors where a full-page redirect still works (blocked popups, some in-app mobile browsers). */
const REDIRECT_FALLBACK_CODES: ReadonlySet<string> = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };
}

async function withAuthErrors(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Firebase Auth implementation of `AuthService`. Loaded on demand (see `services.ts`). */
export function createFirebaseAuthService(auth: Auth = getAuth(getFirebaseApp())): AuthService {
  const listeners = new Set<(user: AuthUser | null) => void>();
  let currentUser: AuthUser | null = null;
  let isReady = false;
  // Sign-up creates the account before its display name is set; hold updates until the profile is complete.
  let isHoldingUpdates = false;

  const notify = () => listeners.forEach((listener) => listener(currentUser));

  onAuthStateChanged(auth, (user) => {
    currentUser = user ? toAuthUser(user) : null;
    isReady = true;
    if (!isHoldingUpdates) notify();
  });

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (isReady) listener(currentUser);
      return () => {
        listeners.delete(listener);
      };
    },

    setLanguage(language) {
      auth.languageCode = language;
    },

    signInWithGoogle: () =>
      withAuthErrors(async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          await signInWithPopup(auth, provider);
        } catch (error) {
          const code = errorCode(error);
          if (code === undefined || !REDIRECT_FALLBACK_CODES.has(code)) throw error;
          await signInWithRedirect(auth, provider);
        }
      }),

    signInWithEmail: ({ email, password }) =>
      withAuthErrors(() => signInWithEmailAndPassword(auth, email.trim(), password)),

    signUpWithEmail: ({ email, password, displayName }) =>
      withAuthErrors(async () => {
        isHoldingUpdates = true;
        try {
          const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(user, { displayName: displayName.trim() });
          currentUser = toAuthUser(user);
        } finally {
          isHoldingUpdates = false;
          if (isReady) notify();
        }
      }),

    sendPasswordReset: (email) => withAuthErrors(() => sendPasswordResetEmail(auth, email.trim())),

    signOut: () => withAuthErrors(() => signOut(auth)),
  };
}
