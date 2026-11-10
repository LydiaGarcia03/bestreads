import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';

/** Makes `useMediaQuery` report a phone (no match for the desktop query) or a desktop. */
function stubScreen(isDesktop: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: isDesktop, addEventListener: () => {}, removeEventListener: () => {} })),
  );
}

function renderReview(savedText: string | null, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([createTestLibraryBook({ status: 'read' })]);
  if (savedText) library.reviews.set('vol-1', { text: savedText, updatedAt: null });
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { library };
}

const section = () => screen.findByRole('region', { name: 'My review' });

describe('ReviewSection', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('on desktop', () => {
    beforeEach(() => stubScreen(true));

    it('edits the review in place, marked as private', async () => {
      const user = userEvent.setup();
      const { library } = renderReview(null);
      const review = await section();
      expect(within(review).getByText('Only you can see this')).toBeInTheDocument();

      const field = await within(review).findByRole('textbox', { name: 'My review' });
      const save = within(review).getByRole('button', { name: 'Save review' });
      expect(save).toBeDisabled();

      await user.type(field, '  Loved the science.  ');
      await user.click(save);

      expect(await within(review).findByText('Saved')).toBeInTheDocument();
      expect(library.saveReview).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', 'Loved the science.');
      expect(save).toBeDisabled();
    });

    it('discards unsaved changes', async () => {
      const user = userEvent.setup();
      renderReview('Great.');
      const field = await within(await section()).findByRole('textbox', { name: 'My review' });

      await user.type(field, ' More.');
      await user.click(screen.getByRole('button', { name: 'Discard changes' }));

      expect(field).toHaveValue('Great.');
    });

    it('says when saving fails', async () => {
      const user = userEvent.setup();
      const { library } = renderReview(null);
      library.saveReview.mockRejectedValueOnce(new Error('offline'));
      const review = await section();

      await user.type(await within(review).findByRole('textbox', { name: 'My review' }), 'Hi');
      await user.click(within(review).getByRole('button', { name: 'Save review' }));

      expect(await within(review).findByRole('alert')).toHaveTextContent("Couldn't save your review.");
    });
  });

  describe('on a phone', () => {
    beforeEach(() => stubScreen(false));

    it('shows a preview and opens a full-screen editor', async () => {
      const user = userEvent.setup();
      const { library } = renderReview('First paragraph.\n\nSecond paragraph.');
      const review = await section();

      expect(await within(review).findByText('First paragraph.')).toBeInTheDocument();
      expect(within(review).queryByRole('textbox')).not.toBeInTheDocument();

      await user.click(within(review).getByRole('button', { name: 'Edit review' }));
      const dialog = screen.getByRole('dialog', { name: 'Review of Project Hail Mary' });
      const field = within(dialog).getByRole('textbox', { name: 'My review' });
      expect(field).toHaveFocus();

      await user.clear(field);
      await user.type(field, 'Rewritten.');
      await user.click(within(dialog).getByRole('button', { name: 'Save review' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await within(review).findByText('Rewritten.')).toBeInTheDocument();
      expect(library.saveReview).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', 'Rewritten.');
      expect(within(review).getByRole('button', { name: 'Edit review' })).toHaveFocus();
    });

    it('asks before discarding changes, and closes at once without changes', async () => {
      const user = userEvent.setup();
      renderReview(null);
      const review = await section();

      await user.click(await within(review).findByRole('button', { name: 'Add review' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(within(review).getByRole('button', { name: 'Add review' }));
      await user.type(screen.getByRole('textbox', { name: 'My review' }), 'Draft');
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

      const confirm = screen.getByRole('alertdialog', { name: 'Discard the changes to your review?' });
      await user.click(within(confirm).getByRole('button', { name: 'Keep editing' }));
      expect(screen.getByRole('textbox', { name: 'My review' })).toHaveValue('Draft');

      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
      await user.click(screen.getByRole('button', { name: 'Discard changes' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('is translated', async () => {
    stubScreen(false);
    renderReview(null, { language: 'pt-BR' });
    const review = await screen.findByRole('region', { name: 'Minha resenha' });
    expect(within(review).getByText('Só você vê isto')).toBeInTheDocument();
    expect(await within(review).findByRole('button', { name: 'Adicionar resenha' })).toBeInTheDocument();
  });
});
