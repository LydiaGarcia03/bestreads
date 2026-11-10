/**
 * A reading plan as an iCalendar file (RFC 5545): a weekly event on the plan's days at its time,
 * with an alarm. The app has no server to send reminders, so the user's own calendar (phone or
 * desktop) delivers them. Pure, no I/O.
 */
import { nextReadingDay, type ReadingPlan, type Weekday } from './readingPlan';

const BY_DAY: Record<Weekday, string> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };
/** Length of the calendar event; the alarm rings at its start. */
const SESSION_MINUTES = 30;
/** Content lines are folded before 75 octets; 60 characters stay under it for most UTF-8 text. */
const FOLD_AT = 60;
const CRLF = '\r\n';

export interface PlanCalendarOptions {
  /** Stable per book, so importing again updates the event instead of adding a second one. */
  uid: string;
  /** Event title, already translated (e.g. "Read Dune · 25 pages"). */
  summary: string;
  /** First day the event may start on (today). */
  from: Date;
  /** Last day of the plan (the estimated finish), or `null` to repeat until removed. */
  until: Date | null;
  /** When the file is made (DTSTAMP). */
  now: Date;
}

const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
const utcStamp = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

/** TEXT values escape backslashes, separators and line breaks. */
const escapeText = (text: string) => text.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\r?\n/g, '\\n');

/** Long lines continue on the next line after a space. */
function fold(line: string): string {
  const characters = [...line];
  const parts: string[] = [];
  for (let index = 0; index < characters.length; index += FOLD_AT) parts.push(characters.slice(index, index + FOLD_AT).join(''));
  return parts.join(`${CRLF} `);
}

/** The .ics text for a plan with a time (a reminder needs one); `null` without a time. */
export function planCalendarFile(plan: ReadingPlan, options: PlanCalendarOptions): string | null {
  const start = nextReadingDay(plan, options.from);
  if (!plan.time || !start) return null;
  const time = `${plan.time.replace(':', '')}00`;
  const rule = [
    'FREQ=WEEKLY',
    `BYDAY=${plan.weekdays.map((day) => BY_DAY[day]).join(',')}`,
    // A floating (local) start needs a floating end too.
    ...(options.until ? [`UNTIL=${localDate(options.until)}T235959`] : []),
  ].join(';');
  const summary = escapeText(options.summary);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bestreads//Reading plan//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${options.uid}`,
    `DTSTAMP:${utcStamp(options.now)}`,
    `DTSTART:${localDate(start)}T${time}`,
    `DURATION:PT${SESSION_MINUTES}M`,
    `RRULE:${rule}`,
    `SUMMARY:${summary}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${summary}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join(CRLF)
    .concat(CRLF);
}
