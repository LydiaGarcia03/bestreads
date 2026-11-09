/** Auth error domain: maps provider error codes to the few cases the UI explains. Pure, no I/O. */

export type AuthErrorKind =
  | 'invalidCredentials'
  | 'emailInUse'
  | 'weakPassword'
  | 'invalidEmail'
  | 'tooManyRequests'
  | 'network'
  | 'popupBlocked'
  | 'accountDisabled'
  | 'unknown'
  /** The user closed the sign-in popup: not an error worth showing. */
  | 'cancelled';

/** Kinds that have a user-facing message. */
export type VisibleAuthErrorKind = Exclude<AuthErrorKind, 'cancelled'>;

const KIND_BY_CODE: Readonly<Record<string, AuthErrorKind>> = {
  'auth/invalid-credential': 'invalidCredentials',
  'auth/invalid-login-credentials': 'invalidCredentials',
  'auth/wrong-password': 'invalidCredentials',
  'auth/user-not-found': 'invalidCredentials',
  'auth/missing-password': 'invalidCredentials',
  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/password-does-not-meet-requirements': 'weakPassword',
  'auth/invalid-email': 'invalidEmail',
  'auth/missing-email': 'invalidEmail',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/popup-blocked': 'popupBlocked',
  'auth/user-disabled': 'accountDisabled',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
  'auth/user-cancelled': 'cancelled',
};

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind, options?: ErrorOptions) {
    super(`Auth error: ${kind}`, options);
    this.name = 'AuthError';
    this.kind = kind;
  }
}

export function authErrorKindFromCode(code: unknown): AuthErrorKind {
  if (typeof code !== 'string') return 'unknown';
  return KIND_BY_CODE[code] ?? 'unknown';
}

/** Reads the `code` of a provider error, if it has one. */
export function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

/** Normalizes anything thrown by the auth backend into an `AuthError`. */
export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  return new AuthError(authErrorKindFromCode(errorCode(error)), { cause: error });
}

export function isVisibleAuthError(kind: AuthErrorKind): kind is VisibleAuthErrorKind {
  return kind !== 'cancelled';
}
