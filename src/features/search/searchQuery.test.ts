import { buildSearchPath, normalizeQuery } from './searchQuery';

describe('normalizeQuery', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeQuery('  project   hail\tmary ')).toBe('project hail mary');
  });

  it('returns an empty string for missing or blank input', () => {
    expect(normalizeQuery(null)).toBe('');
    expect(normalizeQuery(undefined)).toBe('');
    expect(normalizeQuery('   ')).toBe('');
  });
});

describe('buildSearchPath', () => {
  it('encodes the normalized query', () => {
    expect(buildSearchPath(' Dune ')).toBe('/search?q=Dune');
    expect(buildSearchPath('café & livros')).toBe('/search?q=caf%C3%A9+%26+livros');
  });

  it('returns null for a blank query', () => {
    expect(buildSearchPath('  ')).toBeNull();
  });
});
