import {
  moveShelf,
  nextShelfOrder,
  parseShelfKey,
  SHELF_LIMITS,
  shelfKey,
  sortShelves,
  toggleShelf,
  validateShelfName,
} from './shelves';

const shelf = (id: string, name: string, order: number) => ({ id, name, order });

describe('shelf keys', () => {
  it('round-trips fixed and custom shelves', () => {
    expect(shelfKey({ kind: 'status', status: 'read' })).toBe('read');
    expect(shelfKey({ kind: 'custom', shelfId: 'aB3' })).toBe('aB3');
    expect(parseShelfKey('read')).toEqual({ kind: 'status', status: 'read' });
    expect(parseShelfKey('aB3')).toEqual({ kind: 'custom', shelfId: 'aB3' });
    expect(parseShelfKey('')).toBeNull();
    expect(parseShelfKey(null)).toBeNull();
  });
});

describe('sortShelves and nextShelfOrder', () => {
  it('sorts by order, then name', () => {
    const shelves = [shelf('c', 'Zeta', 2), shelf('a', 'Beta', 1), shelf('b', 'Alpha', 1)];
    expect(sortShelves(shelves).map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('places a new shelf after the last', () => {
    expect(nextShelfOrder([])).toBe(1);
    expect(nextShelfOrder([shelf('a', 'A', 4), shelf('b', 'B', 2)])).toBe(5);
  });
});

describe('validateShelfName', () => {
  const shelves = [shelf('a', 'Favorites 2026', 1)];

  it('trims and collapses spaces', () => {
    expect(validateShelfName('  Sci   fi ', shelves)).toEqual({ ok: true, name: 'Sci fi' });
  });

  it('rejects empty, too long and duplicate names', () => {
    expect(validateShelfName('   ', shelves)).toEqual({ ok: false, error: 'empty' });
    expect(validateShelfName('x'.repeat(SHELF_LIMITS.name + 1), shelves)).toEqual({ ok: false, error: 'tooLong' });
    expect(validateShelfName('favorites 2026', shelves)).toEqual({ ok: false, error: 'duplicate' });
  });

  it('lets a shelf keep its own name when renamed', () => {
    expect(validateShelfName('FAVORITES 2026', shelves, 'a')).toEqual({ ok: true, name: 'FAVORITES 2026' });
  });
});

describe('moveShelf', () => {
  const shelves = [shelf('a', 'A', 1), shelf('b', 'B', 2), shelf('c', 'C', 5)];

  it('swaps orders with the neighbour', () => {
    expect(moveShelf(shelves, 'c', -1)).toEqual([
      { id: 'c', order: 2 },
      { id: 'b', order: 5 },
    ]);
    expect(moveShelf(shelves, 'a', 1)).toEqual([
      { id: 'a', order: 2 },
      { id: 'b', order: 1 },
    ]);
  });

  it('does nothing at the ends or for unknown shelves', () => {
    expect(moveShelf(shelves, 'a', -1)).toEqual([]);
    expect(moveShelf(shelves, 'c', 1)).toEqual([]);
    expect(moveShelf(shelves, 'zzz', 1)).toEqual([]);
  });

  it('still moves shelves that share an order', () => {
    const tied = [shelf('a', 'A', 1), shelf('b', 'B', 1)];
    expect(moveShelf(tied, 'b', -1)).toEqual([
      { id: 'b', order: 1 },
      { id: 'a', order: 2 },
    ]);
  });
});

describe('toggleShelf', () => {
  it('adds and removes a shelf id', () => {
    expect(toggleShelf(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleShelf(['a', 'b'], 'a')).toEqual(['b']);
  });
});
