import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { STORAGE_KEYS } from '../storage';
import { LanguageSelect } from './LanguageSelect';

describe('LanguageSelect', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows the current language with both options', () => {
    renderWithProviders(<LanguageSelect />);
    const select = screen.getByRole('combobox', { name: 'Language' });

    expect(select).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'PT-BR' })).toBeInTheDocument();
  });

  it('switches the UI language, saves it and updates <html lang>', async () => {
    const user = userEvent.setup();
    const { i18n } = renderWithProviders(<LanguageSelect />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'pt-BR');

    expect(i18n.language).toBe('pt-BR');
    expect(screen.getByRole('combobox', { name: 'Idioma' })).toHaveValue('pt-BR');
    expect(window.localStorage.getItem(STORAGE_KEYS.language)).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });
});
