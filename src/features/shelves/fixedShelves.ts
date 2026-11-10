import type { ReadingStatus, ShelfFilter } from '@/features/books';

/** The fixed shelves, one per reading status, in menu order. */
export const FIXED_SHELF_STATUSES: readonly ReadingStatus[] = ['reading', 'read', 'wantToRead'];

export const FIXED_SHELVES: readonly ShelfFilter[] = FIXED_SHELF_STATUSES.map((status) => ({ kind: 'status', status }));

/** Shelf shown when the URL names none. */
export const DEFAULT_SHELF: ShelfFilter = { kind: 'status', status: 'reading' };
