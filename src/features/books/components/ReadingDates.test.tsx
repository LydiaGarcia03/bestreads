import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';

function renderDates(book: Partial<LibraryBook> = {}, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([
    createTestLibraryBook({ status: 'read', reads: [{ startedOn: '2026-11-03', finishedOn: null }], ...book }),
  ]);
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { library };
}

const section = () => screen.findByRole('region', { name: 'Reading dates' });
/** Picking a date in the native picker fires a change event with the full date. */
const pickDate = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });

describe('ReadingDates', () => {
  it('shows the dates of a read, with "Add date" for a missing one', async () => {
    const dates = await (renderDates(), section());

    expect(within(dates).getByText('Nov 3, 2026')).toBeInTheDocument();
    expect(within(dates).getByText('Add date')).toBeInTheDocument();
    expect(within(dates).getByLabelText('Started')).toHaveValue('2026-11-03');
    expect(within(dates).getByLabelText('Finished')).toHaveValue('');
  });

  it('saves a picked date', async () => {
    const { library } = renderDates();
    const dates = await section();

    pickDate(within(dates).getByLabelText('Finished'), '2026-11-08');

    expect(await within(dates).findByText('Nov 8, 2026')).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      reads: [{ startedOn: '2026-11-03', finishedOn: '2026-11-08' }],
    });
  });

  it('clears a date', async () => {
    const user = userEvent.setup();
    const { library } = renderDates();
    const dates = await section();
    expect(within(dates).queryByRole('button', { name: 'Clear date: Finished' })).not.toBeInTheDocument();

    await user.click(within(dates).getByRole('button', { name: 'Clear date: Started' }));

    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      reads: [{ startedOn: null, finishedOn: null }],
    });
  });

  it('refuses a finish date before the start date', async () => {
    const { library } = renderDates();
    const dates = await section();

    pickDate(within(dates).getByLabelText('Finished'), '2026-11-01');

    expect(within(dates).getByRole('alert')).toHaveTextContent("The finish date can't be before the start date.");
    expect(library.updateBook).not.toHaveBeenCalled();
  });

  it('lists re-reads newest first and removes one', async () => {
    const user = userEvent.setup();
    const { library } = renderDates({
      reads: [
        { startedOn: '2025-01-01', finishedOn: '2025-02-01' },
        { startedOn: '2026-11-03', finishedOn: null },
      ],
    });
    const dates = await section();

    const reads = within(dates).getAllByRole('group');
    expect(reads.map((read) => read.getAttribute('aria-label'))).toEqual(['Read 2', 'Read 1']);

    await user.click(within(reads[1] as HTMLElement).getByRole('button', { name: 'Remove' }));
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      reads: [{ startedOn: '2026-11-03', finishedOn: null }],
    });
  });

  it('adds a past read before the others', async () => {
    const user = userEvent.setup();
    const { library } = renderDates();
    await section();

    await user.click(screen.getByRole('button', { name: '+ Add a past read' }));

    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      reads: [
        { startedOn: null, finishedOn: null },
        { startedOn: '2026-11-03', finishedOn: null },
      ],
    });
    expect(within(await section()).getAllByRole('group')).toHaveLength(2);
  });

  it('is hidden for a book to read later that was never read', async () => {
    renderDates({ status: 'wantToRead', reads: [] });
    expect(await screen.findByRole('region', { name: 'My rating' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reading dates' })).not.toBeInTheDocument();
  });

  it('formats dates in Portuguese', async () => {
    renderDates({}, { language: 'pt-BR' });
    const dates = await screen.findByRole('region', { name: 'Datas de leitura' });
    expect(within(dates).getByText(/3 de nov\.? de 2026/)).toBeInTheDocument();
    expect(within(dates).getByText('Adicionar data')).toBeInTheDocument();
  });
});
