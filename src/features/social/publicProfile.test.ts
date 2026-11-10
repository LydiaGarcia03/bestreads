import { formatUsername, readPublicProfile } from './publicProfile';

describe('readPublicProfile', () => {
  it('reads a stored profile', () => {
    expect(readPublicProfile('u1', { username: 'ana', displayName: 'Ana', photoURL: 'https://p.example/a.jpg' })).toEqual({
      uid: 'u1',
      username: 'ana',
      displayName: 'Ana',
      photoURL: 'https://p.example/a.jpg',
    });
  });

  it('turns missing or invalid name and photo into null', () => {
    expect(readPublicProfile('u1', { username: 'ana', displayName: 7 })).toEqual({
      uid: 'u1',
      username: 'ana',
      displayName: null,
      photoURL: null,
    });
  });

  it('returns null without a username', () => {
    expect(readPublicProfile('u1', { displayName: 'Ana' })).toBeNull();
    expect(readPublicProfile('u1', { username: '' })).toBeNull();
  });
});

describe('formatUsername', () => {
  it('adds the @', () => {
    expect(formatUsername('ana')).toBe('@ana');
  });
});
