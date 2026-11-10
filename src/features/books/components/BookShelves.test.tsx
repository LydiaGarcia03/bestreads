import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';

function renderBook(shelfIds: string[] = []) {
  const library = new FakeLibraryRepository(
    [createTestLibraryBook({ status: 'read', shelfIds })],
    [
      { id: 'fav', name: 'Favorites', order: 1 },
      { id: 'cls', name: 'Classics', order: 2 },
    ],
  );
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library },
  );
  return { library };
}

const shelvesRegion = () => screen.findByRole('region', { name: 'Shelves' });

describe('BookShelves', () => {
  it('shows the book’s shelves as links', async () => {
    renderBook(['cls']);
    const region = await shelvesRegion();

    expect(await within(region).findByRole('link', { name: 'Classics' })).toHaveAttribute('href', '/shelves?shelf=cls');
    expect(within(region).queryByRole('link', { name: 'Favorites' })).not.toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Edit shelves' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('puts the book on a shelf and takes it off', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();
    const region = await shelvesRegion();

    await user.click(within(region).getByRole('button', { name: '+ Shelf' }));
    const favorites = await within(region).findByRole('checkbox', { name: 'Favorites' });
    await user.click(favorites);

    expect(favorites).toBeChecked();
    expect(await within(region).findByRole('link', { name: 'Favorites' })).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenLastCalledWith(TEST_USER.uid, 'vol-1', { shelfIds: ['fav'] });

    await user.click(favorites);
    expect(favorites).not.toBeChecked();
    expect(library.updateBook).toHaveBeenLastCalledWith(TEST_USER.uid, 'vol-1', { shelfIds: [] });
  });

  it('creates a shelf with the book on it', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();
    const region = await shelvesRegion();

    await user.click(within(region).getByRole('button', { name: '+ Shelf' }));
    await user.type(within(region).getByRole('textbox', { name: 'New shelf name' }), 'Space{Enter}');

    expect(await within(region).findByRole('checkbox', { name: 'Space' })).toBeChecked();
    expect(library.createShelf).toHaveBeenCalledWith(TEST_USER.uid, { name: 'Space', order: 3 });
    expect(library.updateBook).toHaveBeenLastCalledWith(TEST_USER.uid, 'vol-1', { shelfIds: ['shelf-1'] });
  });
});
