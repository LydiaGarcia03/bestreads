import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SEARCH_DEBOUNCE_MS } from '../searchQuery';
import { SearchBar } from './SearchBar';

function CurrentUrl() {
  const location = useLocation();
  return <output aria-label="url">{`${location.pathname}${location.search}`}</output>;
}

function renderBar(route: string) {
  return renderWithProviders(
    <>
      <SearchBar />
      <Routes>
        <Route path="*" element={<CurrentUrl />} />
      </Routes>
    </>,
    { route },
  );
}

const url = () => screen.getByRole('status', { name: 'url' });
const input = () => screen.getByRole('searchbox', { name: 'Search books' });

describe('SearchBar', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('updates the results URL once typing pauses on the search screen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/search?q=dune');
    expect(input()).toHaveValue('dune');

    await user.type(input(), ' messiah');
    expect(url().textContent).toBe('/search?q=dune');

    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
    expect(url().textContent).toBe('/search?q=dune+messiah');
    expect(input()).toHaveValue('dune messiah');
  });

  it('does not navigate while typing outside the search screen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/shelves');

    await user.type(input(), 'dune');
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS * 2));
    expect(url().textContent).toBe('/shelves');

    await user.keyboard('{Enter}');
    expect(url().textContent).toBe('/search?q=dune');
  });

  it('does not search for a cleared field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderBar('/search?q=dune');

    await user.clear(input());
    await act(() => vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
    expect(url().textContent).toBe('/search?q=dune');
  });
});
