import { screen } from '@testing-library/react';
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
const slider = () => screen.getByRole('slider', { name: /Rating stars|Estrelas da nota/ });

const STAR_WIDTH = 32;
const STAR_GAP = 4;
/** jsdom has no layout: gives each star a box (32px wide, 4px apart from x = 0). */
function layOutStars() {
  [...slider().children].forEach((star, index) => {
    const left = index * (STAR_WIDTH + STAR_GAP);
    star.getBoundingClientRect = () => ({ left, right: left + STAR_WIDTH, width: STAR_WIDTH }) as DOMRect;
  });
}
/** The x of a rating: `fraction` of the way across `star`. */
const xAt = (star: number, fraction: number) => (star - 1) * (STAR_WIDTH + STAR_GAP) + STAR_WIDTH * fraction;
/** Filled share of each star, from the width of its filled layer (absent = empty). */
const starFills = () =>
  [...slider().children].map((star) => star.querySelector<HTMLElement>(':scope > span > span')?.style.width ?? '0%');

type User = ReturnType<typeof userEvent.setup>;
const hover = (user: User, clientX: number) => user.pointer({ target: slider(), coords: { clientX } });
const clickAt = (user: User, clientX: number) =>
  user.pointer([{ target: slider(), coords: { clientX } }, { keys: '[MouseLeft]', target: slider(), coords: { clientX } }]);

describe('RatingEditor', () => {
  it('previews the rating under the mouse in 0.25 steps and saves it on click', async () => {
    const user = userEvent.setup();
    const { library } = renderRating();
    await ratingSection();
    layOutStars();
    expect(slider()).toHaveAttribute('aria-valuetext', 'Not rated');

    await hover(user, xAt(4, 0.7));
    expect(starFills()).toEqual(['100%', '100%', '100%', '75%', '0%']);
    expect(library.updateRating).not.toHaveBeenCalled();

    await clickAt(user, xAt(4, 0.7));
    expect(slider()).toHaveAttribute('aria-valuetext', '3.75 out of 5');
    expect(library.updateRating).toHaveBeenLastCalledWith(TEST_USER.uid, expect.objectContaining({ id: 'vol-1' }), {
      rating: 3.75,
      ratingPublic: false,
    });
    expect(library.books.get('vol-1')?.rating).toBe(3.75);
  });

  it('goes back to the saved rating when the mouse leaves without clicking', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 2 });
    await ratingSection();
    layOutStars();

    await hover(user, xAt(5, 1));
    expect(starFills()).toEqual(['100%', '100%', '100%', '100%', '100%']);
    await user.unhover(slider());
    expect(starFills()).toEqual(['100%', '100%', '0%', '0%', '0%']);
    expect(library.updateRating).not.toHaveBeenCalled();
  });

  it('changes the rating by 0.25 with the arrow keys and clears it', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 4.75 });
    await ratingSection();

    slider().focus();
    await user.keyboard('{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuenow', '5');
    await user.keyboard('{ArrowRight}');
    expect(library.updateRating).toHaveBeenCalledTimes(1);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(slider()).toHaveAttribute('aria-valuenow', '4.5');

    await user.click(screen.getByRole('button', { name: 'Clear rating' }));
    expect(slider()).toHaveAttribute('aria-valuetext', 'Not rated');
    expect(screen.queryByRole('button', { name: 'Clear rating' })).not.toBeInTheDocument();
    expect(library.books.get('vol-1')?.rating).toBeNull();
  });

  it('does not save when the same value is clicked again', async () => {
    const user = userEvent.setup();
    const { library } = renderRating({ rating: 3 });
    await ratingSection();
    layOutStars();

    await clickAt(user, xAt(3, 1));
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

    layOutStars();
    await clickAt(user, xAt(5, 1));
    await user.unhover(slider());

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your rating.");
    expect(slider()).toHaveAttribute('aria-valuenow', '2');
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
    expect(slider()).toHaveAttribute('aria-valuetext', '3,75 de 5');
    slider().focus();
    await user.keyboard('{ArrowLeft}');
    expect(slider()).toHaveAttribute('aria-valuetext', '3,5 de 5');
    expect(screen.getByRole('checkbox', { name: 'Compartilhar nota publicamente' })).toBeInTheDocument();
  });
});
