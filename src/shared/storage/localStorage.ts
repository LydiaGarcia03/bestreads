/**
 * Device-local values (localStorage) for per-device conveniences.
 * Every access is wrapped in try/catch: storage can be blocked (private mode, policies).
 */

export function readLocalValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the value lasts for this session only.
  }
}
