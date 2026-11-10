import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestBook, createTestLibraryBook, FakeCatalog, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';

const dune = (id: string, title: string, volume: number, overrides: Partial<LibraryBook> = {}) =>
  createTestLibraryBook({
    id,
    title,
    authors: ['Frank Herbert'],
    pageCount: 400,
    series: { name: 'Dune', volume },
    ...overrides,
  });

const catalogVolume = (id: string, title: string, position: string, year: number) =>
  createTestBook({ id, title, authors: ['Frank Herbert'], series: { name: 'Dune', position }, publishedYear: year });

function renderSeries(options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([
    dune('my-1', 'Dune', 1, { status: 'read', publishedYear: 1965 }),
    dune('my-3', 'Children of Dune', 3, { status: 'reading', progress: { unit: 'pages', value: 100 } }),
  ]);
  const catalog = new FakeCatalog([
    catalogVolume('ol-1', 'Dune', '1', 1965),
    catalogVolume('ol-2', 'Dune Messiah', '2', 1969),
    catalogVolume('ol-3', 'Children of Dune', '3', 1976),
    catalogVolume('ol-4', 'God Emperor of Dune', '4', 1981),
  ]);
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/my-3', library, catalog, ...options },
  );
  return { library, catalog };
}

const panel = () => screen.findByRole('complementary', { name: 'Dune' });
const items = async () => within(await panel()).getAllByRole('listitem');

describe('SeriesPanel', () => {
  it('lists every volume in order with its state, highlighting the current book', async () => {
    renderSeries();
    const series = await panel();

    expect(await within(series).findByText('Frank Herbert · 4 books')).toBeInTheDocument();
    await waitFor(async () => expect(await items()).toHaveLength(4));
    const [first, second, third, fourth] = await items();

    expect(first).toHaveTextContent(/Dune#1 · 1965Read/);
    expect(second).toHaveTextContent(/Dune Messiah#2 · 1969\+ AddNot in your library/);
    expect(third).toHaveTextContent(/Children of Dune#3 · reading · 25%Currently reading/);
    expect(within(third as HTMLElement).getByText('Children of Dune').closest('[aria-current="page"]')).not.toBeNull();
    expect(fourth).toHaveTextContent(/God Emperor of Dune#4 · 1981/);
    expect(within(series).getByText('1 read · 1 reading')).toBeInTheDocument();
    expect(within(series).getByText('2 to go')).toBeInTheDocument();
  });

  it('links owned volumes to their pages and catalog ones to theirs', async () => {
    renderSeries();
    await waitFor(async () => expect(await items()).toHaveLength(4));
    const series = await panel();

    expect(within(series).getByRole('link', { name: /^Cover of Dune Dune #1/ })).toHaveAttribute('href', '/book/my-1');
    expect(within(series).getByRole('link', { name: /Dune Messiah/ })).toHaveAttribute('href', '/book/ol-2');
  });

  it('adds one missing volume to Want to read, with its series', async () => {
    const user = userEvent.setup();
    const { library } = renderSeries();
    await waitFor(async () => expect(await items()).toHaveLength(4));

    await user.click(within(await panel()).getByRole('button', { name: 'Add Dune Messiah to Want to read' }));

    await waitFor(() => expect(library.books.get('ol-2')?.status).toBe('wantToRead'));
    expect(library.books.get('ol-2')?.series).toEqual({ name: 'Dune', volume: 2 });
  });

  it('adds every missing volume at once', async () => {
    const user = userEvent.setup();
    const { library } = renderSeries();
    await waitFor(async () => expect(await items()).toHaveLength(4));

    await user.click(within(await panel()).getByRole('button', { name: 'Add the 2 missing books to Want to read' }));

    await waitFor(() => expect(library.books.get('ol-4')?.status).toBe('wantToRead'));
    expect(library.books.get('ol-2')?.status).toBe('wantToRead');
    expect(library.addBook).toHaveBeenCalledTimes(2);
    expect(library.addBook).toHaveBeenLastCalledWith(
      TEST_USER.uid,
      expect.objectContaining({ id: 'ol-4' }),
      'wantToRead',
      expect.any(String),
    );
  });
  it('is not shown for books outside a series', async () => {
    const library = new FakeLibraryRepository([createTestLibraryBook({ status: 'read' })]);
    renderWithProviders(
      <Routes>
        <Route path="/book/:bookId" element={<BookPage />} />
      </Routes>,
      { route: '/book/vol-1', library },
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    renderSeries({ language: 'pt-BR' });
    const series = await panel();
    expect(await within(series).findByText('Frank Herbert · 4 livros')).toBeInTheDocument();
    expect(await within(series).findByText('faltam 2')).toBeInTheDocument();
  });
});
