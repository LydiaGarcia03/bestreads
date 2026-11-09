import { applyTheme, isThemePreference, loadThemePreference, resolveTheme, saveThemePreference } from './theme';

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = `
      <meta name="theme-color" content="" media="(prefers-color-scheme: light)" />
      <meta name="theme-color" content="" media="(prefers-color-scheme: dark)" />
    `;
  });

  it('validates preferences', () => {
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('blue')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it('defaults to system and persists a manual choice', () => {
    expect(loadThemePreference()).toBe('system');
    saveThemePreference('dark');
    expect(loadThemePreference()).toBe('dark');
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem('bestreads.theme', 'sepia');
    expect(loadThemePreference()).toBe('system');
  });

  it('resolves system preference from the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('sets data-theme and theme-color for a manual theme', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      expect(meta.content).toBe('#141414');
    });
  });

  it('removes data-theme and restores per-media colors for system', () => {
    applyTheme('dark');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    const [light, dark] = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
    expect(light?.content).toBe('#F4F1EA');
    expect(dark?.content).toBe('#141414');
  });
});
