import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

/** Flattens nested messages into dot-separated keys: `{ a: { b: 'x' } }` → `[['a.b', 'x']]`. */
function flatten(messages: object, prefix = ''): Array<[string, unknown]> {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? flatten(value as object, path) : [[path, value]];
  });
}

describe('translations', () => {
  const enEntries = flatten(en);
  const ptEntries = flatten(ptBR);

  it('pt-BR has exactly the same keys as en', () => {
    expect(ptEntries.map(([key]) => key).sort()).toEqual(enEntries.map(([key]) => key).sort());
  });

  it.each([
    ['en', enEntries],
    ['pt-BR', ptEntries],
  ])('%s has only non-empty string values', (_language, entries) => {
    for (const [key, value] of entries) {
      expect(typeof value, key).toBe('string');
      expect((value as string).trim(), key).not.toBe('');
    }
  });
});
