import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { ShelvesPage } from './ShelvesPage';

const books = [
  createTestLibraryBook({ id: 'b1', title: 'Dune', status: 'read', rating: 4.5, shelfIds: ['fav'] }),
  createTestLibraryBook({ id: 'b2', title: 'Emma', status: 'read', shelfIds: [] }),
  createTestLibraryBook({
    id: 'b3',
    title: 'Circe',
    status: 'reading',
    pageCount: 400,
    progress: { unit: 'pages', value: 100 },
    shelfIds: ['fav'],
  }),
];
const shelves = [
  { id: 'fav', name: 'Favorites', order: 1 },
  { id: 'cls', name: 'Classics', order: 2 },
];

function renderShelves(route = '/shelves', options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository(books, shelves);
  renderWithProviders(
    <Routes>
      <Route path="/shelves" element={<ShelvesPage />} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
    </Routes>,
    { route, library, ...options },
  );
  return { library };
}

const chips = () => within(screen.getByRole('navigation', { name: 'Shelves' }));

describe('ShelvesPage', () => {
  it('opens on "Currently reading" with counts for every shelf', async () => {
    renderShelves();

    expect(screen.getByRole('heading', { level: 1, name: 'Shelves' })).toBeInTheDocument();
    expect(await chips().findByRole('link', { name: 'Currently reading · 1' })).toHaveAttribute('aria-current', 'page');
    expect(await chips().findByRole('link', { name: 'Read · 2' })).toBeInTheDocument();
    expect(await chips().findByRole('link', { name: 'Favorites · 2' })).toBeInTheDocument();
    expect(await chips().findByRole('link', { name: 'Classics · 0' })).toBeInTheDocument();

    expect(await screen.findByRole('heading', { level: 3, name: 'Circe' })).toBeInTheDocument();
    expect(screen.getByText('25% read')).toBeInTheDocument();
  });

  it('scrolls the chips sideways without a visible scrollbar', () => {
    renderShelves();

    expect(chips().getByRole('list')).toHaveClass('overflow-x-auto', 'scrollbar-none');
  });

  it('switches shelves with the chips and shows ratings', async () => {
    const user = userEvent.setup();
    renderShelves();

    await user.click(await chips().findByRole('link', { name: /^Read/ }));

    expect(await screen.findByRole('heading', { level: 3, name: 'Dune' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Emma' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4.5 out of 5' })).toBeInTheDocument();
    expect(chips().getByRole('link', { name: /^Read/ })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a custom shelf and opens a book', async () => {
    const user = userEvent.setup();
    renderShelves('/shelves?shelf=fav');

    expect(await screen.findByRole('heading', { level: 2, name: 'Favorites' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'Dune' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Circe' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Dune/ }));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('says when a shelf is empty or no longer exists', async () => {
    renderShelves('/shelves?shelf=cls');
    expect(await screen.findByText('No books on this shelf yet.')).toBeInTheDocument();
  });

  it('explains a link to a deleted shelf', async () => {
    renderShelves('/shelves?shelf=gone');
    expect(await screen.findByRole('heading', { level: 2, name: 'Shelf not found' })).toBeInTheDocument();
  });

  describe('managing shelves', () => {
    const manage = () => within(screen.getByRole('region', { name: 'Your shelves' }));

    it('creates a shelf, refusing duplicates', async () => {
      const user = userEvent.setup();
      const { library } = renderShelves();
      await manage().findByText('Favorites');

      const field = manage().getByRole('textbox', { name: 'New shelf name' });
      await user.type(field, ' favorites {Enter}');
      expect(manage().getByRole('alert')).toHaveTextContent('You already have a shelf with this name.');

      await user.clear(field);
      await user.type(field, 'Sci-fi{Enter}');

      expect(await manage().findByText('Sci-fi')).toBeInTheDocument();
      expect(library.createShelf).toHaveBeenCalledWith(TEST_USER.uid, { name: 'Sci-fi', order: 3 });
      expect(field).toHaveValue('');
      expect(await chips().findByRole('link', { name: /Sci-fi/ })).toBeInTheDocument();
    });

    it('renames a shelf', async () => {
      const user = userEvent.setup();
      const { library } = renderShelves();

      await user.click(await manage().findByRole('button', { name: 'Rename Classics' }));
      const field = manage().getByRole('textbox', { name: 'New name for “Classics”' });
      await user.clear(field);
      await user.type(field, 'Old classics{Enter}');

      expect(await manage().findByText('Old classics')).toBeInTheDocument();
      expect(library.renameShelf).toHaveBeenCalledWith(TEST_USER.uid, 'cls', 'Old classics');
    });

    it('moves a shelf up', async () => {
      const user = userEvent.setup();
      const { library } = renderShelves();

      expect(await manage().findByRole('button', { name: 'Move Favorites up' })).toBeDisabled();
      await user.click(manage().getByRole('button', { name: 'Move Classics up' }));

      await waitFor(() =>
        expect(manage().getAllByRole('listitem').map((item) => item.textContent)).toEqual([
          expect.stringContaining('Classics'),
          expect.stringContaining('Favorites'),
        ]),
      );
      expect(library.reorderShelves).toHaveBeenCalledWith(TEST_USER.uid, [
        { id: 'cls', order: 1 },
        { id: 'fav', order: 2 },
      ]);
    });

    it('deletes a shelf after confirmation', async () => {
      const user = userEvent.setup();
      const { library } = renderShelves();

      await user.click(await manage().findByRole('button', { name: 'Delete Favorites' }));
      const confirm = manage().getByRole('group', { name: 'Delete Favorites' });
      expect(confirm).toHaveTextContent('Its books stay in your library.');
      await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(manage().queryByText('Favorites')).not.toBeInTheDocument());
      expect(library.deleteShelf).toHaveBeenCalledWith(TEST_USER.uid, 'fav');
      expect(library.books.get('b1')?.shelfIds).toEqual([]);
    });
  });

  it('is translated', async () => {
    renderShelves('/shelves', { language: 'pt-BR' });
    expect(screen.getByRole('heading', { level: 1, name: 'Estantes' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Lendo agora · 1' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Suas estantes' })).toBeInTheDocument();
  });

  it('groups books of a series in volume order, collapsible', async () => {
    const user = userEvent.setup();
    const library = new FakeLibraryRepository([
      createTestLibraryBook({ id: 'd2', title: 'Dune Messiah', status: 'read', series: { name: 'Dune', volume: 2 } }),
      createTestLibraryBook({ id: 'e1', title: 'Emma', status: 'read' }),
      createTestLibraryBook({ id: 'd1', title: 'Dune', status: 'read', series: { name: 'Dune', volume: 1 } }),
    ]);
    renderWithProviders(
      <Routes>
        <Route path="/shelves" element={<ShelvesPage />} />
      </Routes>,
      { route: '/shelves?shelf=read', library },
    );

    const group = await screen.findByRole('region', { name: 'Dune' });
    const toggle = within(group).getByRole('button', { name: /Dune 2 books on this shelf/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(group).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Dune',
      'Dune Messiah',
    ]);
    expect(within(group).getByText('Book 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Emma' })).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(group).queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});
