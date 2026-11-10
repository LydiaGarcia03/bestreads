import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';

function renderBook(book: Partial<LibraryBook> = {}, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([
    createTestLibraryBook({ status: 'read', ...book }),
    createTestLibraryBook({ id: 'other', title: 'Dune', series: { name: 'Dune', volume: 1 } }),
  ]);
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { library };
}

describe('SeriesEditor', () => {
  it('shows the series and volume, and edits them', async () => {
    const user = userEvent.setup();
    const { library } = renderBook({ series: { name: 'Hail Mary', volume: 1 } });

    expect(await screen.findByText('Hail Mary · Book 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const form = screen.getByRole('form', { name: 'Series' });
    expect(within(form).getByRole('combobox', { name: 'Series name' })).toHaveFocus();
    const volume = within(form).getByRole('textbox', { name: 'Book #' });
    await user.clear(volume);
    await user.type(volume, '2,5{Enter}');

    expect(await screen.findByText('Hail Mary · Book 2.5')).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      series: { name: 'Hail Mary', volume: 2.5 },
    });
  });

  it('adds a book to a series, suggesting the ones already in the library', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();

    await user.click(await screen.findByRole('button', { name: '+ Add to a series' }));
    const form = screen.getByRole('form', { name: 'Series' });
    const nameField = within(form).getByRole('combobox', { name: 'Series name' });
    // The browser shows the datalist's options as suggestions for the field.
    const suggestions = () => [...(nameField as HTMLInputElement).list!.options].map((option) => option.value);
    await vi.waitFor(() => expect(suggestions()).toEqual(['Dune']));

    await user.type(nameField, 'Dune');
    await user.click(within(form).getByRole('button', { name: 'Save' }));

    // The series panel appears for the new series.
    expect(await screen.findByRole('heading', { level: 2, name: 'Dune' })).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', { series: { name: 'Dune', volume: null } });
  });

  it('explains an invalid volume and removes the series', async () => {
    const user = userEvent.setup();
    const { library } = renderBook({ series: { name: 'Dune', volume: 3 } });

    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const form = screen.getByRole('form', { name: 'Series' });
    const volume = within(form).getByRole('textbox', { name: 'Book #' });
    await user.clear(volume);
    await user.type(volume, 'three{Enter}');
    expect(within(form).getByRole('alert')).toHaveTextContent('Use a number from 0 to 1000');

    await user.click(within(form).getByRole('button', { name: 'Not in a series' }));
    expect(await screen.findByRole('button', { name: '+ Add to a series' })).toBeInTheDocument();
    expect(library.updateBook).toHaveBeenLastCalledWith(TEST_USER.uid, 'vol-1', { series: null });
  });

  it('closes the form with Escape', async () => {
    const user = userEvent.setup();
    renderBook();
    await user.click(await screen.findByRole('button', { name: '+ Add to a series' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('form', { name: 'Series' })).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    renderBook({ series: { name: 'Duna', volume: 1 } }, { language: 'pt-BR' });
    expect(await screen.findByText('Duna · Livro 1')).toBeInTheDocument();
  });
});
