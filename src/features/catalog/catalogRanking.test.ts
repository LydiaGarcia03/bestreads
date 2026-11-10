import { createTestBook } from '@/test/fakes';
import {
  matchTier,
  MATCH_TIER,
  mergeResultLists,
  normalizeForMatch,
  isDerivative,
  rankResults,
  titleCloseness,
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
  it('ranks whole-word matches in the title or authors highest', () => {
    expect(matchTier(book('Yester Year'), 'yester')).toBe(MATCH_TIER.wholeWords);
    expect(matchTier(book("Yester's Ride"), 'yester')).toBe(MATCH_TIER.wholeWords);
    expect(matchTier(book('Children of Dune'), 'dune')).toBe(MATCH_TIER.wholeWords);
    expect(matchTier(book('A Revolução dos Bichos'), 'revolucao bichos')).toBe(MATCH_TIER.wholeWords);
    expect(matchTier(book('The Martian', ['Andy Weir']), 'andy weir')).toBe(MATCH_TIER.wholeWords);
    expect(matchTier(book('Project Hail Mary', ['Andy Weir']), 'hail weir')).toBe(MATCH_TIER.wholeWords);
  });

  it('ranks words that only start with the typed text next', () => {
    expect(matchTier(book('Yesteryear'), 'yester')).toBe(MATCH_TIER.prefix);
    expect(matchTier(book('See You Yesterday'), 'yester')).toBe(MATCH_TIER.prefix);
    expect(matchTier(book("Harry Potter and the Philosopher's Stone"), 'harry pot')).toBe(MATCH_TIER.prefix);
  });

  it('gives no tier to other results or empty text', () => {
    expect(matchTier(book('Transactions'), 'yester')).toBe(0);
    expect(matchTier(book('Leyester'), 'yester')).toBe(0);
    expect(matchTier(book('Dune'), '  ')).toBe(0);
  });
});

describe('rankResults', () => {
  it('ranks "yester" like Goodreads: whole words over prefixes unless far more read', () => {
    const ranked = rankResults(
      [
        book('Transactions', ['Society'], 100_000),
        book('A Story of Yesterday', ['Sergio Cobo'], 26_064),
        book('See You Yesterday', ['Rachel Lynn Solomon'], 35_286),
        book('Yester Year', ['Craig A. Falconer'], 109),
        book("Yester's Ride", ['C.K. Crigger'], 207),
        book('Yesteryear', ['Caro Claire Burke'], 1_153_612),
      ],
      'yester',
    );
    expect(ranked.map((result) => result.title)).toEqual([
      'Yesteryear',
      "Yester's Ride",
      'Yester Year',
      'See You Yesterday',
      'A Story of Yesterday',
      'Transactions',
    ]);
  });

  it('ranks "dune" like Goodreads: within whole-word matches, the most read first', () => {
    const ranked = rankResults(
      [
        book('Dune: House Corrino', ['Brian Herbert']),
        book('God Emperor of Dune', ['Frank Herbert'], 412),
        book('Go Ask Alice', ['Beatrice Sparks'], 906),
        book('Children of Dune', ['Frank Herbert'], 506),
        book('Dune Messiah', ['Frank Herbert'], 1022),
        book('Dune', ['Frank Herbert'], 4962),
      ],
      'dune',
    );
    expect(ranked.map((result) => result.title)).toEqual([
      'Dune',
      'Dune Messiah',
      'Children of Dune',
      'God Emperor of Dune',
      'Dune: House Corrino',
      'Go Ask Alice',
    ]);
  });
});
describe('title closeness and the "dune" search', () => {
  it('scores how much of the title the text covers', () => {
    expect(titleCloseness(book('Dune (Movie Tie-In)'), 'dune')).toBe(1);
    expect(titleCloseness(book('Dune Messiah'), 'dune')).toBeCloseTo(4 / 12);
    expect(titleCloseness(book('Dune: House Corrino'), 'dune')).toBe(0.6);
    expect(titleCloseness(book('Dune Erosion During Storm Surges'), 'dune')).toBeLessThan(0.2);
    expect(titleCloseness(book('The Martian', ['Andy Weir']), 'andy weir')).toBe(0.5);
    expect(titleCloseness(book('Anything'), '  ')).toBe(0);
  });

  it('puts the famous exact title first, then close titles and popular sequels, loose matches last', () => {
    // Google's order for "dune" (no reader counts) followed by Open Library's (with counts).
    const google = [
      book('Dune: House Corrino', ['Brian Herbert']),
      book('Dune (Movie Tie-In)', ['Frank Herbert']),
      book('Dune Erosion During Storm Surges', ['Jacob van Thiel de Vries']),
      book('Dune: The Lady of Caladan', ['Brian Herbert']),
    ];
    const openLibrary = [book('Dune', ['Frank Herbert'], 4504), book('Dune Messiah', ['Frank Herbert'], 879)];

    const ranked = rankResults(mergeResultLists([google, openLibrary]), 'dune').map((result) => result.title);

    // "Dune (Movie Tie-In)" is merged into Frank Herbert's "Dune", which comes first with its 4,504 readers.
    expect(ranked[0]).toBe('Dune');
    expect(ranked).not.toContain('Dune (Movie Tie-In)');
    expect(ranked.at(-1)).toBe('Dune Erosion During Storm Surges');
    expect(ranked.indexOf('Dune Messiah')).toBeLessThan(ranked.indexOf('Dune: House Corrino'));
  });
});

