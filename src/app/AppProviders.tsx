import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { i18n } from 'i18next';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { PreferencesSync } from '@/features/account';
import { AuthProvider } from '@/features/auth';
import { LibraryContextProvider } from '@/features/books';
import { ThemeProvider } from '@/features/preferences';
import { CatalogContextProvider } from '@/features/catalog';
import type { AppServices } from './services';

export interface AppProvidersProps {
  i18n: i18n;
  queryClient: QueryClient;
  services: AppServices;
  children: ReactNode;
}

/** Every app-wide provider, in one place. Used by `main.tsx` and by integration tests. */
export function AppProviders({ i18n, queryClient, services, children }: AppProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider loadService={services.loadAuthService}>
            <PreferencesSync loadRepository={services.loadUserRepository} />
            <CatalogContextProvider provider={services.catalog}>
              <LibraryContextProvider loadRepository={services.loadLibraryRepository}>{children}</LibraryContextProvider>
            </CatalogContextProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
