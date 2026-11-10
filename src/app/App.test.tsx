import { render, screen } from '@testing-library/react';
import { createI18n } from '@/shared/i18n';
import { createFakeServices, FakeAuthService, TEST_USER } from '@/test/fakes';
import { App } from './App';
import { AppProviders } from './AppProviders';
import { createQueryClient } from './queryClient';

function renderApp(authService: FakeAuthService) {
  render(
    <AppProviders
      i18n={createI18n('en')}
      queryClient={createQueryClient({ retry: false })}
      services={createFakeServices({ authService })}
    >
      <App />
    </AppProviders>,
  );
}

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('routes from the URL hash', async () => {
    window.location.hash = '#/shelves';
    renderApp(new FakeAuthService(TEST_USER));

    expect(await screen.findByRole('heading', { level: 1, name: 'Shelves' })).toBeInTheDocument();
  });

  it('sends a signed-out visitor to the login screen', async () => {
    window.location.hash = '#/shelves';
    renderApp(new FakeAuthService(null));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/login');
  });
});
