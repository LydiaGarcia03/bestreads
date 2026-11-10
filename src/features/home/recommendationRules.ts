/** Rules for what Home recommends: pure, no React or I/O. Search is not affected by these rules. */
import type { CatalogBook } from '@/features/catalog';

/**
 * Authors whose books are never recommended, under any spelling of their names and their pen names.
 * Written in any form: they are compared after `compactName`.
 */
export const EXCLUDED_AUTHORS: readonly string[] = [
  // J.K. Rowling, including the pen name used for the Cormoran Strike novels.
  'J. K. Rowling',
  'Joanne Rowling',
  'Robert Galbraith',
];

/** Lowercase letters and digits only, without accents: "J.K. Rowling" and "JK Rowling" → "jkrowling". */
export function compactName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

const EXCLUDED = new Set(EXCLUDED_AUTHORS.map(compactName));

export function isRecommendable(book: Pick<CatalogBook, 'authors'>): boolean {
  return !book.authors.some((author) => EXCLUDED.has(compactName(author)));
}
