/**
 * Reading plan of a book being read: pages per day on chosen weekdays, at an optional time, with an
 * optional reminder. Validation, estimates and "Tonight's book". Pure, no React or I/O.
 * Mirrored in `firestore.rules` (`isValidPlan`).
 */
import type { LibraryBook, ReadingProgress } from './library';
import { MAX_PERCENT } from './progress';

/** Day of the week as `Date.getDay()`: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const DAYS_PER_WEEK = WEEKDAYS.length;

export interface ReadingPlan {
  /** Whole pages, 1 to `PLAN_LIMITS.pagesPerDay`. */
  pagesPerDay: number;
  /** Local time of the reading session, `HH:MM` (24 h), or `null` for "any time". */
  time: string | null;
  /** Reading days, sorted, at least one. */
  weekdays: Weekday[];
  /** A reminder at `time` (needs a time). */
  reminder: boolean;
}

export const PLAN_LIMITS = { pagesPerDay: 1000 } as const;

export const DEFAULT_PLAN: ReadingPlan = { pagesPerDay: 20, time: '21:00', weekdays: [...WEEKDAYS], reminder: false };

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidPlanTime = (time: string) => TIME_PATTERN.test(time);

const isWeekday = (value: unknown): value is Weekday =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < DAYS_PER_WEEK;

/** Unique weekdays in week order. */
export const normalizeWeekdays = (days: readonly Weekday[]): Weekday[] => WEEKDAYS.filter((day) => days.includes(day));

export type PlanInputError = 'invalidPages' | 'invalidTime' | 'noWeekdays' | 'reminderNeedsTime';

export interface PlanInput {
  pagesPerDay: string;
  time: string;
  weekdays: readonly Weekday[];
  reminder: boolean;
}

export type PlanInputResult = { ok: true; plan: ReadingPlan } | { ok: false; error: PlanInputError };

/** Checks the editor's fields: whole pages within limits, a valid or empty time, at least one day. */
export function parsePlanInput(input: PlanInput): PlanInputResult {
  const pagesText = input.pagesPerDay.trim();
  const pages = Number(pagesText);
  if (!/^\d+$/.test(pagesText) || pages < 1 || pages > PLAN_LIMITS.pagesPerDay) return { ok: false, error: 'invalidPages' };
  const time = input.time.trim() || null;
  if (time !== null && !isValidPlanTime(time)) return { ok: false, error: 'invalidTime' };
  const weekdays = normalizeWeekdays(input.weekdays);
  if (weekdays.length === 0) return { ok: false, error: 'noWeekdays' };
  if (input.reminder && time === null) return { ok: false, error: 'reminderNeedsTime' };
  return { ok: true, plan: { pagesPerDay: pages, time, weekdays, reminder: input.reminder } };
}

/** A stored plan, or `null` when missing or malformed. */
export function readPlan(value: unknown): ReadingPlan | null {
  if (typeof value !== 'object' || value === null) return null;
  const { pagesPerDay, time, weekdays, reminder } = value as Record<string, unknown>;
  if (typeof pagesPerDay !== 'number' || !Number.isInteger(pagesPerDay) || pagesPerDay < 1) return null;
  if (time !== null && (typeof time !== 'string' || !isValidPlanTime(time))) return null;
  if (!Array.isArray(weekdays)) return null;
  const days = normalizeWeekdays(weekdays.filter(isWeekday));
  if (days.length === 0) return null;
  return { pagesPerDay, time, weekdays: days, reminder: reminder === true && time !== null };
}

/** The current page: the page itself, or the share of `pageCount`; 0 before starting. */
export function currentPage(progress: ReadingProgress | null, pageCount: number | null): number | null {
  if (!progress) return 0;
  if (progress.unit === 'pages') return progress.value;
  if (!pageCount) return null;
  return Math.round((progress.value / MAX_PERCENT) * pageCount);
}

/** Pages still to read, or `null` without a page count. */
export function pagesLeft(book: Pick<LibraryBook, 'progress' | 'pageCount'>): number | null {
  if (!book.pageCount) return null;
  const page = currentPage(book.progress, book.pageCount);
  return page === null ? null : Math.max(0, book.pageCount - page);
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * Day of the last session needed for `left` pages, counting today when it is a reading day.
 * `null` without a page count; today when nothing is left.
 */
export function estimateFinish(plan: Pick<ReadingPlan, 'pagesPerDay' | 'weekdays'>, left: number | null, today: Date): Date | null {
  if (left === null || plan.weekdays.length === 0) return null;
  const start = addDays(today, 0);
  if (left === 0) return start;

  const sessions = Math.ceil(left / plan.pagesPerDay);
  // Whole weeks first (fast for long books with few pages a day), then day by day.
  const fullWeeks = Math.floor((sessions - 1) / plan.weekdays.length);
  let remaining = sessions - fullWeeks * plan.weekdays.length;
  let day = addDays(start, fullWeeks * DAYS_PER_WEEK);
  for (;;) {
    if (plan.weekdays.includes(day.getDay() as Weekday)) {
      remaining -= 1;
      if (remaining === 0) return day;
    }
    day = addDays(day, 1);
  }
}

export const isReadingDay = (plan: Pick<ReadingPlan, 'weekdays'>, date: Date) => plan.weekdays.includes(date.getDay() as Weekday);

/** The first reading day on or after `from` (`from` itself when it is one). */
export function nextReadingDay(plan: Pick<ReadingPlan, 'weekdays'>, from: Date): Date | null {
  if (plan.weekdays.length === 0) return null;
  for (let offset = 0; ; offset += 1) {
    const day = addDays(from, offset);
    if (isReadingDay(plan, day)) return day;
  }
}

/** Pages planned for `date`: the daily pages (fewer near the end), or `null` when it isn't a reading day or the book is done. */
export function pagesPlannedOn(plan: ReadingPlan, left: number | null, date: Date): number | null {
  if (!isReadingDay(plan, date) || left === 0) return null;
  return left === null ? plan.pagesPerDay : Math.min(plan.pagesPerDay, left);
}

export interface TonightsBook {
  book: LibraryBook;
  plan: ReadingPlan;
  pages: number;
}

/** Sessions from this hour on are "tonight"; earlier ones are "today". */
export const EVENING_STARTS_AT_HOUR = 17;

export const isEveningTime = (time: string | null) => time !== null && Number(time.slice(0, 2)) >= EVENING_STARTS_AT_HOUR;

const minutesOf =(time: string | null) => (time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : Number.POSITIVE_INFINITY);

/** The book planned for `date` with the earliest session (plans without a time come last), or `null`. */
export function pickTonightsBook(books: readonly LibraryBook[], date: Date): TonightsBook | null {
  const planned = books.flatMap((book) => {
    if (book.status !== 'reading' || !book.plan) return [];
    const pages = pagesPlannedOn(book.plan, pagesLeft(book), date);
    return pages === null ? [] : [{ book, plan: book.plan, pages }];
  });
  planned.sort((a, b) => minutesOf(a.plan.time) - minutesOf(b.plan.time));
  return planned[0] ?? null;
}
