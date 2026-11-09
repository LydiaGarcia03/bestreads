import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { STORAGE_KEYS } from '../storage';
import { ThemeSelector } from './ThemeSelector';

describe('ThemeSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('shows the three options with System selected by default', () => {
    renderWithProviders(<ThemeSelector />);

    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
  });

  it('applies and saves the chosen theme', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeSelector />);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });

  it('is translated', () => {
    renderWithProviders(<ThemeSelector />, { language: 'pt-BR' });
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeInTheDocument();
  });
});
