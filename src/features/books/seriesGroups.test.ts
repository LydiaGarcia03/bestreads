import { createTestLibraryBook } from '@/test/fakes';
import { groupBySeries } from './seriesGroups';

const book = (id: string, series: { name: string; volume: number | null } | null = null) =>
  createTestLibraryBook({ id, title: id, series });

describe('groupBySeries', () => {
  it('groups two or more books of a series at the first one’s place, in volume order', () => {
    const entries = groupBySeries([
      book('circe'),
      book('dune-3', { name: 'Dune', volume: 3 }),
      book('emma'),
      book('dune-1', { name: 'dune', volume: 1 }),
      book('hp-1', { name: 'Harry Potter', volume: 1 }),
    ]);

    expect(
      entries.map((entry) => (entry.kind === 'book' ? entry.book.id : `${entry.name}: ${entry.books.map((b) => b.id).join(',')}`)),
    ).toEqual(['circe', 'Dune: dune-1,dune-3', 'emma', 'hp-1']);
  });

  it('puts volumes without a number after the numbered ones', () => {
    const [group] = groupBySeries([book('b', { name: 'Saga', volume: null }), book('a', { name: 'Saga', volume: 2 })]);
    expect(group?.kind === 'series' && group.books.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('leaves lists without series unchanged', () => {
    expect(groupBySeries([book('a'), book('b')]).map((entry) => entry.kind)).toEqual(['book', 'book']);
    expect(groupBySeries([])).toEqual([]);
  });
});
