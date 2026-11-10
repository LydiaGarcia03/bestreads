import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows appearance and language sections', () => {
    renderWithProviders(<SettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
  });

  it('shows the signed-in account and signs out', async () => {
    const user = userEvent.setup();
    const { authService } = renderWithProviders(<SettingsPage />);

    const account = screen.getByRole('region', { name: 'Account' });
    expect(await within(account).findByText('Test Reader')).toBeInTheDocument();
    expect(within(account).getByText('reader@example.com')).toBeInTheDocument();

    await user.click(within(account).getByRole('button', { name: 'Sign out' }));
    expect(authService.signOut).toHaveBeenCalledOnce();
  });

  it('switches the whole page language', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Português (Brasil)' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeInTheDocument();
  });
});
