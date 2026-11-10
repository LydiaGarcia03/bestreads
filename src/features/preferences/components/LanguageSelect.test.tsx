import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { STORAGE_KEYS } from '../storage';
import { LanguageSelect } from './LanguageSelect';

describe('LanguageSelect', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows the current language on a menu button', () => {
    renderWithProviders(<LanguageSelect />);
    const button = screen.getByRole('button', { name: 'Language: English' });

    expect(button).toHaveTextContent('EN');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('lists the languages in their own names, with the current one checked and focused', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSelect />);

    await user.click(screen.getByRole('button', { name: 'Language: English' }));

    const menu = screen.getByRole('menu', { name: 'Language' });
    const [english, portuguese] = within(menu).getAllByRole('menuitemradio');
    expect(english).toHaveTextContent('English');
    expect(english).toHaveAttribute('aria-checked', 'true');
    expect(english).toHaveFocus();
    expect(portuguese).toHaveTextContent('Português (Brasil)');
    expect(portuguese).toHaveAttribute('lang', 'pt-BR');
  });

  it('switches the UI language, saves it and updates <html lang>', async () => {
    const user = userEvent.setup();
    const { i18n } = renderWithProviders(<LanguageSelect />);

    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Português (Brasil)' }));

    expect(i18n.language).toBe('pt-BR');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: Português (Brasil)' })).toHaveFocus();
    expect(window.localStorage.getItem(STORAGE_KEYS.language)).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('works from the keyboard and closes with Escape', async () => {
    const user = userEvent.setup();
    const { i18n } = renderWithProviders(<LanguageSelect />);

    screen.getByRole('button', { name: 'Language: English' }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Português (Brasil)' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(i18n.language).toBe('en');
    expect(screen.getByRole('button', { name: 'Language: English' })).toHaveFocus();
  });

  it('closes on a click outside', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LanguageSelect />
        <p>Outside</p>
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    await user.click(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
