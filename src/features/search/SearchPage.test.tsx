import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestBook, FakeBookSearchProvider } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { SearchPage } from './SearchPage';
import { BookSearchError } from './types';

function renderSearch(route: string, options: RenderWithProvidersOptions = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/search" element={<SearchPage />} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
    </Routes>,
    { route, ...options },
  );
}

describe('SearchPage', () => {
  it('asks for a query when there is none', () => {
    const { bookSearch } = renderSearch('/search');
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('Type a title, author or ISBN in the search bar.')).toBeInTheDocument();
    expect(bookSearch.search).not.toHaveBeenCalled();
  });

  it('does not search for a one-letter query', () => {
    const { bookSearch } = renderSearch('/search?q=a');
    expect(screen.getByText('Type at least 2 characters.')).toBeInTheDocument();
    expect(bookSearch.search).not.toHaveBeenCalled();
  });

  it('lists results with cover, authors, year and pages, linking to the book page', async () => {
    const user = userEvent.setup();
    const bookSearch = new FakeBookSearchProvider([
      createTestBook(),
      createTestBook({ id: 'ol-OL1W', title: 'The Martian', coverUrl: null, pageCount: 1, publishedYear: null }),
    ]);
    renderSearch('/search?q=andy%20weir', { bookSearch });

    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(bookSearch.search).toHaveBeenCalledWith('andy weir', expect.any(AbortSignal));

    const [first, second] = items;
    if (!first || !second) throw new Error('results not rendered');
    expect(within(first).getByRole('heading', { name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(within(first).getByRole('img', { name: 'Cover of Project Hail Mary' })).toHaveAttribute('loading', 'lazy');
    expect(within(first).getByText('Andy Weir')).toBeInTheDocument();
    expect(within(first).getByText('2021 · 476 pages')).toBeInTheDocument();
    expect(within(second).getByRole('img', { name: 'No cover for The Martian' })).toBeInTheDocument();
    expect(within(second).getByText('1 page')).toBeInTheDocument();

    await user.click(within(second).getByRole('link'));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('says when nothing was found', async () => {
    renderSearch('/search?q=zzzzqx', { bookSearch: new FakeBookSearchProvider([]) });
    expect(await screen.findByText('No books found. Try another title, author or ISBN.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    const user = userEvent.setup();
    const bookSearch = new FakeBookSearchProvider([createTestBook()]);
    bookSearch.search.mockRejectedValueOnce(new BookSearchError('HTTP 503'));
    renderSearch('/search?q=dune', { bookSearch });

    expect(await screen.findByRole('alert')).toHaveTextContent("Search isn't available right now.");
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(bookSearch.search).toHaveBeenCalledTimes(2);
  });

  it('is translated, including page count plurals', async () => {
    renderSearch('/search?q=dune', {
      language: 'pt-BR',
      bookSearch: new FakeBookSearchProvider([createTestBook()]),
    });

    expect(await screen.findByText('2021 · 476 páginas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Resultados para “dune”' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Capa de Project Hail Mary' })).toBeInTheDocument();
  });
});
