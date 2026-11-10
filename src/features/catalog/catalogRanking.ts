/** Merging and ranking of search results from several APIs: pure, no I/O. */
import type { CatalogBook } from './types';

/**
 * How well a book matches the typed text, looking at the words of its title and authors
 * (the order Goodreads uses: "Children of Dune" matches "dune" as well as "Dune Messiah").
 */
export const MATCH_TIER = {
  /** Every typed word starts a word ("yester" → "Yesterday"); the last word may still be half typed. */
  prefix: 1,
  /** Every typed word is a whole word ("yester" → "Yester Year", "dune" → "Children of Dune"). */
  wholeWords: 2,
} as const;

/**
 * Score = (any match ? MATCH_WEIGHT : 0) + tier × TIER_WEIGHT + closeness (0–1) × CLOSENESS_WEIGHT
 *       + log10(1 + popularity) × POPULARITY_WEIGHT.
 * - Any match beats any non-match, however popular (Open Library's loose results).
 * - Whole words beat prefixes unless the prefix match is far more read: "Yesteryear" (1.1M readers)
 *   still comes first for "yester", but "Yester Year" (109) beats "See You Yesterday" (35k).
 * - Within a tier popularity decides: Dune, Dune Messiah, Children of Dune, God Emperor of Dune…
 * - Title closeness only breaks near ties (an exact title over a longer one).
 */
const MATCH_WEIGHT = 10;
const TIER_WEIGHT = 3.5;
const CLOSENESS_WEIGHT = 1;
const POPULARITY_WEIGHT = 1.5;
/** Closeness when the typed text is the part of the title before a subtitle ("Dune" in "Dune: House Corrino"). */
const MAIN_TITLE_CLOSENESS = 0.6;
/** Closeness when the typed text names an author: any of their books fits equally well. */
const AUTHOR_CLOSENESS = 0.5;

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

export function matchTier(book: CatalogBook, query: string): number {
  const queryWords = wordsOf(query);
  if (queryWords.length === 0) return 0;
  // The series name counts too: "Heretics of Dune" and "The Butlerian Jihad" belong to "dune" searches.
  const words = [...wordsOf(book.title), ...book.authors.flatMap(wordsOf), ...wordsOf(book.series?.name ?? '')];
  if (queryWords.every((queryWord) => words.includes(queryWord))) return MATCH_TIER.wholeWords;
  if (queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))) return MATCH_TIER.prefix;
  // Subjects as a fallback, whole words only: "Catching Fire" is tagged "Hunger Games (Fictitious place)".
  const subjectWords = book.subjects.flatMap(wordsOf);
  return queryWords.every((queryWord) => subjectWords.includes(queryWord)) ? MATCH_TIER.wholeWords : 0;
}

/** The title without edition notes in brackets: "Dune (Movie Tie-In)" → "dune". */
export function coreTitle(title: string): string {
  return normalizeForMatch(title.replace(/\s*[([][^)\]]*[)\]]/g, ' '));
}

/**
 * How much of the title the typed text covers, 0–1: the whole title ("dune" for "Dune (Movie Tie-In)") is 1,
 * a longer title starting with it scores its share ("Dune Messiah" ≈ 0.33), and so does a series title
 * before a subtitle, up to `MAIN_TITLE_CLOSENESS`. Author searches get `AUTHOR_CLOSENESS` for every book.
 */
export function titleCloseness(book: CatalogBook, query: string): number {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return 0;
  const title = coreTitle(book.title);
  if (title === normalizedQuery) return 1;

  const share = title.startsWith(normalizedQuery) ? normalizedQuery.length / title.length : 0;
  const mainTitle = normalizeForMatch(book.title.split(':')[0] ?? '');
  const isMainTitle = book.title.includes(':') && mainTitle === normalizedQuery;
  const namesAuthor = book.authors.some((author) => normalizeForMatch(author).includes(normalizedQuery));
  return Math.max(share, isMainTitle ? MAIN_TITLE_CLOSENESS : 0, namesAuthor ? AUTHOR_CLOSENESS : 0);
}

/**
 * Box sets, omnibus editions, summaries, study guides and adaptations: Goodreads lists them below the
 * books themselves. Matched on the title and subtitle ("Trilogy" in a series name is fine).
 */
