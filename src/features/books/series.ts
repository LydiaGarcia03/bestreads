/**
 * A library book's series and volume: pure, no React or I/O. Mirrored in `firestore.rules` (`isValidSeries`).
 * Filled from the catalog when a book is added, editable by the owner.
 */

export interface BookSeriesInfo {
  name: string;
  /** Volume number: 1, 2, 2.5 (novellas), 0 (prequels); `null` when unknown. */
  volume: number | null;
}

export const SERIES_LIMITS = { name: 100, volume: 1000 } as const;

/** Volume from a catalog position: "1" → 1, "2.5" → 2.5, "#3" → 3; ranges ("1-7") and text → `null`. */
export function parseVolume(position: string | null | undefined): number | null {
  const text = position?.trim().replace(/^#/, '');
  if (!text || !/^\d+(\.\d+)?$/.test(text)) return null;
  const volume = Number(text);
  return volume <= SERIES_LIMITS.volume ? volume : null;
}

/** Trimmed, single spaces. */
export function normalizeSeriesName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** "The Hunger Games" and "hunger games" are the same series. */
export function seriesKey(name: string): string {
  return normalizeSeriesName(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/^the /, '');
}

export function isSameSeries(a: string, b: string): boolean {
  return seriesKey(a) === seriesKey(b);
}

/** A series from the catalog (`{ name, position }`), ready to store. */
export function seriesFromCatalog(series: { name: string; position: string | null } | null): BookSeriesInfo | null {
  if (!series) return null;
  const name = normalizeSeriesName(series.name).slice(0, SERIES_LIMITS.name);
  return name ? { name, volume: parseVolume(series.position) } : null;
}

export type SeriesInputError = 'nameTooLong' | 'invalidVolume';

/**
 * Checks the series form: an empty name means "not part of a series" (`series: null`);
 * the volume is optional, a number from 0 to 1000 with an optional decimal ("2.5", also "2,5").
 */
export function parseSeriesInput(
  name: string,
  volumeText: string,
): { ok: true; series: BookSeriesInfo | null } | { ok: false; error: SeriesInputError } {
  const cleanName = normalizeSeriesName(name);
  if (!cleanName) return { ok: true, series: null };
  if (cleanName.length > SERIES_LIMITS.name) return { ok: false, error: 'nameTooLong' };
  const volumeInput = volumeText.trim().replace(',', '.');
  if (!volumeInput) return { ok: true, series: { name: cleanName, volume: null } };
  const volume = parseVolume(volumeInput);
  return volume === null ? { ok: false, error: 'invalidVolume' } : { ok: true, series: { name: cleanName, volume } };
}

/** Distinct series names (first spelling kept), sorted, for suggestions. */
export function distinctSeriesNames(names: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const name of names) {
    const clean = normalizeSeriesName(name);
    if (clean && !byKey.has(seriesKey(clean))) byKey.set(seriesKey(clean), clean);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
