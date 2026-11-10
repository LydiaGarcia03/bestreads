import { createTestLibraryBook } from '@/test/fakes';
import {
  currentPage,
  estimateFinish,
  isEveningTime,
  nextReadingDay,
  pagesLeft,
  pagesPlannedOn,
  parsePlanInput,
  pickTonightsBook,
  readPlan,
  type ReadingPlan,
  type Weekday,
} from './readingPlan';

/** Tuesday, 10 Nov 2026 (local time). */
const TUESDAY = new Date(2026, 10, 10);
const day = (date: number) => new Date(2026, 10, date);
const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const plan = (overrides: Partial<ReadingPlan> = {}): ReadingPlan => ({
  pagesPerDay: 20,
  time: '21:00',
  weekdays: EVERY_DAY,
  reminder: false,
  ...overrides,
});

describe('parsePlanInput', () => {
  const input = { pagesPerDay: '25', time: '22:30', weekdays: [5, 1, 1] as Weekday[], reminder: true };

  it('accepts whole pages, a time and sorted unique weekdays', () => {
    expect(parsePlanInput(input)).toEqual({
      ok: true,
      plan: { pagesPerDay: 25, time: '22:30', weekdays: [1, 5], reminder: true },
    });
    expect(parsePlanInput({ ...input, time: ' ', reminder: false })).toMatchObject({ ok: true, plan: { time: null } });
  });

  it('explains what is wrong', () => {
    expect(parsePlanInput({ ...input, pagesPerDay: '0' })).toEqual({ ok: false, error: 'invalidPages' });
    expect(parsePlanInput({ ...input, pagesPerDay: '1001' })).toEqual({ ok: false, error: 'invalidPages' });
    expect(parsePlanInput({ ...input, pagesPerDay: '2.5' })).toEqual({ ok: false, error: 'invalidPages' });
    expect(parsePlanInput({ ...input, time: '24:00' })).toEqual({ ok: false, error: 'invalidTime' });
    expect(parsePlanInput({ ...input, weekdays: [] })).toEqual({ ok: false, error: 'noWeekdays' });
    expect(parsePlanInput({ ...input, time: '' })).toEqual({ ok: false, error: 'reminderNeedsTime' });
  });
});

describe('readPlan', () => {
  it('reads a stored plan and drops malformed ones', () => {
    expect(readPlan({ pagesPerDay: 10, time: null, weekdays: [3, 1, 9], reminder: true })).toEqual({
      pagesPerDay: 10,
      time: null,
      weekdays: [1, 3],
      reminder: false,
    });
    expect(readPlan(null)).toBeNull();
    expect(readPlan({ pagesPerDay: 0, time: null, weekdays: [1], reminder: false })).toBeNull();
    expect(readPlan({ pagesPerDay: 10, time: '9pm', weekdays: [1], reminder: false })).toBeNull();
    expect(readPlan({ pagesPerDay: 10, time: null, weekdays: [], reminder: false })).toBeNull();
  });
});

describe('pages left', () => {
  it('works with pages and percentages', () => {
    expect(currentPage(null, 300)).toBe(0);
    expect(currentPage({ unit: 'pages', value: 120 }, null)).toBe(120);
    expect(currentPage({ unit: 'percent', value: 50 }, 300)).toBe(150);
    expect(currentPage({ unit: 'percent', value: 50 }, null)).toBeNull();

    expect(pagesLeft({ pageCount: 300, progress: { unit: 'pages', value: 120 } })).toBe(180);
    expect(pagesLeft({ pageCount: 300, progress: { unit: 'pages', value: 400 } })).toBe(0);
    expect(pagesLeft({ pageCount: null, progress: null })).toBeNull();
  });
});

describe('estimateFinish', () => {
  it('counts today when it is a reading day', () => {
    expect(estimateFinish(plan(), 20, TUESDAY)).toEqual(TUESDAY);
    expect(estimateFinish(plan(), 21, TUESDAY)).toEqual(day(11));
    expect(estimateFinish(plan(), 0, TUESDAY)).toEqual(TUESDAY);
  });

  it('only counts the chosen weekdays', () => {
    // Mondays and Wednesdays: Wed 11, Mon 16, Wed 18.
    expect(estimateFinish(plan({ weekdays: [1, 3] }), 60, TUESDAY)).toEqual(day(18));
  });

  it('handles long books over many weeks and months', () => {
    // Saturdays only, 1 page a day, 100 pages: the 100th Saturday from 14 Nov 2026.
    expect(estimateFinish(plan({ pagesPerDay: 1, weekdays: [6] }), 100, TUESDAY)).toEqual(new Date(2026, 10, 14 + 99 * 7));
  });

  it('needs the page count', () => {
    expect(estimateFinish(plan(), null, TUESDAY)).toBeNull();
  });
});

describe('pagesPlannedOn', () => {
  it('gives the daily pages, fewer near the end, only on reading days', () => {
    expect(pagesPlannedOn(plan(), 100, TUESDAY)).toBe(20);
    expect(pagesPlannedOn(plan(), 5, TUESDAY)).toBe(5);
    expect(pagesPlannedOn(plan(), null, TUESDAY)).toBe(20);
    expect(pagesPlannedOn(plan(), 0, TUESDAY)).toBeNull();
    expect(pagesPlannedOn(plan({ weekdays: [1] }), 100, TUESDAY)).toBeNull();
  });
});

describe('reading days', () => {
  it('finds the next reading day and tells evening sessions apart', () => {
    expect(nextReadingDay(plan(), TUESDAY)).toEqual(TUESDAY);
    expect(nextReadingDay(plan({ weekdays: [1] }), TUESDAY)).toEqual(day(16));
    expect(nextReadingDay(plan({ weekdays: [] }), TUESDAY)).toBeNull();
    expect(isEveningTime('17:00')).toBe(true);
    expect(isEveningTime('16:59')).toBe(false);
    expect(isEveningTime(null)).toBe(false);
  });
});

describe('pickTonightsBook', () => {
  const reading = (id: string, readingPlan: ReadingPlan | null) =>
    createTestLibraryBook({ id, status: 'reading', pageCount: 300, plan: readingPlan });

  it('picks the earliest session planned for today', () => {
    const books = [
      reading('none', null),
      reading('late', plan({ time: '22:00' })),
      reading('anytime', plan({ time: null })),
      reading('early', plan({ time: '07:30', pagesPerDay: 10 })),
      reading('monday', plan({ time: '06:00', weekdays: [1] })),
    ];
    expect(pickTonightsBook(books, TUESDAY)).toMatchObject({ book: { id: 'early' }, pages: 10 });
  });

  it('is empty without a plan for today', () => {
    expect(pickTonightsBook([reading('none', null)], TUESDAY)).toBeNull();
    expect(pickTonightsBook([], TUESDAY)).toBeNull();
  });
});
