/** Merging and ranking of search results from several APIs: pure, no I/O. */
import type { CatalogBook } from './types';

/**
 * How well a book matches the typed text. Popularity only orders books inside a tier,
 * so an obscure exact match never loses to a famous loose one.
 */
export const MATCH_TIER = {
  /** Every typed word starts a word of the title or of the authors. */
  allWords: 1,
  /** The title starts with the typed text, or the typed text names an author. */
  strong: 2,
} as const;

/** Keeps the tier the main sort key: popularity adds at most log10(readers) (< 10 for any real book). */
const TIER_WEIGHT = 10;

/** Lowercase, without accents or punctuation, single spaces: "Príncipe!" → "principe". */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const wordsOf = (text: string) => normalizeForMatch(text).split(' ').filter(Boolean);

/** Each typed word is the start of one of `words` (the last one may still be half typed). */
const everyWordStartsOneOf = (queryWords: readonly string[], words: readonly string[]) =>
  queryWords.length > 0 && queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)));

export function matchTier(book: CatalogBook, query: string): number {
  const normalizedQuery = normalizeForMatch(query);
  const queryWords = wordsOf(query);
  if (!normalizedQuery) return 0;

  const titleWords = wordsOf(book.title);
  const authorWords = book.authors.map(wordsOf);
  const titleStarts = titleWords.join(' ').startsWith(normalizedQuery);
  const namesAuthor = authorWords.some((words) => everyWordStartsOneOf(queryWords, words));
  if (titleStarts || namesAuthor) return MATCH_TIER.strong;

  return everyWordStartsOneOf(queryWords, [...titleWords, ...authorWords.flat()]) ? MATCH_TIER.allWords : 0;
}

export function relevanceScore(book: CatalogBook, query: string): number {
  return matchTier(book, query) * TIER_WEIGHT + Math.log10(1 + book.popularity);
}

/** Same work in different APIs or editions: normalized title + first author. */
export function workKey(book: CatalogBook): string {
  return `${normalizeForMatch(book.title)}|${normalizeForMatch(book.authors[0] ?? '')}`;
}

/** Drops later copies of a work (e.g. the same book again on a later page). */
export function uniqueWorks(books: readonly CatalogBook[]): CatalogBook[] {
  const seen = new Set<string>();
  return books.filter((book) => {
    const key = workKey(book);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Keeps the first copy of a work; it borrows a missing cover and the larger popularity from later copies. */
function combine(kept: CatalogBook, other: CatalogBook): CatalogBook {
  return {
    ...kept,
    coverUrl: kept.coverUrl ?? other.coverUrl,
    pageCount: kept.pageCount ?? other.pageCount,
    popularity: Math.max(kept.popularity, other.popularity),
  };
}

/**
 * Interleaves the lists (each API's own order counts equally) and merges copies of the same work.
 * Lists earlier in `lists` win ties, so put the API with richer data first.
 */
export function mergeResultLists(lists: readonly (readonly CatalogBook[])[]): CatalogBook[] {
  const merged = new Map<string, CatalogBook>();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let position = 0; position < longest; position += 1) {
    for (const list of lists) {
      const book = list[position];
      if (!book) continue;
      const key = workKey(book);
      const existing = merged.get(key);
      merged.set(key, existing ? combine(existing, book) : book);
    }
  }
  return [...merged.values()];
}

/** Best matches first, then the most read; equal scores keep their merged order. */
export function rankResults(books: readonly CatalogBook[], query: string): CatalogBook[] {
  return books
    .map((book, index) => ({ book, index, score: relevanceScore(book, query) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ book }) => book);
}
