import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/features/preferences';
import { AuthActionsContext, AuthStateContext, type AuthState } from './AuthContext';
import type { AuthService } from './types';

const LOADING: AuthState = { status: 'loading', user: null };
const SIGNED_OUT: AuthState = { status: 'signedOut', user: null };
const UNAVAILABLE: AuthState = { status: 'unavailable', user: null };

export interface AuthProviderProps {
  /** Loads the auth backend. Must keep the same identity across renders. */
  loadService: () => Promise<AuthService>;
  children: ReactNode;
}

export function AuthProvider({ loadService, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(LOADING);
  const [service, setService] = useState<AuthService | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    loadService().then(
      (loaded) => {
        if (!isActive) return;
        setService(loaded);
        unsubscribe = loaded.subscribe((user) => setState(user ? { status: 'signedIn', user } : SIGNED_OUT));
      },
      (error: unknown) => {
        if (!isActive) return;
        console.error('Auth service failed to load', error);
        setState(UNAVAILABLE);
      },
    );

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [loadService]);

  useEffect(() => {
    service?.setLanguage(language);
  }, [service, language]);

  return (
    <AuthActionsContext.Provider value={service}>
      <AuthStateContext.Provider value={state}>{children}</AuthStateContext.Provider>
    </AuthActionsContext.Provider>
  );
}
