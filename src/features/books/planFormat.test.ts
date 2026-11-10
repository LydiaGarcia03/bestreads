import { formatPlanDate, formatPlanTime, weekdayName } from './planFormat';

describe('planFormat', () => {
  it('formats times per locale', () => {
    expect(formatPlanTime('21:05', 'en')).toBe('9:05 PM');
    expect(formatPlanTime('21:05', 'pt-BR')).toBe('21:05');
  });

  it('names weekdays from Sunday (0) to Saturday (6)', () => {
    expect(weekdayName(0, 'en', 'long')).toBe('Sunday');
    expect(weekdayName(6, 'en', 'short')).toBe('Sat');
    expect(weekdayName(1, 'pt-BR', 'long')).toBe('segunda-feira');
  });

  it('adds the year only for another year', () => {
    const today = new Date(2026, 10, 10);
    expect(formatPlanDate(new Date(2026, 10, 22), today, 'en')).toBe('Nov 22');
    expect(formatPlanDate(new Date(2027, 0, 3), today, 'en')).toBe('Jan 3, 2027');
  });
});
