/** Reading progress rules: pure, no React or I/O. Mirrored in `firestore.rules` (`isValidProgress`). */
import type { ProgressUnit, ReadingProgress } from './library';

export const MAX_PERCENT = 100;

/** Share read, 0–100 (rounded down, so 100 only when finished), or `null` when it can't be known. */
export function progressPercent(progress: ReadingProgress | null, pageCount: number | null): number | null {
  if (!progress) return null;
  if (progress.unit === 'percent') return Math.floor(progress.value);
  if (!pageCount) return null;
  return Math.floor(Math.min(MAX_PERCENT, (progress.value / pageCount) * MAX_PERCENT));
}

export function isProgressComplete(progress: ReadingProgress | null, pageCount: number | null): boolean {
  return progressPercent(progress, pageCount) === MAX_PERCENT;
}

/** The same progress in `unit`, to prefill the field when the unit changes (`null` when unknown). */
export function progressIn(unit: ProgressUnit, progress: ReadingProgress | null, pageCount: number | null): number | null {
  if (!progress) return null;
  if (progress.unit === unit) return progress.value;
  if (!pageCount) return null;
  return unit === 'percent'
    ? progressPercent(progress, pageCount)
    : Math.round((progress.value / MAX_PERCENT) * pageCount);
}

export type ProgressInputError = 'invalid' | 'overPages' | 'overPercent';

export type ProgressInputResult = { ok: true; progress: ReadingProgress } | { ok: false; error: ProgressInputError };

/** Parses the typed page or percentage: a whole number from 0 up to the page count or 100. */
export function parseProgressInput(unit: ProgressUnit, raw: string, pageCount: number | null): ProgressInputResult {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { ok: false, error: 'invalid' };
  const value = Number(text);
  if (unit === 'percent' && value > MAX_PERCENT) return { ok: false, error: 'overPercent' };
  if (unit === 'pages' && pageCount !== null && value > pageCount) return { ok: false, error: 'overPages' };
  return { ok: true, progress: { unit, value } };
}
