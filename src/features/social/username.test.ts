import { normalizeUsername, validateUsername } from './username';

describe('normalizeUsername', () => {
  it('trims, drops a leading @ and lowercases', () => {
    expect(normalizeUsername('  @Ana_Reads ')).toBe('ana_reads');
    expect(normalizeUsername('reader')).toBe('reader');
  });

  it('drops only one leading @', () => {
    expect(normalizeUsername('@@ana')).toBe('@ana');
  });
});

describe('validateUsername', () => {
  it('accepts lowercase letters, digits and _ within 3–20 characters', () => {
    expect(validateUsername('@Ana_1')).toEqual({ ok: true, username: 'ana_1' });
    expect(validateUsername('abc')).toEqual({ ok: true, username: 'abc' });
    expect(validateUsername('x'.repeat(20))).toEqual({ ok: true, username: 'x'.repeat(20) });
  });

  it('refuses an empty username', () => {
    expect(validateUsername('   ')).toEqual({ ok: false, error: 'empty' });
    expect(validateUsername('@')).toEqual({ ok: false, error: 'empty' });
  });

  it('refuses names that are too short or too long', () => {
    expect(validateUsername('ab')).toEqual({ ok: false, error: 'tooShort' });
    expect(validateUsername('x'.repeat(21))).toEqual({ ok: false, error: 'tooLong' });
  });

  it('refuses other characters', () => {
    for (const input of ['ana reads', 'ana-reads', 'ana.reads', 'ána', '@@ana']) {
      expect(validateUsername(input)).toEqual({ ok: false, error: 'invalidCharacters' });
    }
  });

  it('refuses reserved names in any case', () => {
    expect(validateUsername('Admin')).toEqual({ ok: false, error: 'reserved' });
    expect(validateUsername('@bestreads')).toEqual({ ok: false, error: 'reserved' });
  });
});
