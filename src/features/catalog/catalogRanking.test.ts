import { createTestBook } from '@/test/fakes';
import {
  matchTier,
  MATCH_TIER,
  mergeResultLists,
  normalizeForMatch,
  rankResults,
  uniqueWorks,
  workKey,
} from './catalogRanking';

const book = (title: string, authors: string[] = ['Someone'], popularity = 0, id = title) =>
  createTestBook({ id, title, authors, popularity });

describe('normalizeForMatch', () => {
  it('lowercases and drops accents and punctuation', () => {
    expect(normalizeForMatch('  O Pequeno Príncipe! ')).toBe('o pequeno principe');
    expect(normalizeForMatch("Yesterday's   Shadow")).toBe('yesterday s shadow');
    expect(normalizeForMatch('...')).toBe('');
  });
});

describe('matchTier', () => {
  it('ranks a title that starts with the text, or a named author, highest', () => {
    expect(matchTier(book('Yesteryear'), 'yester')).toBe(MATCH_TIER.strong);
    expect(matchTier(book('A Revolução dos Bichos'), 'a revolucao')).toBe(MATCH_TIER.strong);
    expect(matchTier(book('The Martian', ['Andy Weir']), 'andy weir')).toBe(MATCH_TIER.strong);
    expect(matchTier(book('The Hobbit', ['J.R.R. Tolkien']), 'tolkien')).toBe(MATCH_TIER.strong);
  });

  it('ranks every typed word starting a title or author word next', () => {
    expect(matchTier(book('See You Yesterday'), 'yester')).toBe(MATCH_TIER.allWords);
    expect(matchTier(book('O Pequeno Príncipe'), 'pequeno principe')).toBe(MATCH_TIER.allWords);
    expect(matchTier(book('Project Hail Mary', ['Andy Weir']), 'hail weir')).toBe(MATCH_TIER.allWords);
  });

  it('gives no tier to other results or empty text', () => {
    expect(matchTier(book('Transactions'), 'yester')).toBe(0);
    expect(matchTier(book('Leyester'), 'yester')).toBe(0);
    expect(matchTier(book('Dune'), '  ')).toBe(0);
  });
});

describe('rankResults', () => {
  it('puts better matches first, then the most read, keeping order on ties', () => {
    const ranked = rankResults(
      [
        book('Transactions', ['Society'], 100_000),
        book('See You Yesterday', ['Rachel'], 35_000),
        book('Yester Year', ['Craig'], 100),
        book('Yesteryear', ['Caro'], 1_000_000),
        book('Yester Days', ['Bill'], 100),
      ],
      'yester',
    );
    expect(ranked.map((result) => result.title)).toEqual([
      'Yesteryear',
      'Yester Year',
      'Yester Days',
      'See You Yesterday',
      'Transactions',
    ]);
  });
});

describe('mergeResultLists', () => {
  it('interleaves the lists and merges copies of a work into the first one', () => {
    const merged = mergeResultLists([
      [
        createTestBook({ id: 'g1', title: 'Dune', authors: ['Frank Herbert'], coverUrl: null, pageCount: null }),
        book('Google 2', ['A'], 0, 'g2'),
      ],
      [
        createTestBook({ id: 'ol-1', title: 'DUNE', authors: ['Frank Herbert'], coverUrl: 'ol.jpg', pageCount: 600, popularity: 900 }),
        book('Open Library 2', ['B'], 0, 'ol-2'),
      ],
    ]);

    expect(merged.map((result) => result.id)).toEqual(['g1', 'g2', 'ol-2']);
    expect(merged[0]).toMatchObject({ coverUrl: 'ol.jpg', pageCount: 600, popularity: 900 });
  });

  it('handles empty lists', () => {
    expect(mergeResultLists([])).toEqual([]);
    expect(mergeResultLists([[], [book('Dune')]]).map((result) => result.title)).toEqual(['Dune']);
  });
});

describe('workKey and uniqueWorks', () => {
  it('treats the same title and first author as one work', () => {
    expect(workKey(book('Dune!', ['Frank Herbert']))).toBe(workKey(book('dune', ['FRANK HERBERT'])));
    expect(workKey(book('Dune', ['Frank Herbert']))).not.toBe(workKey(book('Dune', ['Someone Else'])));
  });

  it('drops later copies of a work', () => {
    const books = [book('Dune', ['F'], 0, 'a'), book('Emma', ['J'], 0, 'b'), book('dune', ['f'], 0, 'c')];
    expect(uniqueWorks(books).map((result) => result.id)).toEqual(['a', 'b']);
  });
});
