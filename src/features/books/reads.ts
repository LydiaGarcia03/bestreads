/**
 * Reads (start and finish dates, re-reads) and how a status change affects them: pure, no React or I/O.
 * Dates are calendar days, `YYYY-MM-DD`, which compare correctly as strings.
 */
import type { LibraryBook, LibraryBookState, ReadingStatus, ReadPeriod } from './library';

/** Fields the app changes on a library book outside the rating (which has its own atomic write). */
export type LibraryBookPatch = Partial<Pick<LibraryBookState, 'status' | 'progress' | 'reads' | 'shelfIds' | 'series'>>;

const pad = (value: number) => String(value).padStart(2, '0');

/** The local calendar day of `date`, `YYYY-MM-DD`. */
export function toCalendarDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const isOpen = (read: ReadPeriod | undefined) => read !== undefined && read.finishedOn === null;

/**
 * Reads after the status changes to `status` on `today`:
 * - reading: starts a read; after a finished one it's a re-read, unless that read finished today
 *   (an accidental "Read" being undone), which is reopened;
 * - read: finishes the open read, or records one finished today;
 * - want to read: drops a read started today and never finished (undoing an accidental start).
 */
export function readsAfterStatusChange(reads: readonly ReadPeriod[], status: ReadingStatus, today: string): ReadPeriod[] {
  const earlier = reads.slice(0, -1);
  const last = reads.at(-1);

  if (status === 'reading') {
    if (!last) return [{ startedOn: today, finishedOn: null }];
    if (isOpen(last)) return [...reads];
    if (last.finishedOn === today) return [...earlier, { ...last, finishedOn: null }];
    return [...reads, { startedOn: today, finishedOn: null }];
  }

  if (status === 'read') {
    if (last && isOpen(last)) return [...earlier, { ...last, finishedOn: today }];
    if (last?.finishedOn === today) return [...reads];
    return [...reads, { startedOn: null, finishedOn: today }];
  }

  if (last && isOpen(last) && last.startedOn === today) return earlier;
  return [...reads];
}

/** Everything that changes with a new status. A new read (re-read) starts with no progress. */
export function statusChangePatch(book: Pick<LibraryBook, 'reads' | 'progress'>, status: ReadingStatus, today: string): LibraryBookPatch {
  const reads = readsAfterStatusChange(book.reads, status, today);
  const startsNewRead = status === 'reading' && reads.length > book.reads.length && book.reads.length > 0;
  return { status, reads, ...(startsNewRead ? { progress: null } : {}) };
}

/** A read whose finish date is not before its start date. */
export function isValidRead({ startedOn, finishedOn }: ReadPeriod): boolean {
  return startedOn === null || finishedOn === null || startedOn <= finishedOn;
}

export function replaceRead(reads: readonly ReadPeriod[], index: number, read: ReadPeriod): ReadPeriod[] {
  return reads.map((current, position) => (position === index ? read : current));
}

export function removeRead(reads: readonly ReadPeriod[], index: number): ReadPeriod[] {
  return reads.filter((_read, position) => position !== index);
}