describe('Goodreads-like rules found by comparing real searches', () => {
  it('recognizes box sets, omnibus editions, summaries and adaptations by their title only', () => {
    expect(isDerivative(book('The Hunger Games Trilogy'))).toBe(true);
    expect(isDerivative(book('Shadow and Bone/Siege and Storm/Ruin and Rising'))).toBe(true);
    expect(isDerivative(book('Dune Series. Set of 3 Books.'))).toBe(true);
    expect(isDerivative(book('Summary of the Midnight Library by Matt Haig'))).toBe(true);
    expect(isDerivative(book('Pride and Prejudice [adaptation]'))).toBe(true);
    expect(isDerivative({ ...book('Harry Potter'), series: { name: 'Harry Potter', position: '1-7' } })).toBe(true);
    expect(isDerivative({ ...book('Northern Lights'), subtitle: 'His Dark Materials Trilogy' })).toBe(false);
    expect(isDerivative(book('Dune'))).toBe(false);
  });

  it('finds sequels tagged with the series only in their subjects', () => {
    const catchingFire = {
      ...book('Catching Fire', ['Suzanne Collins'], 2622),
      subjects: ['Fiction', 'Serie:The_Hunger_Games'],
    };
    expect(matchTier(catchingFire, 'hunger games')).toBe(MATCH_TIER.wholeWords);
    expect(matchTier({ ...catchingFire, subjects: ['Hungry animals'] }, 'hunger games')).toBe(0);
  });

  it('puts a series first book ahead of a sequel read up to about twice as much', () => {
    const ranked = rankResults(
      [
        {
          ...book('A Court of Mist and Fury', ['Sarah J. Maas'], 9838),
          series: { name: 'A Court of Thorns and Roses', position: '2' },
        },
        {
          ...book('A Court of Thorns and Roses', ['Sarah J. Maas'], 4685),
          series: { name: 'A Court of Thorns and Roses', position: '1' },
        },
      ],
      'court of thorns',
    );
    expect(ranked.map((result) => result.title)).toEqual(['A Court of Thorns and Roses', 'A Court of Mist and Fury']);
  });

  it('moves repeated titles and box sets below other books', () => {
    const ranked = rankResults(
      [
        book('Circe', ['Madeline Miller'], 1234),
        book('Circe', ['Someone Else'], 13),
        book('Circe and the Cyclops', ['A. Writer'], 4),
        book('Circe Collection', ['Madeline Miller'], 40),
      ],
      'circe',
    );
    expect(ranked.map((result) => `${result.title} | ${result.authors[0]}`)).toEqual([
      'Circe | Madeline Miller',
      'Circe and the Cyclops | A. Writer',
      'Circe | Someone Else',
      'Circe Collection | Madeline Miller',
    ]);
  });
});

describe('mergeResultLists', () => {
  it('interleaves the lists and merges copies of a work, led by the more read copy', () => {
    const merged = mergeResultLists([
      [
        createTestBook({
          id: 'g1',
          title: 'Dune (Movie Tie-In)',
          authors: ['Frank Herbert'],
          coverUrl: null,
          pageCount: null,
          description: 'From Google.',
        }),
        book('Google 2', ['A'], 0, 'g2'),
      ],
      [
        createTestBook({
          id: 'ol-1',
          title: 'Dune',
          authors: ['Frank Herbert'],
          coverUrl: 'ol.jpg',
          pageCount: 600,
          description: null,
          popularity: 900,
          series: { name: 'Dune', position: '1' },
        }),
        book('Open Library 2', ['B'], 0, 'ol-2'),
      ],
    ]);

    // The Open Library copy leads (900 readers) in the place of the first copy; Google fills the description.
    expect(merged.map((result) => result.id)).toEqual(['ol-1', 'g2', 'ol-2']);
    expect(merged[0]).toMatchObject({
      title: 'Dune',
      coverUrl: 'ol.jpg',
      pageCount: 600,
      description: 'From Google.',
      popularity: 900,
      series: { name: 'Dune', position: '1' },
    });
  });

  it('matches the series name as words of the book', () => {
    const jihad = book('The Butlerian Jihad', ['Brian Herbert'], 106);
    expect(matchTier({ ...jihad, series: { name: 'Legends of Dune', position: '1' } }, 'dune')).toBe(
      MATCH_TIER.wholeWords,
    );
    expect(matchTier(jihad, 'dune')).toBe(0);
  });

  it('handles empty lists', () => {
    expect(mergeResultLists([])).toEqual([]);
    expect(mergeResultLists([[], [book('Dune')]]).map((result) => result.title)).toEqual(['Dune']);
  });
});

describe('workKey and uniqueWorks', () => {
  it('treats the same title and first author as one work, ignoring bracketed edition notes', () => {
    expect(workKey(book('Dune!', ['Frank Herbert']))).toBe(workKey(book('dune', ['FRANK HERBERT'])));
    expect(workKey(book('Dune (Movie Tie-In)', ['Frank Herbert']))).toBe(workKey(book('Dune', ['Frank Herbert'])));
    expect(workKey(book('Dune: House Corrino', ['Brian Herbert']))).not.toBe(
      workKey(book('Dune: The Lady of Caladan', ['Brian Herbert'])),
    );
    expect(workKey(book('Dune', ['Frank Herbert']))).not.toBe(workKey(book('Dune', ['Someone Else'])));
  });

  it('drops later copies of a work', () => {
    const books = [book('Dune', ['F'], 0, 'a'), book('Emma', ['J'], 0, 'b'), book('dune', ['f'], 0, 'c')];
    expect(uniqueWorks(books).map((result) => result.id)).toEqual(['a', 'b']);
  });
});
