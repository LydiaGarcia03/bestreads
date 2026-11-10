import type { QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { i18n } from 'i18next';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { AppProviders } from '@/app/AppProviders';
import { createQueryClient } from '@/app/queryClient';
import type { AuthUser } from '@/features/auth';
import { createI18n, type Language } from '@/shared/i18n';
import {
  createFakeServices,
  FakeAuthService,
  FakeCatalog,
  FakeLibraryRepository,
  FakeUserRepository,
  TEST_USER,
} from './fakes';

type RouterEntry = NonNullable<MemoryRouterProps['initialEntries']>[number];

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** UI language for this render (a fresh i18n instance per test). Defaults to `en`. */
  language?: Language;
  /** Initial URL (or location with router state) for an in-memory router. Defaults to `/`. */
  route?: RouterEntry;
  /** Signed-in user, or `null` for a signed-out visitor. Defaults to `TEST_USER`. */
  user?: AuthUser | null;
  authService?: FakeAuthService;
  userRepository?: FakeUserRepository;
  catalog?: FakeCatalog;
  library?: FakeLibraryRepository;
}

export interface RenderWithProvidersResult extends RenderResult {
  i18n: i18n;
  queryClient: QueryClient;
  authService: FakeAuthService;
  userRepository: FakeUserRepository;
  catalog: FakeCatalog;
  library: FakeLibraryRepository;
}

/** Renders a UI inside the app's real providers, fake services and an in-memory router, isolated per test. */
export function renderWithProviders(
  ui: ReactElement,
  {
    language = 'en',
    route = '/',
    user = TEST_USER,
    authService = new FakeAuthService(user),
    userRepository = new FakeUserRepository(),
    catalog = new FakeCatalog(),
    library = new FakeLibraryRepository(),
    ...options
  }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const i18n = createI18n(language);
  // No retries, so failure states show up immediately.
  const queryClient = createQueryClient({ retry: false });
  const services = createFakeServices({ authService, userRepository, catalog, library });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders i18n={i18n} queryClient={queryClient} services={services}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </AppProviders>
  );
  return {
    ...render(ui, { wrapper, ...options }),
    i18n,
    queryClient,
    authService,
    userRepository,
    catalog,
    library,
  };
}
