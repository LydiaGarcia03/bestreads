import { createContext, useContext } from 'react';
import type { AuthActions, AuthUser } from './types';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: AuthUser }
  /** The auth backend could not be loaded (offline on first visit, missing config). */
  | { status: 'unavailable'; user: null };

export type AuthStatus = AuthState['status'];

export const AuthStateContext = createContext<AuthState | null>(null);
/** Split from the state so components that only act (forms, sign out) don't re-render on auth changes. */
export const AuthActionsContext = createContext<AuthActions | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthStateContext);
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>');
  return state;
}

/** Auth actions; available once the auth state is known (`signedIn` or `signedOut`). */
export function useAuthActions(): AuthActions {
  const actions = useContext(AuthActionsContext);
  if (!actions) throw new Error('useAuthActions needs a loaded auth service inside <AuthProvider>');
  return actions;
}
