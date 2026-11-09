/** Where to go after signing in: pure, no router import. */

export const LOGIN_PATH = '/login';
const DEFAULT_TARGET = '/';

/** Router state stored when a private route redirects to the login screen. */
export interface LoginRedirectState {
  from: string;
}

export function createLoginRedirectState(pathname: string, search = ''): LoginRedirectState {
  return { from: `${pathname}${search}` };
}

/**
 * Reads the return path from router state. Only in-app absolute paths are accepted
 * (never another origin, never the login screen itself).
 */
export function resolveRedirectTarget(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return DEFAULT_TARGET;
  const { from } = state;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return DEFAULT_TARGET;
  if (from === LOGIN_PATH || from.startsWith(`${LOGIN_PATH}?`)) return DEFAULT_TARGET;
  return from;
}
