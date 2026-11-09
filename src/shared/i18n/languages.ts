/** Supported UI languages: pure rules, no React or I/O. */

export const SUPPORTED_LANGUAGES = ['en', 'pt-BR'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Maps a BCP 47 tag (e.g. `pt`, `pt-PT`, `en-US`) to a supported language, if any. */
export function matchLanguage(tag: string): Language | null {
  const primary = tag.toLowerCase().split('-')[0];
  if (primary === 'pt') return 'pt-BR';
  if (primary === 'en') return 'en';
  return null;
}

/** Picks the first supported language from the browser's preference list. */
export function detectLanguage(candidates: readonly string[]): Language {
  for (const candidate of candidates) {
    const match = matchLanguage(candidate);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}
