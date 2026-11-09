/** Browser adapter for theming: reads the OS setting and applies the theme to the document. */
import { THEME_COLOR, type ResolvedTheme, type ThemePreference } from './theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function subscribeToSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Applies the preference to `<html data-theme>` and the `theme-color` meta tags. */
export function applyTheme(preference: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const mediaTheme: ResolvedTheme = (meta.getAttribute('media') ?? '').includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLOR[preference === 'system' ? mediaTheme : preference];
  });
}
