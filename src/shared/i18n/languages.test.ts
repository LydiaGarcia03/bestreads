import { detectLanguage, isSupportedLanguage, matchLanguage } from './languages';

describe('languages', () => {
  it('accepts only supported language codes', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('pt-BR')).toBe(true);
    expect(isSupportedLanguage('pt')).toBe(false);
    expect(isSupportedLanguage('fr')).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });

  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['PT-br', 'pt-BR'],
    ['en', 'en'],
    ['en-US', 'en'],
    ['fr-FR', null],
    ['', null],
  ])('matches %j to %j', (tag, expected) => {
    expect(matchLanguage(tag)).toBe(expected);
  });

  it('picks the first supported browser language', () => {
    expect(detectLanguage(['fr-FR', 'pt-BR', 'en'])).toBe('pt-BR');
    expect(detectLanguage(['en-GB', 'pt-BR'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(detectLanguage(['de', 'ja'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
