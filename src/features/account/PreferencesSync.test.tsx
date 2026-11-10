import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSelect, ThemeSelector } from '@/features/preferences';
import { FakeUserRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';

/** `PreferencesSync` is mounted by `AppProviders`; these controls change the local preferences. */
function PreferenceControls() {
  return (
    <>
      <ThemeSelector />
      <LanguageSelect />
    </>
  );
}

describe('PreferencesSync', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('creates the user document from the local preferences on first login', async () => {
    window.localStorage.setItem('bestreads.theme', 'dark');
    const userRepository = new FakeUserRepository(null);

    renderWithProviders(<PreferenceControls />, { language: 'pt-BR', userRepository });

    await waitFor(() =>
      expect(userRepository.ensureUser).toHaveBeenCalledWith(TEST_USER, { theme: 'dark', language: 'pt-BR' }),
    );
    expect(userRepository.savePreferences).not.toHaveBeenCalled();
  });

  it('applies the stored preferences on login', async () => {
    const userRepository = new FakeUserRepository({ theme: 'light', language: 'pt-BR' });

    const { i18n } = renderWithProviders(<PreferenceControls />, { userRepository });

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(i18n.language).toBe('pt-BR');
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(window.localStorage.getItem('bestreads.theme')).toBe('light');
    expect(window.localStorage.getItem('bestreads.language')).toBe('pt-BR');
    expect(userRepository.savePreferences).not.toHaveBeenCalled();
  });

  it('saves later changes to the user document', async () => {
    const user = userEvent.setup();
    const userRepository = new FakeUserRepository({ theme: 'light', language: 'en' });
    renderWithProviders(<PreferenceControls />, { userRepository });
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked());

    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    await waitFor(() => expect(userRepository.savePreferences).toHaveBeenCalledWith(TEST_USER.uid, { theme: 'dark' }));

    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Português (Brasil)' }));
    await waitFor(() =>
      expect(userRepository.savePreferences).toHaveBeenLastCalledWith(TEST_USER.uid, { language: 'pt-BR' }),
    );
    expect(userRepository.stored).toEqual({ theme: 'dark', language: 'pt-BR' });
  });

  it('does nothing for a signed-out visitor', async () => {
    const user = userEvent.setup();
    const userRepository = new FakeUserRepository({ theme: 'light', language: 'en' });
    renderWithProviders(<PreferenceControls />, { user: null, userRepository });

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(userRepository.ensureUser).not.toHaveBeenCalled();
    expect(userRepository.savePreferences).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps the local preferences when the sync fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.localStorage.setItem('bestreads.theme', 'dark');
    const userRepository = new FakeUserRepository({ theme: 'light', language: 'en' });
    userRepository.ensureUser.mockRejectedValueOnce(new Error('permission-denied'));

    renderWithProviders(<PreferenceControls />, { userRepository });

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    consoleError.mockRestore();
  });
});
