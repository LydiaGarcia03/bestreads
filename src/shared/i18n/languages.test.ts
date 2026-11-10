import { isSupportedLanguage } from './languages';

describe('languages', () => {
  it('accepts only supported language codes', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('pt-BR')).toBe(true);
    expect(isSupportedLanguage('pt')).toBe(false);
    expect(isSupportedLanguage('fr')).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });
});
