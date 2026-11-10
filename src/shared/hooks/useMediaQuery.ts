import { useSyncExternalStore } from 'react';

/** Tailwind's `lg` breakpoint, where the desktop layout starts. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

const supportsMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Whether a media query matches, updated when it changes. Where `matchMedia` is missing
 * (old browsers, test DOMs) it reports `fallback`.
 */
export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!supportsMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (supportsMatchMedia() ? window.matchMedia(query).matches : fallback),
    () => fallback,
  );
}
