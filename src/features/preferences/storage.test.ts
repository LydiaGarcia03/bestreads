import {
  loadLanguagePreference,
  loadThemePreference,
  readPreference,
  saveLanguagePreference,
  saveThemePreference,
  STORAGE_KEYS,
  writePreference,
} from './storage';

describe('preferences storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults the theme to system and persists a manual choice', () => {
    expect(loadThemePreference()).toBe('system');
    saveThemePreference('dark');
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
    expect(loadThemePreference()).toBe('dark');
  });

  it('ignores invalid stored theme values', () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, 'sepia');
    expect(loadThemePreference()).toBe('system');
  });

  it('returns null when no valid language is stored and persists a choice', () => {
    expect(loadLanguagePreference()).toBeNull();
    window.localStorage.setItem(STORAGE_KEYS.language, 'fr');
    expect(loadLanguagePreference()).toBeNull();
    saveLanguagePreference('pt-BR');
    expect(loadLanguagePreference()).toBe('pt-BR');
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readPreference('any')).toBeNull();
    expect(() => writePreference('any', 'value')).not.toThrow();
    expect(loadThemePreference()).toBe('system');
    expect(loadLanguagePreference()).toBeNull();
  });
});
