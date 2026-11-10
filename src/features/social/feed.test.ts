import { createTestProfile, createTestPublicRating } from '@/test/fakes';
import { buildFeed } from './feed';

const ana = createTestProfile({ uid: 'ana-uid', username: 'ana' });
const rafa = createTestProfile({ uid: 'rafa-uid', username: 'rafa' });
const rating = (bookId: string, date: string | null) =>
  createTestPublicRating({ bookId, ratedAt: date === null ? null : new Date(date) });

describe('buildFeed', () => {
  it('merges every source newest first', () => {
    const feed = buildFeed(
      [
        { profile: ana, ratings: [rating('a1', '2026-11-05'), rating('a2', '2026-10-01')] },
        { profile: rafa, ratings: [rating('r1', '2026-11-08'), rating('r2', '2026-10-20')] },
      ],
      10,
    );

    expect(feed.map((item) => [item.profile.username, item.rating.bookId])).toEqual([
      ['rafa', 'r1'],
      ['ana', 'a1'],
      ['rafa', 'r2'],
      ['ana', 'a2'],
    ]);
  });

  it('cuts the list to the size', () => {
    const feed = buildFeed([{ profile: ana, ratings: [rating('a1', '2026-11-05'), rating('a2', '2026-10-01')] }], 1);
    expect(feed.map((item) => item.rating.bookId)).toEqual(['a1']);
  });

  it('puts undated ratings last', () => {
    const feed = buildFeed(
      [
        { profile: ana, ratings: [rating('undated', null), rating('a1', '2026-01-01')] },
        { profile: rafa, ratings: [rating('also-undated', null)] },
      ],
      10,
    );
    expect(feed.map((item) => item.rating.bookId)).toEqual(['a1', 'undated', 'also-undated']);
  });

  it('is empty without sources, ratings or room', () => {
    expect(buildFeed([], 10)).toEqual([]);
    expect(buildFeed([{ profile: ana, ratings: [] }], 10)).toEqual([]);
    expect(buildFeed([{ profile: ana, ratings: [rating('a1', '2026-01-01')] }], 0)).toEqual([]);
  });
});
