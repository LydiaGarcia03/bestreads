import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MyShelvesNav } from './MyShelvesNav';

function renderNav(route = '/') {
  const library = new FakeLibraryRepository(
    [
      createTestLibraryBook({ id: 'b1', status: 'read', shelfIds: ['fav'] }),
      createTestLibraryBook({ id: 'b2', status: 'read' }),
    ],
    [{ id: 'fav', name: 'Favorites 2026', order: 1 }],
  );
  renderWithProviders(
    <nav aria-label="Main">
      <MyShelvesNav />
    </nav>,
    { route, library },
  );
  return { library };
}

const nav = () => within(screen.getByRole('navigation', { name: 'Main' }));

describe('MyShelvesNav', () => {
  it('lists every shelf with its count, linking to it', async () => {
    renderNav();

    expect(nav().getByRole('heading', { name: 'My shelves' })).toBeInTheDocument();
    expect(await nav().findByRole('link', { name: 'Currently reading 0' })).toHaveAttribute('href', '/shelves?shelf=reading');
    expect(await nav().findByRole('link', { name: 'Read 2' })).toBeInTheDocument();
    expect(await nav().findByRole('link', { name: 'Favorites 2026 1' })).toHaveAttribute('href', '/shelves?shelf=fav');
  });

  it('marks the shelf being shown', async () => {
    renderNav('/shelves?shelf=fav');
    expect(await nav().findByRole('link', { name: /Favorites 2026/ })).toHaveAttribute('aria-current', 'page');
    expect(nav().getByRole('link', { name: /Currently reading/ })).not.toHaveAttribute('aria-current');
  });

  it('creates a shelf from "+ New shelf"', async () => {
    const user = userEvent.setup();
    const { library } = renderNav();
    await nav().findByRole('link', { name: /Favorites 2026/ });

    await user.click(nav().getByRole('button', { name: '+ New shelf' }));
    await user.type(nav().getByRole('textbox', { name: 'New shelf name' }), 'Classics{Enter}');

    expect(await nav().findByRole('link', { name: /Classics/ })).toBeInTheDocument();
    expect(library.createShelf).toHaveBeenCalledWith(TEST_USER.uid, { name: 'Classics', order: 2 });
    expect(nav().queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('closes the new shelf field with Escape', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(nav().getByRole('button', { name: '+ New shelf' }));
    await user.keyboard('{Escape}');
    expect(nav().queryByRole('textbox')).not.toBeInTheDocument();
  });
});
