import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import type { LibraryBook } from '@/features/books';
import { HOME_FEED_SIZE } from '@/features/social/feed';
import {
  createTestBook,
  createTestLibraryBook,
  createTestProfile,
  createTestPublicRating,
  FakeCatalog,
  FakeLibraryRepository,
  FakeSocialRepository,
  TEST_USER,
} from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { HomePage } from './HomePage';

const reading = (id: string, title: string, overrides: Partial<LibraryBook> = {}) =>
  createTestLibraryBook({ id, title, status: 'reading', pageCount: 496, ...overrides });

const popularCatalog = () =>
  new FakeCatalog([
    createTestBook({ id: 'ol-OL1W', title: 'Atomic Habits', authors: ['James Clear'] }),
    createTestBook({ id: 'ol-OL2W', title: 'O Alquimista', authors: ['Paulo Coelho'] }),
  ]);

/** Main column sections in page order, by their headings. */
const sectionOrder = () =>
  screen
    .getAllByRole('region')
    .filter((region) => !region.closest('aside'))
    .map((region) => region.querySelector('h2')?.textContent);

/** Makes `useMediaQuery` report a phone (no match for the desktop query) or a desktop. */
function stubScreen(isDesktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: isDesktop, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

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

  describe("Tonight's book", () => {
    const plan = (time: string | null) => ({ pagesPerDay: 30, time, weekdays: [2 as const], reminder: false });
    beforeEach(() => {
      // Tuesday, 10 Nov 2026. Only the date is faked, so queries and user events keep their timers.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 10, 10, 12));
    });
    afterEach(() => vi.useRealTimers());

    it('shows the book planned for today, linking to it', async () => {
      renderHome([
        reading('b1', 'Dune'),
        reading('b2', 'Circe', { plan: plan('21:00'), progress: { unit: 'pages', value: 486 } }),
      ]);
      const link = await within(await currentlyReading()).findByRole('link', {
        name: "Tonight's book · 9:00 PM · 10 pages planned Circe Edit plan",
      });
      expect(link).toHaveAttribute('href', '/book/b2');
    });

    it('is not shown without a plan for today', async () => {
      renderHome([reading('b1', 'Dune', { plan: { ...plan(null), weekdays: [3] } })]);
      await within(await currentlyReading()).findByRole('article', { name: 'Dune' });
      expect(screen.queryByText(/book ·/)).not.toBeInTheDocument();
    });

    it('is translated', async () => {
      renderHome([reading('b1', 'Dune', { plan: plan(null) })], { language: 'pt-BR' });
      expect(await screen.findByText('Livro de hoje · 30 páginas planejadas')).toBeInTheDocument();
    });
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

  describe('friends side column', () => {
    afterEach(() => vi.unstubAllGlobals());

    it("shows followed users' latest ratings on desktop, linking to Friends", async () => {
      stubScreen(true);
      const friend = createTestProfile({ uid: 'ana-uid', username: 'ana' });
      const social = new FakeSocialRepository([friend]);
      social.follows.add(`${TEST_USER.uid}_${friend.uid}`);
      social.ratings.set(
        friend.uid,
        Array.from({ length: 8 }, (_, index) => createTestPublicRating({ bookId: `b${index}`, title: `Book ${index}` })),
      );
      renderHome([], { social });

      const side = screen.getByRole('complementary', { name: 'Friends and stats' });
      const friends = within(side).getByRole('region', { name: 'Friends' });
      expect(await within(friends).findAllByRole('article')).toHaveLength(HOME_FEED_SIZE);
      expect(within(friends).getByRole('link', { name: 'Book 0' })).toHaveAttribute('href', '/book/b0');
      expect(within(friends).getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/friends');
    });

    it("shows this year's reading totals on desktop, linking to My Year", async () => {
      stubScreen(true);
      const thisYear = new Date().getFullYear();
      renderHome([
        createTestLibraryBook({
          id: 'r1',
          status: 'read',
          rating: 4,
          pageCount: 300,
          reads: [{ startedOn: null, finishedOn: `${thisYear}-02-01` }],
        }),
      ]);

      const side = screen.getByRole('complementary', { name: 'Friends and stats' });
      const year = within(side).getByRole('region', { name: `My Year ${thisYear}` });
      expect(await within(year).findByText('book')).toBeInTheDocument();
      expect(within(year).getByText('book').nextElementSibling).toHaveTextContent('1');
      expect(within(year).getByText('pages').nextElementSibling).toHaveTextContent('300');
      expect(within(year).getByText('avg rating').nextElementSibling).toHaveTextContent('4');
      expect(within(year).getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/year');
    });

    it('is not rendered (nor read) on phones', async () => {
      stubScreen(false);
      const social = new FakeSocialRepository();
      renderHome([], { social });

      await currentlyReading();
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      expect(social.listFollowing).not.toHaveBeenCalled();
    });
  });

  it('is translated', async () => {
    renderHome([reading('b1', 'Project Hail Mary', { progress: { unit: 'pages', value: 296 } })], { language: 'pt-BR' });
    expect(await screen.findByRole('region', { name: 'Lendo agora' })).toBeInTheDocument();
    expect(await screen.findByText('Página 296 de 496 · 59%')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Minhas estantes' })).toBeInTheDocument();
  });
});
