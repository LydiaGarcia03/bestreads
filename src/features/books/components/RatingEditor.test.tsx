import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestBook, createTestLibraryBook, FakeCatalog, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';

function renderRating(book: Partial<LibraryBook> = {}, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([createTestLibraryBook({ status: 'read', ...book })]);
  const result = renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { ...result, library };
}

const ratingSection = () => screen.findByRole('region', { name: 'My rating' });
const shownValue = () => screen.getByRole('status');
/** Filled share of each star, from the width of its filled layer (absent = empty). */
const starFills = () =>
  within(screen.getByRole('group', { name: 'Rating stars' }))
    .getAllByRole('button')
    .map((button) => (button.querySelector<HTMLElement>('span > span')?.style.width ?? '0%'));

describe('RatingEditor', () => {
  it('rates with a tap on a star and fine-tunes by 0.25', async () => {
    const user = userEvent.setup();
    const { library } = renderRating();
    await ratingSection();
    expect(shownValue()).toHaveTextContent('Not rated');
    expect(screen.getByRole('button', { name: 'Lower rating by 0.25' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Rate 4 stars' }));
    expect(shownValue()).toHaveTextContent('4');
    expect(starFills()).toEqual(['100%', '100%', '100%', '100%', '0%']);

    await user.click(screen.getByRole('button', { name: 'Lower rating by 0.25' }));
    expect(shownValue()).toHaveTextContent('3.75');
    expect(starFills()).toEqual(['100%', '100%', '100%', '75%', '0%']);

    expect(library.updateRating).toHaveBeenLastCalledWith(TEST_USER.uid, expect.objectContaining({ id: 'vol-1' }), {
      rating: 3.75,
      ratingPublic: false,
    });
    expect(library.books.get('vol-1')?.rating).toBe(3.75);
  });

  it('stops at 5 and clears the rating', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 4.75 });
    await ratingSection();

    await user.click(screen.getByRole('button', { name: 'Raise rating by 0.25' }));
    expect(shownValue()).toHaveTextContent('5');
    expect(screen.getByRole('button', { name: 'Raise rating by 0.25' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Clear rating' }));
    expect(shownValue()).toHaveTextContent('Not rated');
    expect(screen.queryByRole('button', { name: 'Clear rating' })).not.toBeInTheDocument();
    expect(library.books.get('vol-1')?.rating).toBeNull();
  });

  it('does not save when the same value is tapped again', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 3 });
    await ratingSection();

    await user.click(screen.getByRole('button', { name: 'Rate 3 stars' }));
    expect(library.updateRating).not.toHaveBeenCalled();
  });

  it('makes the rating public, explaining what is shared', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 4.5 });
    await ratingSection();

    const toggle = screen.getByRole('checkbox', { name: 'Share rating publicly' });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(/only the rating, title, author and cover/);

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(library.updateRating).toHaveBeenCalledWith(TEST_USER.uid, expect.objectContaining({ id: 'vol-1' }), {
      rating: 4.5,
      ratingPublic: true,
    });
  });

  it('goes back to the saved rating and says so when saving fails', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 2 });
    library.updateRating.mockRejectedValueOnce(new Error('offline'));
    await ratingSection();

    await user.click(screen.getByRole('button', { name: 'Rate 5 stars' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your rating.");
    expect(shownValue()).toHaveTextContent('2');
  });

  it('is only shown for books in the library', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/book/:bookId" element={<BookPage />} />
      </Routes>,
      { route: '/book/vol-1', catalog: new FakeCatalog([createTestBook()]) },
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'My rating' })).not.toBeInTheDocument();
  });

  it('is translated, with a decimal comma', async () => {
    const user = userEvent.setup();
    renderRating({ rating: 3.75 }, { language: 'pt-BR' });

    expect(await screen.findByRole('region', { name: 'Minha nota' })).toBeInTheDocument();
    expect(shownValue()).toHaveTextContent('3,75');
    await user.click(screen.getByRole('button', { name: 'Diminuir a nota em 0,25' }));
    expect(shownValue()).toHaveTextContent('3,5');
    expect(screen.getByRole('checkbox', { name: 'Compartilhar nota publicamente' })).toBeInTheDocument();
  });
});
