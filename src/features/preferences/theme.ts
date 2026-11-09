import { readPreference, STORAGE_KEYS, writePreference } from './storage';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

/** Browser chrome color per theme; mirrors `--bg` in `src/index.css`. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#F4F1EA',
  dark: '#141414',
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function loadThemePreference(): ThemePreference {
  const stored = readPreference(STORAGE_KEYS.theme);
  return isThemePreference(stored) ? stored : 'system';
}

export function saveThemePreference(preference: ThemePreference): void {
  writePreference(STORAGE_KEYS.theme, preference);
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/** Applies the preference to `<html data-theme>` and the `theme-color` meta tags. */
export function applyTheme(preference: ThemePreference, root: HTMLElement = document.documentElement): void {
  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const media = meta.getAttribute('media') ?? '';
    const forMediaTheme: ResolvedTheme = media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLOR[preference === 'system' ? forMediaTheme : preference];
  });
}

export function subscribeToSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
