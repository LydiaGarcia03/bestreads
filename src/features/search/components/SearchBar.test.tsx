import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { CatalogError } from '@/features/catalog';
import { createTestBook, FakeCatalog } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SEARCH_DEBOUNCE_MS } from '../searchQuery';
import { SUGGESTION_LIMIT } from '../useSearchSuggestions';
import { SearchBar } from './SearchBar';

function CurrentUrl() {
  const location = useLocation();
  return <output aria-label="url">{`${location.pathname}${location.search}`}</output>;
}

const books = Array.from({ length: SUGGESTION_LIMIT + 2 }, (_, index) =>
  createTestBook({ id: `vol-${index}`, title: `Yesterday ${index}`, authors: [`Author ${index}`] }),
);

function renderBar(route: string, catalog = new FakeCatalog(books)) {
  return renderWithProviders(
    <>
      <SearchBar />
      <Routes>
        <Route path="*" element={<CurrentUrl />} />
      </Routes>
    </>,
    { route, catalog },
  );
}

const url = () => screen.getByRole('status', { name: 'url' }).textContent;
const input = () => screen.getByRole('combobox', { name: 'Search books' });
const waitForPause = (ms = SEARCH_DEBOUNCE_MS) => act(() => vi.advanceTimersByTimeAsync(ms));
const options = () => within(screen.getByRole('listbox', { name: 'Suggested books' })).getAllByRole('option');

describe('SearchBar', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('suggests books under the field once 4+ characters are typed and typing pauses', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { catalog } = renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause(SEARCH_DEBOUNCE_MS - 100);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(catalog.search).not.toHaveBeenCalled();

    await waitForPause(100);
    expect(await screen.findByRole('option', { name: /Yesterday 0/ })).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(catalog.search).toHaveBeenCalledTimes(1);

    const shown = options();
    expect(shown).toHaveLength(SUGGESTION_LIMIT + 1);
    expect(shown[0]).toHaveTextContent('by Author 0');
    expect(within(shown[0] as HTMLElement).getByRole('img', { name: 'Cover of Yesterday 0' })).toBeInTheDocument();
    expect(shown.at(-1)).toHaveTextContent('See all results for “yester”');
    expect(url()).toBe('/shelves');
  });

  it('waits for 4 characters before suggesting; Enter still searches', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'dun');
    await waitForPause(SEARCH_DEBOUNCE_MS * 2);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(url()).toBe('/search?q=dun');
  });

  it('opens the book page when a suggestion is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause();
    await user.click(await screen.findByRole('option', { name: /Yesterday 1/ }));

    expect(url()).toBe('/book/vol-1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the search screen from "See all results"', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause();
    await user.click(await screen.findByRole('option', { name: 'See all results for “yester”' }));

    expect(url()).toBe('/search?q=yester');
  });

  it('moves through the suggestions with the arrow keys and opens one with Enter', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause();
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    const second = options()[1] as HTMLElement;
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', second.id);

    await user.keyboard('{Enter}');
    expect(url()).toBe('/book/vol-1');
  });

  it('wraps from the first suggestion to "See all results" with ArrowUp', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause();
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(url()).toBe('/search?q=yester');
  });

  it('closes with Escape and reopens with ArrowDown', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause();
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input()).toHaveValue('yester');

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes when the field loses focus', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'yester');
    await waitForPause();
    await screen.findByRole('listbox');

    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('says when nothing was found', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves', new FakeCatalog([]));

    await user.type(input(), 'zzzzqx');
    await waitForPause();

    expect(await screen.findByText('No books found. Try another title, author or ISBN.')).toBeInTheDocument();
    expect(options()).toHaveLength(1);
  });

  it('shows an error when suggestions fail', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const catalog = new FakeCatalog(books);
    catalog.search.mockRejectedValue(new CatalogError('HTTP 503'));
    renderBar('/shelves', catalog);

    await user.type(input(), 'yester');
    await waitForPause();

    expect(await screen.findByRole('alert')).toHaveTextContent("Search isn't available right now.");
  });

  it('shows the query of the search screen', () => {
    renderBar('/search?q=dune');
    expect(input()).toHaveValue('dune');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not suggest for a cleared field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { catalog } = renderBar('/search?q=dune');

    await user.clear(input());
    await waitForPause();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(catalog.search).not.toHaveBeenCalledWith('', expect.anything(), expect.anything());
  });
});
