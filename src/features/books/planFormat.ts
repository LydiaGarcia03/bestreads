/** Locale formatting for reading plans (times, weekdays, dates). Pure, no React or I/O. */
import type { Weekday } from './readingPlan';

/** 8 Nov 2026 is a Sunday: `SUNDAY + weekday` gives a date with that weekday. */
const SUNDAY = { year: 2026, month: 10, day: 8 } as const;

/** "21:00" as "9:00 PM" (en) or "21:00" (pt-BR). */
export function formatPlanTime(time: string, locale: string | undefined): string {
  const date = new Date(2000, 0, 1, Number(time.slice(0, 2)), Number(time.slice(3)));
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function weekdayName(day: Weekday, locale: string | undefined, width: 'short' | 'long'): string {
  return new Intl.DateTimeFormat(locale, { weekday: width }).format(new Date(SUNDAY.year, SUNDAY.month, SUNDAY.day + day));
}

/** "Nov 22" / "22 de nov.", with the year only when it isn't this year's. */
export function formatPlanDate(date: Date, today: Date, locale: string | undefined): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  }).format(date);
}
