import { resolveInitialLanguage } from './language';
import { STORAGE_KEYS } from './storage';

describe('resolveInitialLanguage', () => {
  beforeEach(() => window.localStorage.clear());

  it('prefers the saved language over the browser languages', () => {
    window.localStorage.setItem(STORAGE_KEYS.language, 'en');
    expect(resolveInitialLanguage(['pt-BR'])).toBe('en');
  });

  it('detects from the browser when nothing is saved', () => {
    expect(resolveInitialLanguage(['pt-PT', 'en'])).toBe('pt-BR');
    expect(resolveInitialLanguage(['es'])).toBe('en');
  });
});
