import { resolveInitialLanguage } from './language';
import { STORAGE_KEYS } from './storage';

describe('resolveInitialLanguage', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('uses the saved language', () => {
    window.localStorage.setItem(STORAGE_KEYS.language, 'pt-BR');
    expect(resolveInitialLanguage()).toBe('pt-BR');
  });

  it('defaults to English, even for a Portuguese browser', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pt-BR', 'pt']);
    expect(resolveInitialLanguage()).toBe('en');
  });

  it('ignores an unsupported saved value', () => {
    window.localStorage.setItem(STORAGE_KEYS.language, 'fr');
    expect(resolveInitialLanguage()).toBe('en');
  });
});
