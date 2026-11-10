import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import type { LibraryBook } from '@/features/books';
import { createTestBook, createTestLibraryBook, FakeCatalog, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { HomePage } from './HomePage';

const reading = (id: string, title: string, overrides: Partial<LibraryBook> = {}) =>
  createTestLibraryBook({ id, title, status: 'reading', pageCount: 496, ...overrides });

const popularCatalog = () =>
  new FakeCatalog([
    createTestBook({ id: 'ol-OL1W', title: 'Atomic Habits', authors: ['James Clear'] }),
    createTestBook({ id: 'ol-OL2W', title: 'O Alquimista', authors: ['Paulo Coelho'] }),
  ]);

/** Top-level sections in page order, by their headings. */
const sectionOrder = () => screen.getAllByRole('region').map((region) => region.querySelector('h2')?.textContent);

function renderHome(books: LibraryBook[], options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository(books, [{ id: 'fav', name: 'Favorites', order: 1 }]);
  renderWithProviders(
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shelves" element={<h1>Shelves screen</h1>} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
    </Routes>,
    { library, catalog: popularCatalog(), ...options },
  );
  return { library };
}

const currentlyReading = () => screen.findByRole('region', { name: 'Currently reading' });
const myShelves = () => screen.findByRole('region', { name: 'My shelves' });

describe('HomePage', () => {
  it('shows each book being read with its progress', async () => {
    renderHome([reading('b1', 'Project Hail Mary', { progress: { unit: 'pages', value: 296 } })]);
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();

    const card = await within(await currentlyReading()).findByRole('article', { name: 'Project Hail Mary' });
    expect(within(card).getByText('by Andy Weir')).toBeInTheDocument();
    expect(within(card).getByText('Page 296 of 496 · 59%')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'Progress' })).toHaveAttribute('aria-valuenow', '59');
  });

  it('updates the progress from the card', async () => {
    const user = userEvent.setup();
    const { library } = renderHome([reading('b1', 'Project Hail Mary')]);
    const card = await within(await currentlyReading()).findByRole('article', { name: 'Project Hail Mary' });
    expect(within(card).getByText('Not started yet')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Update progress' }));
    await user.type(within(card).getByRole('textbox', { name: "I'm on page" }), '124{Enter}');

    expect(await within(card).findByText('Page 124 of 496 · 25%')).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'b1', { progress: { unit: 'pages', value: 124 } });
  });

  it('opens the book from its title', async () => {
    const user = userEvent.setup();
    renderHome([reading('b1', 'Project Hail Mary')]);

    await user.click(await within(await currentlyReading()).findByRole('link', { name: 'Project Hail Mary' }));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('shows up to three books and links to the rest', async () => {
    renderHome([reading('b1', 'One'), reading('b2', 'Two'), reading('b3', 'Three'), reading('b4', 'Four')]);
    const section = await currentlyReading();

    expect(await within(section).findAllByRole('article')).toHaveLength(3);
    expect(within(section).getByRole('link', { name: "See all 4 books you're reading" })).toHaveAttribute(
      'href',
      '/shelves?shelf=reading',
    );
  });

  it('suggests finding a book when nothing is being read', async () => {
    renderHome([]);
    expect(await within(await currentlyReading()).findByText(/You're not reading anything right now/)).toBeInTheDocument();
  });

  it('shows the read shelf by default and switches shelves in place', async () => {
    const user = userEvent.setup();
    renderHome([
      createTestLibraryBook({ id: 'r1', title: 'Dune', status: 'read', rating: 5 }),
      createTestLibraryBook({ id: 'f1', title: 'Emma', status: 'wantToRead', shelfIds: ['fav'] }),
    ]);
    const shelves = await myShelves();

    expect(await within(shelves).findByRole('heading', { level: 3, name: 'Dune' })).toBeInTheDocument();
    expect(within(shelves).getByRole('link', { name: 'See the shelf (1 book)' })).toHaveAttribute('href', '/shelves?shelf=read');

    await user.click(await within(shelves).findByRole('link', { name: /^Favorites/ }));

    expect(await within(shelves).findByRole('heading', { level: 3, name: 'Emma' })).toBeInTheDocument();
    expect(within(shelves).queryByRole('heading', { level: 3, name: 'Dune' })).not.toBeInTheDocument();
    expect(within(shelves).getByRole('link', { name: /^Favorites/ })).toHaveAttribute('aria-current', 'page');
  });

  describe('popular books', () => {
    it('come first while the library is empty', async () => {
      renderHome([]);

      const popular = await screen.findByRole('region', { name: 'Popular books' });
      expect(await within(popular).findByRole('link', { name: /Atomic Habits/ })).toHaveAttribute('href', '/book/ol-OL1W');
      expect(within(popular).getByText('Paulo Coelho')).toBeInTheDocument();
      expect(sectionOrder()).toEqual(['Popular books', 'Currently reading', 'My shelves']);
    });

    it('never include excluded authors (J.K. Rowling, under any name)', async () => {
      const catalog = popularCatalog();
      catalog.popularBooks = [
        createTestBook({ id: 'ol-OL3W', title: "Harry Potter and the Philosopher's Stone", authors: ['J. K. Rowling'] }),
        createTestBook({ id: 'ol-OL4W', title: "The Cuckoo's Calling", authors: ['Robert Galbraith'] }),
        createTestBook({ id: 'ol-OL1W', title: 'Atomic Habits', authors: ['James Clear'] }),
      ];
      renderHome([], { catalog });

      const popular = await screen.findByRole('region', { name: 'Popular books' });
      expect(await within(popular).findByRole('link', { name: /Atomic Habits/ })).toBeInTheDocument();
      expect(within(popular).queryByText(/Harry Potter/)).not.toBeInTheDocument();
      expect(within(popular).queryByText(/Cuckoo/)).not.toBeInTheDocument();
    });

    it('follow the shelves once the library has books', async () => {
      renderHome([reading('b1', 'Project Hail Mary')]);

      await screen.findByRole('region', { name: 'Popular books' });
      expect(sectionOrder()).toEqual(['Currently reading', 'My shelves', 'Popular books']);
    });

    it('offer a retry when they fail to load', async () => {
      const user = userEvent.setup();
      const catalog = popularCatalog();
      catalog.popular.mockRejectedValueOnce(new Error('offline'));
      renderHome([], { catalog });

      const popular = await screen.findByRole('region', { name: 'Popular books' });
      expect(await within(popular).findByRole('alert')).toHaveTextContent("Couldn't load popular books.");
      await user.click(within(popular).getByRole('button', { name: 'Try again' }));
      expect(await within(popular).findByRole('link', { name: /Atomic Habits/ })).toBeInTheDocument();
    });
  });

  it('is translated', async () => {
    renderHome([reading('b1', 'Project Hail Mary', { progress: { unit: 'pages', value: 296 } })], { language: 'pt-BR' });
    expect(await screen.findByRole('region', { name: 'Lendo agora' })).toBeInTheDocument();
    expect(await screen.findByText('Página 296 de 496 · 59%')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Minhas estantes' })).toBeInTheDocument();
  });
});
