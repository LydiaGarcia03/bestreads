import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { CatalogError } from '@/features/catalog';
import {
  createTestBook,
  createTestLibraryBook,
  FakeCatalog,
  FakeLibraryRepository,
  TEST_USER,
} from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from './BookPage';
import { toCalendarDay } from './reads';

function renderBook(bookId: string, options: RenderWithProvidersOptions = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: `/book/${bookId}`, ...options },
  );
}

const statusButton = (name: RegExp) => screen.findByRole('button', { name });

describe('BookPage', () => {
  it('shows a catalog book and adds it to the library with the chosen status', async () => {
    const user = userEvent.setup();
    const catalog = new FakeCatalog([createTestBook({ description: 'A lone astronaut.' })]);
    const { library } = renderBook('vol-1', { catalog });

    expect(await screen.findByRole('heading', { level: 1, name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(screen.getByText('by Andy Weir')).toBeInTheDocument();
    expect(screen.getByText('476 pages · 2021')).toBeInTheDocument();
    expect(screen.getByText('A lone astronaut.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cover of Project Hail Mary' })).toBeInTheDocument();

    await user.click(await statusButton(/Add to library/));
    const menu = screen.getByRole('menu', { name: 'Reading status' });
    expect(within(menu).queryByRole('menuitem', { name: 'Remove from library' })).not.toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitemradio', { name: 'Currently reading' }));

    expect(await statusButton(/Reading status: Currently reading/)).toBeInTheDocument();
    expect(library.addBook).toHaveBeenCalledWith(
      TEST_USER.uid,
      createTestBook({ description: 'A lone astronaut.' }),
      'reading',
      toCalendarDay(new Date()),
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows a library book without calling the catalog, and changes its status', async () => {
    const user = userEvent.setup();
    const library = new FakeLibraryRepository([
      createTestLibraryBook({
        status: 'reading',
        title: 'My copy',
        reads: [{ startedOn: '2026-10-01', finishedOn: null }],
      }),
    ]);
    const { catalog } = renderBook('vol-1', { library });

    expect(await screen.findByRole('heading', { level: 1, name: 'My copy' })).toBeInTheDocument();
    expect(catalog.getBook).not.toHaveBeenCalled();

    await user.click(await statusButton(/Reading status: Currently reading/));
    expect(screen.getByRole('menuitemradio', { name: 'Currently reading' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('menuitemradio', { name: 'Read' }));

    expect(await statusButton(/Reading status: Read/)).toBeInTheDocument();
    // Finishing the book also closes the open read today.
    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      status: 'read',
      reads: [{ startedOn: '2026-10-01', finishedOn: toCalendarDay(new Date()) }],
    });
  });

  it('removes a book only after confirmation', async () => {
    const user = userEvent.setup();
    const library = new FakeLibraryRepository([createTestLibraryBook({ status: 'read' })]);
    const catalog = new FakeCatalog([createTestBook()]);
    renderBook('vol-1', { library, catalog });

    await user.click(await statusButton(/Reading status: Read/));
    await user.click(screen.getByRole('menuitem', { name: 'Remove from library' }));
    const confirmation = screen.getByRole('group', { name: 'Remove from library' });
    expect(confirmation).toHaveTextContent('Remove “Project Hail Mary” from your library?');

    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: 'Remove from library' })).not.toBeInTheDocument();
    expect(library.removeBook).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Reading status: Read/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Remove from library' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await statusButton(/Add to library/)).toBeInTheDocument();
    expect(library.removeBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1');
  });

  it('works with the keyboard and returns focus to the status button', async () => {
    const user = userEvent.setup();
    renderBook('vol-1', { catalog: new FakeCatalog([createTestBook()]) });

    const button = await statusButton(/Add to library/);
    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitemradio', { name: 'Want to read' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Currently reading' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('menuitemradio', { name: 'Read' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderBook('vol-1', { catalog: new FakeCatalog([createTestBook()]) });

    await user.click(await statusButton(/Add to library/));
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows an error when saving fails', async () => {
    const user = userEvent.setup();
    const library = new FakeLibraryRepository();
    library.addBook.mockRejectedValueOnce(new Error('permission-denied'));
    renderBook('vol-1', { library, catalog: new FakeCatalog([createTestBook()]) });

    await user.click(await statusButton(/Add to library/));
    await user.click(screen.getByRole('menuitemradio', { name: 'Want to read' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save.");
    expect(screen.getByRole('button', { name: /Add to library/ })).toBeEnabled();
  });

  it('says when no catalog knows the book', async () => {
    renderBook('unknown');
    expect(await screen.findByRole('heading', { level: 1, name: 'Book not found' })).toBeInTheDocument();
  });

  it('shows a load error with retry', async () => {
    const user = userEvent.setup();
    const catalog = new FakeCatalog([createTestBook()]);
    catalog.getBook.mockRejectedValueOnce(new CatalogError('HTTP 503'));
    renderBook('vol-1', { catalog });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this book.");
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Project Hail Mary' })).toBeInTheDocument();
  });

  it('collapses long descriptions', async () => {
    const user = userEvent.setup();
    renderBook('vol-1', { catalog: new FakeCatalog([createTestBook({ description: 'x'.repeat(500) })]) });

    const toggle = await screen.findByRole('button', { name: 'Show more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('is translated', async () => {
    renderBook('vol-1', {
      language: 'pt-BR',
      library: new FakeLibraryRepository([createTestLibraryBook({ status: 'wantToRead' })]),
    });

    expect(await screen.findByText('de Andy Weir')).toBeInTheDocument();
    expect(screen.getByText('476 páginas · 2021')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Quero ler/ })).toBeInTheDocument());
  });
});
