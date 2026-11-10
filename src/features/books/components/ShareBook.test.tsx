import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import * as shareApi from '@/features/share/shareApi';
import { createTestLibraryBook, FakeLibraryRepository } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';

vi.mock('@/features/share/shareApi', () => ({
  renderPng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  loadShareableImage: vi.fn(async () => 'data:image/png;base64,Y292ZXI='),
  canShareFiles: vi.fn(() => true),
  shareFile: vi.fn(async () => true),
  downloadFile: vi.fn(),
}));

const api = vi.mocked(shareApi);

function renderBook(overrides: Partial<LibraryBook> = {}, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([
    createTestLibraryBook({
      status: 'read',
      rating: 4.5,
      coverUrl: 'https://covers.example/phm.jpg',
      reads: [{ startedOn: '2026-10-01', finishedOn: '2026-11-03' }],
      ...overrides,
    }),
  ]);
  library.covers.set('vol-1', 'data:image/webp;base64,cHJpdmF0ZQ==');
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { library };
}

describe('ShareBook', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a card with the catalog cover, title, author, rating and finish month', async () => {
    const user = userEvent.setup();
    renderBook({ hasPersonalCover: true });

    await user.click(await screen.findByRole('button', { name: 'Share' }));

    const dialog = screen.getByRole('dialog', { name: 'Share this book' });
    expect(within(dialog).getByRole('heading', { name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(within(dialog).getByText('Andy Weir')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: '4.5 out of 5' })).toBeInTheDocument();
    expect(within(dialog).getByText('Finished in November 2026')).toBeInTheDocument();
    // The personal cover is private: the card only ever asks for the catalog cover.
    expect(api.loadShareableImage).toHaveBeenCalledWith('https://covers.example/phm.jpg');
    expect(api.loadShareableImage).toHaveBeenCalledTimes(1);
    expect(await within(dialog).findByRole('presentation')).toHaveAttribute('src', 'data:image/png;base64,Y292ZXI=');
  });

  it('shows the status for books not finished, without stars when unrated', async () => {
    const user = userEvent.setup();
    renderBook({ status: 'reading', rating: null, reads: [{ startedOn: '2026-11-01', finishedOn: null }] });

    await user.click(await screen.findByRole('button', { name: 'Share' }));

    const dialog = screen.getByRole('dialog', { name: 'Share this book' });
    expect(within(dialog).getByText('Currently reading')).toBeInTheDocument();
    expect(within(dialog).queryByRole('img', { name: /out of 5/ })).not.toBeInTheDocument();
  });

  it('uses a title placeholder when the cover cannot be read', async () => {
    const user = userEvent.setup();
    api.loadShareableImage.mockResolvedValueOnce(null);
    renderBook();

    await user.click(await screen.findByRole('button', { name: 'Share' }));

    const dialog = screen.getByRole('dialog', { name: 'Share this book' });
    expect(within(dialog).queryByRole('presentation')).not.toBeInTheDocument();
    expect(within(dialog).getAllByText('Project Hail Mary')).toHaveLength(2);
  });

  it('downloads the card as a PNG named after the book, then closes', async () => {
    const user = userEvent.setup();
    renderBook();

    await user.click(await screen.findByRole('button', { name: 'Share' }));
    const dialog = screen.getByRole('dialog', { name: 'Share this book' });
    await user.click(within(dialog).getByRole('button', { name: 'Download image' }));

    expect(await within(dialog).findByText('Image downloaded.')).toBeInTheDocument();
    expect(api.downloadFile.mock.calls[0]?.[0].name).toBe('bestreads-project-hail-mary.png');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    const user = userEvent.setup();
    renderBook({}, { language: 'pt-BR' });

    await user.click(await screen.findByRole('button', { name: 'Compartilhar' }));

    const dialog = screen.getByRole('dialog', { name: 'Compartilhar este livro' });
    expect(within(dialog).getByText('Terminado em novembro de 2026')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Baixar imagem' })).toBeInTheDocument();
  });
});
