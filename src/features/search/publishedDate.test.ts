import { formatPublishedDate } from './publishedDate';

describe('formatPublishedDate', () => {
  it('formats a full date', () => {
    expect(formatPublishedDate('2021-05-04', 'en')).toBe('May 4, 2021');
    expect(formatPublishedDate('2021-05-04', 'pt-BR')).toMatch(/^4 de mai\.? de 2021$/);
  });

  it('keeps month-only and year-only dates as precise as they are', () => {
    expect(formatPublishedDate('2021-05', 'en')).toBe('May 2021');
    expect(formatPublishedDate('1965', 'en')).toBe('1965');
  });

  it('never shifts the day with the time zone', () => {
    expect(formatPublishedDate('2021-01-01', 'en')).toBe('Jan 1, 2021');
  });

  it('returns unexpected values unchanged', () => {
    expect(formatPublishedDate('soon', 'en')).toBe('soon');
  });
});
