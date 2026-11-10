import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppProviders } from '@/app/AppProviders';
import { createQueryClient } from '@/app/queryClient';
import { createI18n } from '@/shared/i18n';
import { createFakeServices, FakeAuthService } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequireAuth } from './RequireAuth';

function LoginProbe() {
  const location = useLocation();
  return <p>Login, from {JSON.stringify(location.state)}</p>;
}

const routes = (
  <Routes>
    <Route path="/login" element={<LoginProbe />} />
    <Route element={<RequireAuth />}>
      <Route path="/shelves" element={<h1>Private shelves</h1>} />
    </Route>
  </Routes>
);

describe('RequireAuth', () => {
  it('renders private routes for a signed-in user', async () => {
    renderWithProviders(routes, { route: '/shelves' });
    expect(await screen.findByRole('heading', { name: 'Private shelves' })).toBeInTheDocument();
  });

  it('sends a signed-out visitor to login, remembering the path and query', async () => {
    renderWithProviders(routes, { route: '/shelves?filter=read', user: null });
    expect(await screen.findByText('Login, from {"from":"/shelves?filter=read"}')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Private shelves' })).not.toBeInTheDocument();
  });

  it('shows a reconnect message when the auth service cannot load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <AppProviders
        i18n={createI18n('en')}
        queryClient={createQueryClient({ retry: false })}
        services={{
          ...createFakeServices({ authService: new FakeAuthService(null) }),
          loadAuthService: () => Promise.reject(new Error('offline')),
        }}
      >
        <MemoryRouter initialEntries={['/shelves']}>{routes}</MemoryRouter>
      </AppProviders>,
    );

    expect(await screen.findByRole('heading', { name: "Can't connect right now" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
