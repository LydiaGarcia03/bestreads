import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { createTestLibraryBook, FakeLibraryRepository, TEST_USER } from '@/test/fakes';
import { renderWithProviders, type RenderWithProvidersOptions } from '@/test/renderWithProviders';
import { BookPage } from '../BookPage';
import type { LibraryBook } from '../library';
import type { ReadingPlan } from '../readingPlan';

const PLAN: ReadingPlan = { pagesPerDay: 25, time: '22:00', weekdays: [0, 1, 2, 3, 4, 5, 6], reminder: false };

function renderBook(book: Partial<LibraryBook> = {}, options: RenderWithProvidersOptions = {}) {
  const library = new FakeLibraryRepository([
    createTestLibraryBook({ status: 'reading', pageCount: 300, progress: { unit: 'pages', value: 100 }, ...book }),
  ]);
  renderWithProviders(
    <Routes>
      <Route path="/book/:bookId" element={<BookPage />} />
    </Routes>,
    { route: '/book/vol-1', library, ...options },
  );
  return { library };
}

const planSection = async () => within(await screen.findByRole('region', { name: 'Reading plan' }));

describe('ReadingPlanSection', () => {
  beforeEach(() => {
    // Tuesday, 10 Nov 2026, 12:00. Only the date is faked, so user events keep their timers.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 10, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('creates a plan with the finish estimate', async () => {
    const user = userEvent.setup();
    const { library } = renderBook();

    await user.click(await screen.findByRole('button', { name: /Add reading plan/ }));
    const form = screen.getByRole('form', { name: 'Reading plan' });
    const pages = within(form).getByRole('textbox', { name: 'Pages per day' });
    expect(pages).toHaveFocus();
    await user.clear(pages);
    await user.type(pages, '50');
    // 200 pages left at 50 a day, every day from today: Fri 13 Nov.
    expect(within(form).getByText('At this pace you finish around Nov 13.')).toBeInTheDocument();

    await user.click(within(form).getByRole('button', { name: 'Saturday' }));
    await user.click(within(form).getByRole('button', { name: 'Sunday' }));
    await user.click(within(form).getByRole('button', { name: 'Save plan' }));

    expect(library.updateBook).toHaveBeenCalledWith(TEST_USER.uid, 'vol-1', {
      plan: { pagesPerDay: 50, time: '21:00', weekdays: [1, 2, 3, 4, 5], reminder: false },
    });
    expect(
      await (await planSection()).findByText('Tonight at 9:00 PM · Mon, Tue, Wed, Thu, Fri · 50 pages a day · finishing around Nov 13'),
    ).toBeInTheDocument();
  });

  it('explains invalid input', async () => {
    const user = userEvent.setup();
    renderBook();
    await user.click(await screen.findByRole('button', { name: /Add reading plan/ }));
    const form = screen.getByRole('form', { name: 'Reading plan' });

    await user.clear(within(form).getByRole('textbox', { name: 'Pages per day' }));
    await user.click(within(form).getByRole('button', { name: 'Save plan' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('Use a whole number from 1 to 1000.');

    await user.type(within(form).getByRole('textbox', { name: 'Pages per day' }), '10');
    for (const day of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
      await user.click(within(form).getByRole('button', { name: day }));
    }
    await user.click(within(form).getByRole('button', { name: 'Save plan' }));
    expect(within(form).getByRole('alert')).toHaveTextContent('Pick at least one day.');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('form', { name: 'Reading plan' })).not.toBeInTheDocument();
  });

  it('shows the next session, offers the calendar reminder, edits and removes the plan', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:plan');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { library } = renderBook({ plan: { ...PLAN, weekdays: [3], reminder: true } });
    const section = await planSection();

    expect(section.getByText('Next: Wed at 10:00 PM · Wed · 25 pages a day · finishing around Dec 30')).toBeInTheDocument();
    await user.click(section.getByRole('button', { name: 'Add reminder to calendar' }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();

    await user.click(section.getByRole('button', { name: 'Edit plan' }));
    expect(screen.getByRole('button', { name: 'Wednesday' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(section.getByRole('button', { name: 'Remove the reading plan' }));
    expect(library.updateBook).toHaveBeenLastCalledWith(TEST_USER.uid, 'vol-1', { plan: null });
    expect(await screen.findByRole('button', { name: /Add reading plan/ })).toBeInTheDocument();
    click.mockRestore();
  });

  it('asks for the page count to estimate the finish', async () => {
    renderBook({ pageCount: null, progress: { unit: 'percent', value: 40 }, plan: PLAN });
    expect(await (await planSection()).findByText(/the finish date needs the book's page count/)).toBeInTheDocument();
  });

  it('is only shown while reading', async () => {
    renderBook({ status: 'read' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Project Hail Mary' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Reading plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add reading plan/ })).not.toBeInTheDocument();
  });

  it('is translated', async () => {
    renderBook({ plan: PLAN }, { language: 'pt-BR' });
    const section = within(await screen.findByRole('region', { name: 'Plano de leitura' }));
    expect(await section.findByText(/^Hoje à noite, às 22:00 · Todos os dias · 25 páginas por dia/)).toBeInTheDocument();
  });
});
