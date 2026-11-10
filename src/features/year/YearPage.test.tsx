import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import type { LibraryBook } from '@/features/books';
import * as shareApi from '@/features/share/shareApi';
import { createTestLibraryBook, FakeLibraryRepository } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { YearPage } from './YearPage';

vi.mock('@/features/share/shareApi', () => ({
  renderPng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  loadShareableImage: vi.fn(async () => 'data:image/png;base64,Y292ZXI='),
  canShareFiles: vi.fn(() => true),
  shareFile: vi.fn(async () => true),
  downloadFile: vi.fn(),
}));

const api = vi.mocked(shareApi);
const finished = (...days: string[]) => days.map((finishedOn) => ({ startedOn: null, finishedOn }));
const book = (id: string, overrides: Partial<LibraryBook>) =>
  createTestLibraryBook({ id, title: id, status: 'read', authors: ['Someone'], pageCount: 100, ...overrides });

const LIBRARY = [
  book('Dune', { reads: finished('2026-01-10', '2026-03-01'), rating: 5, pageCount: 412, authors: ['Frank Herbert'], coverUrl: 'https://covers.example/dune.jpg' }),
  book('Dune Messiah', { reads: finished('2026-03-20'), rating: 4, pageCount: 256, authors: ['Frank Herbert'] }),
  book('Emma', { reads: finished('2025-06-01'), rating: 3 }),
  book('Circe', { status: 'reading', reads: [...finished('2026-02-14'), { startedOn: '2026-11-01', finishedOn: null }], rating: null, pageCount: 393 }),
];

/** Makes `useMediaQuery` report a phone (no match for the desktop query) or a desktop. */
function stubScreen(isDesktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: isDesktop, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

function renderYear(books: LibraryBook[] = LIBRARY, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository(books);
  renderWithProviders(
    <Routes>
      <Route path="/year" element={<YearPage />} />
      <Route path="/book/:bookId" element={<h1>Book screen</h1>} />
    </Routes>,
    { route: '/year', library, ...options },
  );
  return { library };
}

describe('YearPage', () => {
  beforeEach(() => {
    // Only the date is faked, so queries and user events keep their timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 10, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows the current year's totals, counting re-reads and books being re-read", async () => {
    renderYear();

    expect(await screen.findByRole('heading', { level: 1, name: 'My Year 2026' })).toBeInTheDocument();
    const totals = screen.getByText('books finished').closest('dl');
    if (!totals) throw new Error('Expected the totals');
    const value = (label: string) => within(totals).getByText(label).nextElementSibling;
    expect(value('books finished')).toHaveTextContent('4');
    // Dune twice (412 × 2), Dune Messiah 256, Circe 393.
    expect(value('pages read')).toHaveTextContent('1,473');
    expect(value('average rating')).toHaveTextContent('4.5');
  });

  it('charts books per month, with every month announced', async () => {
    renderYear();

    const months = await screen.findByRole('region', { name: 'Books per month' });
    expect(within(months).getAllByRole('listitem')).toHaveLength(12);
    expect(within(months).getByRole('listitem', { name: 'March: 2 books' })).toBeInTheDocument();
    expect(within(months).getByRole('listitem', { name: 'February: 1 book' })).toBeInTheDocument();
    expect(within(months).getByRole('listitem', { name: 'April: no books' })).toBeInTheDocument();
  });

  it('shows highlights and every finished book, linking to it', async () => {
    const user = userEvent.setup();
    renderYear();

    const highlights = await screen.findByRole('region', { name: 'Highlights' });
    expect(within(highlights).getByText('Longest book').nextElementSibling).toHaveTextContent('Dune · 412 pages');
    expect(within(highlights).getByText('Frank Herbert')).toBeInTheDocument();

    const list = screen.getByRole('region', { name: '4 books finished' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(within(list).getByText('Finished Mar 20')).toBeInTheDocument();
    await user.click(within(list).getByRole('link', { name: /Dune Messiah/ }));
    expect(await screen.findByRole('heading', { name: 'Book screen' })).toBeInTheDocument();
  });

  it('switches between years with finished books', async () => {
    const user = userEvent.setup();
    renderYear();

    const years = await screen.findByRole('navigation', { name: 'Years' });
    expect(within(years).getByRole('link', { name: '2026' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(years).getByRole('link', { name: '2025' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My Year 2025' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '1 book finished' })).toBeInTheDocument();
  });

  it('says when nothing was finished in the year', async () => {
    renderYear([book('Emma', { status: 'wantToRead', reads: [] })]);

    expect(
      await screen.findByText('You haven\'t finished any books in 2026 yet. Mark a book as “Read” and it shows up here.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share my year' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Years' })).not.toBeInTheDocument();
  });

  it('downloads the year card on desktop', async () => {
    stubScreen(true);
    const user = userEvent.setup();
    renderYear();

    await user.click(await screen.findByRole('button', { name: 'Share my year' }));
    const dialog = screen.getByRole('dialog', { name: 'Share your year' });
    expect(within(dialog).getByRole('heading', { name: 'My 2026 in books' })).toBeInTheDocument();
    expect(within(dialog).getByText('Favorite')).toBeInTheDocument();
    expect(within(dialog).getByText('Most read: Frank Herbert')).toBeInTheDocument();
    expect(api.loadShareableImage).toHaveBeenCalledWith('https://covers.example/dune.jpg');

    await user.click(within(dialog).getByRole('button', { name: 'Download image' }));

    expect(await within(dialog).findByText('Image downloaded.')).toBeInTheDocument();
    expect(api.renderPng).toHaveBeenCalledTimes(1);
    const [file] = api.downloadFile.mock.calls[0] ?? [];
    expect(file?.name).toBe('bestreads-my-2026-in-books.png');
    expect(api.shareFile).not.toHaveBeenCalled();
  });

  it('opens the share sheet on phones, and closes with Escape', async () => {
    stubScreen(false);
    const user = userEvent.setup();
    renderYear();

    await user.click(await screen.findByRole('button', { name: 'Share my year' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Share' }));

    expect(api.shareFile).toHaveBeenCalledWith(expect.any(File), 'My 2026 in books');
    expect(api.downloadFile).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says when the image fails', async () => {
    const user = userEvent.setup();
    api.renderPng.mockRejectedValueOnce(new Error('canvas'));
    renderYear();

    await user.click(await screen.findByRole('button', { name: 'Share my year' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Download image|Share/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't create the image. Try again.");
  });

  it('is translated', async () => {
    renderYear(LIBRARY, { language: 'pt-BR' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Meu Ano 2026' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Livros por mês' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'abril: nenhum livro' })).toBeInTheDocument();
    expect(screen.getByText('livros terminados')).toBeInTheDocument();
  });
});
