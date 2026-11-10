import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from './AppRoutes';

/** Both navs are in the DOM (CSS hides one per breakpoint); jsdom applies no media queries. */
function mainNavs() {
  return screen.getAllByRole('navigation', { name: 'Main' });
}

describe('AppRoutes', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders the shell and Home at /', async () => {
    renderWithProviders(<AppRoutes />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bestreads home' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language: English' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile and settings' })).toBeInTheDocument();
    expect(mainNavs()).toHaveLength(2);
  });

  it.each([
    ['/shelves', 'Shelves'],
    ['/friends', 'Friends'],
    ['/year', 'My Year'],
    ['/settings', 'Settings'],
    ['/book/abc123', 'Book not found'],
    ['/search', 'Search'],
  ])('renders %s', async (route, title) => {
    renderWithProviders(<AppRoutes />, { route });
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('shows a not found page for unknown routes', async () => {
    renderWithProviders(<AppRoutes />, { route: '/nope' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toBeInTheDocument();
  });

  it('navigates with the main menu and marks the current item', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    const [firstNav] = mainNavs();
    if (!firstNav) throw new Error('main navigation not rendered');
    await user.click(within(firstNav).getByRole('link', { name: 'Shelves' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Shelves' })).toBeInTheDocument();
    for (const nav of mainNavs()) {
      expect(within(nav).getByRole('link', { name: 'Shelves' })).toHaveAttribute('aria-current', 'page');
      expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    }
  });

  it('focuses the search with "/" and opens results on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.keyboard('/');
    const input = screen.getByRole('combobox', { name: 'Search books' });
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');

    await user.keyboard('  Project   Hail Mary {Enter}');
    expect(await screen.findByRole('heading', { level: 1, name: 'Results for “Project Hail Mary”' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search books' })).toHaveValue('Project Hail Mary');
  });

  it('does not navigate for a blank search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.type(screen.getByRole('combobox', { name: 'Search books' }), '   {Enter}');
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });

  it('opens settings from the profile button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.click(screen.getByRole('link', { name: 'Profile and settings' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });

  it('moves focus to the main content with the skip link', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />);
    await screen.findByRole('heading', { level: 1, name: 'Home' });

    await user.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('sends a signed-out visitor to login and back to the requested page after signing in', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: '/shelves', user: null });

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Language: English' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Shelves' })).toBeInTheDocument();
  });

  it('returns to the login screen after signing out', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: '/settings' });

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the shell in Brazilian Portuguese', async () => {
    renderWithProviders(<AppRoutes />, { language: 'pt-BR' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument();
    const [nav] = screen.getAllByRole('navigation', { name: 'Principal' });
    if (!nav) throw new Error('main navigation not rendered');
    expect(within(nav).getByRole('link', { name: 'Estantes' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Buscar livros' })).toBeInTheDocument();
  });
});
