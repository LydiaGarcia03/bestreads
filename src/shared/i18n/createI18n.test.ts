import { createI18n } from './createI18n';

describe('createI18n', () => {
  it('is ready synchronously in the requested language', () => {
    const i18n = createI18n('pt-BR');
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('language.label')).toBe('Idioma');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('keeps <html lang> in sync when the language changes', async () => {
    const i18n = createI18n('en');
    expect(document.documentElement.lang).toBe('en');
    await i18n.changeLanguage('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });

  it('creates independent instances', async () => {
    const first = createI18n('en');
    const second = createI18n('en');
    await second.changeLanguage('pt-BR');
    expect(first.t('app.tagline')).toBe('Your private reading journal');
  });
});
