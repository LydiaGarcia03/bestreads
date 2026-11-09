import { applyTheme } from './themeDom';

function themeColorMetas() {
  return Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
}

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = `
      <meta name="theme-color" content="" media="(prefers-color-scheme: light)" />
      <meta name="theme-color" content="" media="(prefers-color-scheme: dark)" />
    `;
  });

  it('forces a manual theme on <html> and every theme-color meta', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(themeColorMetas().map((meta) => meta.content)).toEqual(['#141414', '#141414']);
  });

  it('removes the override and restores per-media colors for system', () => {
    applyTheme('light');
    applyTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(themeColorMetas().map((meta) => meta.content)).toEqual(['#F4F1EA', '#141414']);
  });
});