const DERIVATIVE_TITLE =
  /\b(box(ed)? ?set|set of \d+|trilogy|trilogia|omnibus|collection|colecao|complete (series|novels|works)|books? \d+ ?(-|to|and) ?\d+|summary|resumo|study guide|analysis of|sparknotes|cliffsnotes|workbook|adaptation|graphic novel|coloring book)\b/;
/** Below the real books, still above results that don't match at all. */
const DERIVATIVE_PENALTY = 2.5;
/** Goodreads puts a series' first book first; enough to beat a sequel read up to about twice as much. */
const FIRST_IN_SERIES_BONUS = 0.6;

/**
 * A box set, omnibus, summary, guide or adaptation rather than the book itself. Only the title is
 * read: subtitles often name the series ("Northern Lights: His Dark Materials Trilogy").
 */
export function isDerivative(book: CatalogBook): boolean {
  // "Title / Other title" or "A/B/C" (several books in one), or a series position range ("1-3").
  const severalTitles = /\S\s*\/\s*\S/.test(book.title);
  return (
    DERIVATIVE_TITLE.test(normalizeForMatch(book.title)) ||
    severalTitles ||
    /\d\s*-\s*\d/.test(book.series?.position ?? '')
  );
}

export function relevanceScore(book: CatalogBook, query: string): number {
  const tier = matchTier(book, query);
  return (
    (tier > 0 ? MATCH_WEIGHT : 0) +
    tier * TIER_WEIGHT +
    titleCloseness(book, query) * CLOSENESS_WEIGHT +
    Math.log10(1 + book.popularity) * POPULARITY_WEIGHT +
    (book.series?.position === '1' ? FIRST_IN_SERIES_BONUS : 0) -
    (isDerivative(book) ? DERIVATIVE_PENALTY : 0)
  );
}

/**
 * Same work in different APIs or editions: title without bracketed edition notes + first author,
 * so "Dune (Movie Tie-In)" and "Dune" by Frank Herbert are one work, while "Dune: House Corrino"
 * stays a separate book.
 */
export function workKey(book: CatalogBook): string {
  return `${coreTitle(book.title)}|${normalizeForMatch(book.authors[0] ?? '')}`;
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

/**
 * Joins two copies of the same work. The more read copy leads (on a tie, the first one): it is the
 * edition readers know, usually Open Library's work with its main cover, clean title and original
 * year. Whatever it lacks (description, pages, ISBN, categories, series) comes from the other copy.
 */
function combine(existing: CatalogBook, incoming: CatalogBook): CatalogBook {
  const [lead, other] = incoming.popularity > existing.popularity ? [incoming, existing] : [existing, incoming];
  return {
    ...lead,
    subtitle: lead.subtitle ?? other.subtitle,
    coverUrl: lead.coverUrl ?? other.coverUrl,
    description: lead.description ?? other.description,
    pageCount: lead.pageCount ?? other.pageCount,
    isbn: lead.isbn ?? other.isbn,
    publishedYear: lead.publishedYear ?? other.publishedYear,
    publishedDate: lead.publishedDate ?? other.publishedDate,
    categories: lead.categories.length > 0 ? lead.categories : other.categories,
    series: lead.series ?? other.series,
    subjects: [...lead.subjects, ...other.subjects],
    popularity: Math.max(lead.popularity, other.popularity),
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
/** A title already shown higher up (by another author or an unmerged edition) moves down this much. */
const REPEATED_TITLE_PENALTY = 2;

type Scored = { book: CatalogBook; index: number; score: number };
const byScore = (a: Scored, b: Scored) => b.score - a.score || a.index - b.index;

/**
 * Best matches first, then the most read; equal scores keep their merged order. Repeats of a title
 * already listed move down, so the top shows different books (Goodreads shows one "Circe", not five).
 */
export function rankResults(books: readonly CatalogBook[], query: string): CatalogBook[] {
  const ranked = books.map((book, index) => ({ book, index, score: relevanceScore(book, query) })).sort(byScore);
  const seenTitles = new Set<string>();
  return ranked
    .map((entry) => {
      const title = coreTitle(entry.book.title);
      const isRepeat = seenTitles.has(title);
      seenTitles.add(title);
      return isRepeat ? { ...entry, score: entry.score - REPEATED_TITLE_PENALTY } : entry;
    })
    .sort(byScore)
    .map(({ book }) => book);
}
