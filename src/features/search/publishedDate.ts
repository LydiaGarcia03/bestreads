/** Formats `YYYY`, `YYYY-MM` or `YYYY-MM-DD` for the UI language, as precise as the date is. Pure. */
export function formatPublishedDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year) return value;
  if (!month) return String(year);

  // UTC, so the calendar date never shifts with the user's time zone.
  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    ...(day ? { day: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date);
}
