import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';
import { toCalendarDay } from '../reads';

function renderProgress(book: Partial<LibraryBook> = {}, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([
    createTestLibraryBook({ status: 'reading', pageCount: 444, reads: [{ startedOn: '2026-11-01', finishedOn: null }], ...book }),
  ]);
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { library };
}

const section = () => screen.findByRole('region', { name: 'Progress' });

describe('ProgressSection', () => {
  it('shows the share read, the page and a progress bar', async () => {
    renderProgress({ progress: { unit: 'pages', value: 111 } });
    const progress = await section();

    expect(within(progress).getByText('25%')).toBeInTheDocument();
    expect(within(progress).getByText('page 111 of 444')).toBeInTheDocument();
    expect(within(progress).getByRole('progressbar', { name: 'Progress' })).toHaveAttribute('aria-valuenow', '25');
  });

  it('updates the page', async () => {
    const user = userEvent.setup();
    const { library } = renderProgress();
    expect(within(await section()).getByText('Not started yet')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update progress' }));
    const field = screen.getByRole('textbox', { name: "I'm on page" });
    expect(field).toHaveFocus();
    await user.type(field, '296{Enter}');

    expect(screen.getByText('page 296 of 444')).toBeInTheDocument();
    expect(screen.getByText('66%')).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      progress: { unit: 'pages', value: 296 },
    });
  });

  it('switches to a percentage, converting the value', async () => {
    const user = userEvent.setup();
    const { library } = renderProgress({ progress: { unit: 'pages', value: 111 } });
    await section();

    await user.click(screen.getByRole('button', { name: 'Update progress' }));
    await user.click(screen.getByRole('button', { name: '%' }));

    expect(screen.getByRole('button', { name: '%' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('textbox', { name: "I'm at" })).toHaveValue('25');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', { progress: { unit: 'percent', value: 25 } });
  });

  it('explains invalid values and keeps the form open', async () => {
    const user = userEvent.setup();
    const { library } = renderProgress();
    await section();

    await user.click(screen.getByRole('button', { name: 'Update progress' }));
    const field = screen.getByRole('textbox', { name: "I'm on page" });
    await user.type(field, '500{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('This book has 444 pages.');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    await user.clear(field);
    await user.type(field, 'abc{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number.');
    expect(library.updateBook).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('offers to mark the book as read once finished', async () => {
    const user = userEvent.setup();
    const { library } = renderProgress({ progress: { unit: 'pages', value: 444 } });
    await section();

    await user.click(screen.getByRole('button', { name: 'Mark as read' }));

    expect(await screen.findByRole('button', { name: /Reading status: Read/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Progress' })).not.toBeInTheDocument();
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      status: 'read',
      reads: [{ startedOn: '2026-11-01', finishedOn: toCalendarDay(new Date()) }],
    });
  });

  it('is shown only while reading', async () => {
    renderProgress({ status: 'wantToRead', reads: [] });
    expect(await screen.findByRole('region', { name: 'My rating' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Progress' })).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    renderProgress({ progress: { unit: 'pages', value: 111 } }, { language: 'pt-BR' });
    const progress = await screen.findByRole('region', { name: 'Progresso' });
    expect(within(progress).getByText('página 111 de 444')).toBeInTheDocument();
    expect(within(progress).getByRole('button', { name: 'Atualizar progresso' })).toBeInTheDocument();
  });
});
