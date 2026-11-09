import { AuthError, authErrorKindFromCode, errorCode, isVisibleAuthError, toAuthError } from './authErrors';

describe('authErrorKindFromCode', () => {
  it.each([
    ['auth/invalid-credential', 'invalidCredentials'],
    ['auth/wrong-password', 'invalidCredentials'],
    ['auth/user-not-found', 'invalidCredentials'],
    ['auth/email-already-in-use', 'emailInUse'],
    ['auth/weak-password', 'weakPassword'],
    ['auth/invalid-email', 'invalidEmail'],
    ['auth/too-many-requests', 'tooManyRequests'],
    ['auth/network-request-failed', 'network'],
    ['auth/popup-blocked', 'popupBlocked'],
    ['auth/user-disabled', 'accountDisabled'],
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/cancelled-popup-request', 'cancelled'],
  ])('maps %s to %s', (code, kind) => {
    expect(authErrorKindFromCode(code)).toBe(kind);
  });

  it('falls back to unknown', () => {
    expect(authErrorKindFromCode('auth/something-new')).toBe('unknown');
    expect(authErrorKindFromCode(undefined)).toBe('unknown');
    expect(authErrorKindFromCode(42)).toBe('unknown');
  });
});

describe('errorCode', () => {
  it('reads a string code', () => {
    expect(errorCode({ code: 'auth/popup-blocked' })).toBe('auth/popup-blocked');
  });

  it('ignores values without a string code', () => {
    expect(errorCode(new Error('boom'))).toBeUndefined();
    expect(errorCode({ code: 1 })).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode('auth/popup-blocked')).toBeUndefined();
  });
});

describe('toAuthError', () => {
  it('wraps a provider error and keeps it as the cause', () => {
    const original = { code: 'auth/weak-password' };
    const error = toAuthError(original);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.kind).toBe('weakPassword');
    expect(error.cause).toBe(original);
  });

  it('returns an AuthError unchanged', () => {
    const error = new AuthError('network');
    expect(toAuthError(error)).toBe(error);
  });
});

describe('isVisibleAuthError', () => {
  it('hides only cancelled popups', () => {
    expect(isVisibleAuthError('cancelled')).toBe(false);
    expect(isVisibleAuthError('unknown')).toBe(true);
  });
});
