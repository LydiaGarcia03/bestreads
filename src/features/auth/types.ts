import type { Language } from '@/shared/i18n';

/** The signed-in user, independent of the auth provider. */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface EmailCredentials {
  email: string;
  password: string;
}

export interface SignUpDetails extends EmailCredentials {
  displayName: string;
}

/** What screens can do. Every method rejects with an `AuthError`. */
export interface AuthActions {
  signInWithGoogle(): Promise<void>;
  signInWithEmail(credentials: EmailCredentials): Promise<void>;
  signUpWithEmail(details: SignUpDetails): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Auth backend boundary. Implemented with Firebase Auth; faked in tests. */
export interface AuthService extends AuthActions {
  /** Calls `listener` with the current user once known, then on every change. Returns an unsubscribe function. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
  /** Language of provider screens and emails (Google popup, password reset). */
  setLanguage(language: Language): void;
}
