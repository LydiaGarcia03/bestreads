import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { CatalogError, SEARCH_PAGE_SIZE } from '@/features/catalog';
import { createTestBook, FakeCatalog } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { SearchPage } from './SearchPage';
import { SEARCH_VIEW_STORAGE_KEY } from './useSearchView';

function renderSearch(route: string, options: RenderWithProvidersOptions = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/search" element={<SearchPage />} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
    </Routes>,
    { route, ...options },
  );
}

/** Result rows only (each row also contains a list of categories). */
const resultItems = async () => {
  const lists = await screen.findAllByRole('list');
  const results = lists[0];
  if (!results) throw new Error('results not rendered');
  return within(results).getAllByRole('listitem').filter((item) => item.parentElement === results);
};

const manyBooks = (count: number) =>
  Array.from({ length: count }, (_, index) => createTestBook({ id: `vol-${index}`, title: `Book ${index}` }));

describe('SearchPage', () => {
  beforeEach(() => window.localStorage.clear());

  it('asks for a query when there is none', () => {
    const { catalog } = renderSearch('/search');
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('Type a title, author or ISBN in the search bar.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Show results as' })).not.toBeInTheDocument();
    expect(catalog.search).not.toHaveBeenCalled();
  });

  it('does not search for a one-letter query', () => {
    const { catalog } = renderSearch('/search?q=a');
    expect(screen.getByText('Type at least 2 characters.')).toBeInTheDocument();
    expect(catalog.search).not.toHaveBeenCalled();
  });

  it('lists results with details by default, linking to the book page', async () => {
    const user = userEvent.setup();
    const catalog = new FakeCatalog([
      createTestBook(),
      createTestBook({
        id: 'ol-OL1W',
        title: 'The Martian',
        coverUrl: null,
        pageCount: 1,
        publishedDate: '2011',
        categories: [],
      }),
    ]);
    renderSearch('/search?q=andy%20weir', { catalog });

    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    const [first, second] = await resultItems();
    if (!first || !second) throw new Error('results not rendered');
    expect(catalog.search).toHaveBeenCalledWith('andy weir', { page: 0, pageSize: SEARCH_PAGE_SIZE }, expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');

    expect(within(first).getByRole('heading', { name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(within(first).getByRole('img', { name: 'Cover of Project Hail Mary' })).toHaveAttribute('loading', 'lazy');
    expect(within(first).getByText('by Andy Weir')).toBeInTheDocument();
    expect(within(first).getByText('Published May 4, 2021 · 476 pages')).toBeInTheDocument();
    const categories = within(first).getByRole('list', { name: 'Categories' });
    expect(within(categories).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Fiction',
      'Science Fiction',
    ]);
    expect(within(second).getByRole('img', { name: 'No cover for The Martian' })).toBeInTheDocument();
    expect(within(second).getByText('Published 2011 · 1 page')).toBeInTheDocument();

    await user.click(within(second).getByRole('link'));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('switches to a cover grid and remembers the choice', async () => {
    const user = userEvent.setup();
    renderSearch('/search?q=dune', { catalog: new FakeCatalog([createTestBook()]) });
    await resultItems();

    await user.click(screen.getByRole('button', { name: 'Grid' }));

    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Published May 4, 2021 · 476 pages')).not.toBeInTheDocument();
    expect(screen.getByText('Andy Weir')).toBeInTheDocument();
    expect(window.localStorage.getItem(SEARCH_VIEW_STORAGE_KEY)).toBe('grid');
  });

  it('starts in the remembered view', async () => {
    window.localStorage.setItem(SEARCH_VIEW_STORAGE_KEY, 'grid');
    renderSearch('/search?q=dune', { catalog: new FakeCatalog([createTestBook()]) });
    expect(await screen.findByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('loads more results page by page', async () => {
    const user = userEvent.setup();
    const catalog = new FakeCatalog(manyBooks(SEARCH_PAGE_SIZE + 3));
    renderSearch('/search?q=dune', { catalog });

    expect(await resultItems()).toHaveLength(SEARCH_PAGE_SIZE);
    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('heading', { name: `Book ${SEARCH_PAGE_SIZE + 2}` })).toBeInTheDocument();
    expect(await resultItems()).toHaveLength(SEARCH_PAGE_SIZE + 3);
    expect(catalog.search).toHaveBeenLastCalledWith('dune', { page: 1, pageSize: SEARCH_PAGE_SIZE }, expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says when nothing was found', async () => {
    renderSearch('/search?q=zzzzqx', { catalog: new FakeCatalog([]) });
    expect(await screen.findByText('No books found. Try another title, author or ISBN.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    const user = userEvent.setup();
    const catalog = new FakeCatalog([createTestBook()]);
    catalog.search.mockRejectedValueOnce(new CatalogError('HTTP 503'));
    renderSearch('/search?q=dune', { catalog });

    expect(await screen.findByRole('alert')).toHaveTextContent("Search isn't available right now.");
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(catalog.search).toHaveBeenCalledTimes(2);
  });

  it('is translated, including dates and page count plurals', async () => {
    renderSearch('/search?q=dune', { language: 'pt-BR', catalog: new FakeCatalog([createTestBook()]) });

    expect(await screen.findByText(/Publicado em 4 de mai\.? de 2021 · 476 páginas/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Resultados para “dune”' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Capa de Project Hail Mary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
  });
});
