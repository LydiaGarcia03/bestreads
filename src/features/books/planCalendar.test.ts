import { planCalendarFile } from './planCalendar';
import type { ReadingPlan } from './readingPlan';

const plan: ReadingPlan = { pagesPerDay: 25, time: '21:30', weekdays: [1, 3], reminder: true };
const options = {
  uid: 'vol-1-plan@bestreads',
  summary: 'Read Dune; part 1, again · 25 pages',
  from: new Date(2026, 10, 10), // Tuesday
  until: new Date(2026, 10, 25),
  now: new Date(Date.UTC(2026, 10, 10, 12, 0, 5)),
};

const lines = (text: string) => text.replace(/\r\n /g, '').split('\r\n');

describe('planCalendarFile', () => {
  it('repeats weekly on the plan days at its time, with an alarm, until the estimated finish', () => {
    const text = planCalendarFile(plan, options);
    expect(text).not.toBeNull();
    expect(text).toMatch(/\r\n$/);
    expect(lines(text ?? '')).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'UID:vol-1-plan@bestreads',
        'DTSTAMP:20261110T120005Z',
        // The first Monday or Wednesday from Tuesday the 10th.
        'DTSTART:20261111T213000',
        'DURATION:PT30M',
        'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261125T235959',
        'SUMMARY:Read Dune\\; part 1\\, again · 25 pages',
        'BEGIN:VALARM',
        'TRIGGER:PT0M',
        'END:VCALENDAR',
      ]),
    );
  });

  it('repeats until removed without an estimate, and folds long lines', () => {
    const text = planCalendarFile(plan, { ...options, until: null, summary: 'A'.repeat(200) }) ?? '';
    expect(lines(text)).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE');
    expect(text.split('\r\n').every((line) => line.length <= 61)).toBe(true);
    expect(lines(text)).toContain(`SUMMARY:${'A'.repeat(200)}`);
  });

  it('needs a time', () => {
    expect(planCalendarFile({ ...plan, time: null }, options)).toBeNull();
  });
});
