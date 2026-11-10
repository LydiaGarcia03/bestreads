/**
 * Shelves: the fixed ones (one per reading status) and the user's custom shelves in
 * `users/{uid}/shelves/{shelfId}`. Pure, no React or I/O. Limits mirrored in `firestore.rules`.
 */
import { isReadingStatus, LIBRARY_LIMITS, type ReadingStatus } from './library';
import { SHELF_QUERY_PARAM, SHELVES_PATH } from './shelfPath';

export interface Shelf {
  id: string;
  name: string;
  /** Position in the user's list (ascending). */
  order: number;
}

export const SHELF_LIMITS = {
  name: 50,
  /** Custom shelves per user; a book can be on all of them (`LIBRARY_LIMITS.shelves`). */
  count: LIBRARY_LIMITS.shelves,
} as const;

/** Which books a list or count is about: a reading status (fixed shelf) or a custom shelf. */
export type ShelfFilter = { kind: 'status'; status: ReadingStatus } | { kind: 'custom'; shelfId: string };

/** Shelf key used in URLs (`?shelf=`) and cache keys: the status for fixed shelves, the id for custom ones. */
export function shelfKey(filter: ShelfFilter): string {
  return filter.kind === 'status' ? filter.status : filter.shelfId;
}

/** A screen showing one shelf: the shelves screen by default (`/shelves?shelf=read`), or `path` (e.g. Home). */
export function buildShelfPath(filter: ShelfFilter, path: string = SHELVES_PATH): string {
  const params = new URLSearchParams({ [SHELF_QUERY_PARAM]: shelfKey(filter) });
  return `${path}?${params.toString()}`;
}

/** Reads a shelf key back. Custom shelf ids (Firestore auto ids) never equal a status. */
export function parseShelfKey(key: string | null | undefined): ShelfFilter | null {
  if (!key) return null;
  return isReadingStatus(key) ? { kind: 'status', status: key } : { kind: 'custom', shelfId: key };
}

export function sortShelves(shelves: readonly Shelf[]): Shelf[] {
  return [...shelves].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Order for a new shelf: after the last one. */
export function nextShelfOrder(shelves: readonly Shelf[]): number {
  return shelves.reduce((highest, shelf) => Math.max(highest, shelf.order), 0) + 1;
}

export type ShelfNameError = 'empty' | 'tooLong' | 'duplicate';

/** Trims the name; it must be non-empty, short and unique (ignoring case) among the other shelves. */
export function validateShelfName(
  raw: string,
  shelves: readonly Shelf[],
  ignoreId?: string,
): { ok: true; name: string } | { ok: false; error: ShelfNameError } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'empty' };
  if (name.length > SHELF_LIMITS.name) return { ok: false, error: 'tooLong' };
  const taken = shelves.some((shelf) => shelf.id !== ignoreId && shelf.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  return taken ? { ok: false, error: 'duplicate' } : { ok: true, name };
}

/**
 * New orders after moving a shelf one place up (-1) or down (+1): the two shelves swap orders.
 * Empty when it can't move.
 */
export function moveShelf(shelves: readonly Shelf[], shelfId: string, direction: -1 | 1): { id: string; order: number }[] {
  const sorted = sortShelves(shelves);
  const index = sorted.findIndex((shelf) => shelf.id === shelfId);
  const current = sorted[index];
  const neighbour = sorted[index + direction];
  if (!current || !neighbour) return [];
  // Equal orders (e.g. created at the same time) would not swap, so positions are used instead.
  const [first, second] = current.order === neighbour.order ? [index + 1, index + 1 + direction] : [current.order, neighbour.order];
  return [
    { id: current.id, order: second },
    { id: neighbour.id, order: first },
  ];
}

/** Adds or removes `shelfId` from a book's shelves. */
export function toggleShelf(shelfIds: readonly string[], shelfId: string): string[] {
  return shelfIds.includes(shelfId) ? shelfIds.filter((id) => id !== shelfId) : [...shelfIds, shelfId];
}
