import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import { CoverImageError, resizeCoverImage } from '../coverImage';
import type { LibraryBook } from '../library';

// Canvas and image decoding don't exist in jsdom; the resizing itself is browser-only.
vi.mock('../coverImage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../coverImage')>()),
  resizeCoverImage: vi.fn(),
}));

const RESIZED = 'data:image/webp;base64,UkVTSVpFRA==';
const API_COVER = 'https://books.example/cover.jpg';

function renderBook(book: Partial<LibraryBook> = {}, savedCover?: string) {
  const library = new FakeLibraryRepository([createTestLibraryBook({ status: 'read', ...book })]);
  if (savedCover) library.covers.set('vol-1', savedCover);
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library },
  );
  return { library };
}

const bookCover = () => screen.findByRole('img', { name: 'Cover of Project Hail Mary' });
const photo = (type = 'image/jpeg') => new File(['x'], 'photo.jpg', { type });
const dialog = () => screen.getByRole('dialog', { name: 'Your cover' });

/** A paste or drop event carrying `files` (jsdom has no DataTransfer constructor). */
function transferOf(files: File[]) {
  return { files, items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })) };
}

async function openDialog(user: ReturnType<typeof userEvent.setup>, name = 'Change cover (only you)') {
  await bookCover();
  await user.click(screen.getByRole('button', { name }));
  return dialog();
}

describe('ChangeCover dialog', () => {
  beforeEach(() => {
    vi.mocked(resizeCoverImage).mockReset();
    vi.mocked(resizeCoverImage).mockResolvedValue(RESIZED);
  });

  it('uploads a chosen file, previews it and saves it as the cover', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();
    expect(await bookCover()).toHaveAttribute('src', API_COVER);

    const cover = await openDialog(user);
    expect(cover).toHaveAccessibleDescription(/Only you will see it/);
    expect(within(cover).getByRole('button', { name: 'Save cover' })).toBeDisabled();

    await user.upload(within(cover).getByLabelText('Choose a file'), photo());
    expect(await within(cover).findByRole('img', { name: 'Preview of your cover' })).toHaveAttribute('src', RESIZED);

    await user.click(within(cover).getByRole('button', { name: 'Save cover' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(library.savePersonalCover).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', RESIZED);
    expect(await bookCover()).toHaveAttribute('src', RESIZED);
    expect(screen.getByRole('button', { name: 'Change my cover' })).toHaveFocus();
  });

  it('takes a pasted image', async () => {
    const user = userEvent.setup();
    renderBook();
    const cover = await openDialog(user);

    const paste = createEvent.paste(document, { clipboardData: transferOf([photo('image/png')]) });
    fireEvent(document, paste);

    expect(await within(cover).findByRole('img', { name: 'Preview of your cover' })).toBeInTheDocument();
  });

  it('takes a dropped image, and explains a paste without an image', async () => {
    const user = userEvent.setup();
    renderBook();
    const cover = await openDialog(user);

    fireEvent(document, createEvent.paste(document, { clipboardData: transferOf([]) }));
    expect(within(cover).getByRole('alert')).toHaveTextContent("There's no image to use.");

    fireEvent.drop(within(cover).getByText('Drag and drop an image here'), { dataTransfer: transferOf([photo()]) });
    expect(await within(cover).findByRole('img', { name: 'Preview of your cover' })).toBeInTheDocument();
  });

  it('explains files it cannot use', async () => {
    const user = userEvent.setup({ applyAccept: false });
    vi.mocked(resizeCoverImage).mockRejectedValue(new CoverImageError('unreadable'));
    const { library } = renderBook();
    const cover = await openDialog(user);

    await user.upload(within(cover).getByLabelText('Choose a file'), photo('application/pdf'));
    expect(within(cover).getByRole('alert')).toHaveTextContent('Choose an image file.');

    await user.upload(within(cover).getByLabelText('Choose a file'), photo());
    expect(await within(cover).findByText(/Couldn't read that image/)).toBeInTheDocument();
    expect(library.savePersonalCover).not.toHaveBeenCalled();
  });

  it('removes a personal cover back to the API cover', async () => {
    const user = userEvent.setup();
    const { library } = renderBook({ hasPersonalCover: true }, RESIZED);
    await waitFor(async () => expect(await bookCover()).toHaveAttribute('src', RESIZED));

    const cover = await openDialog(user, 'Change my cover');
    await user.click(within(cover).getByRole('button', { name: 'Remove my cover' }));

    await waitFor(async () => expect(await bookCover()).toHaveAttribute('src', API_COVER));
    expect(library.savePersonalCover).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', null);
  });

  it('closes with Escape or Cancel without saving', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();

    await openDialog(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const cover = await openDialog(user);
    await user.click(within(cover).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(library.savePersonalCover).not.toHaveBeenCalled();
  });

  it('never requests a personal cover for books without one', async () => {
    const { library } = renderBook();
    await bookCover();
    expect(library.getPersonalCover).not.toHaveBeenCalled();
  });

  it('says when saving fails', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();
    library.savePersonalCover.mockRejectedValueOnce(new Error('offline'));
    const cover = await openDialog(user);

    await user.upload(within(cover).getByLabelText('Choose a file'), photo());
    await user.click(await within(cover).findByRole('button', { name: 'Save cover' }));

    expect(await within(cover).findByRole('alert')).toHaveTextContent("Couldn't save your cover.");
    expect(dialog()).toBeInTheDocument();
  });
});
