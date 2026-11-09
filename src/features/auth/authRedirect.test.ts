import { createLoginRedirectState, LOGIN_PATH, resolveRedirectTarget } from './authRedirect';

describe('createLoginRedirectState', () => {
  it('keeps the path and query', () => {
    expect(createLoginRedirectState('/search', '?q=dune')).toEqual({ from: '/search?q=dune' });
    expect(createLoginRedirectState('/shelves')).toEqual({ from: '/shelves' });
  });
});

describe('resolveRedirectTarget', () => {
  it('returns the stored in-app path', () => {
    expect(resolveRedirectTarget({ from: '/book/abc' })).toBe('/book/abc');
    expect(resolveRedirectTarget(createLoginRedirectState('/search', '?q=dune'))).toBe('/search?q=dune');
  });

  it.each([
    ['no state', null],
    ['a non-object', 'shelves'],
    ['no from', {}],
    ['a non-string from', { from: 42 }],
    ['a relative path', { from: 'shelves' }],
    ['a protocol-relative URL', { from: '//evil.example' }],
    ['an absolute URL', { from: 'https://evil.example' }],
    ['the login path', { from: LOGIN_PATH }],
    ['the login path with a query', { from: `${LOGIN_PATH}?x=1` }],
  ])('falls back to Home for %s', (_case, state) => {
    expect(resolveRedirectTarget(state)).toBe('/');
  });
});
