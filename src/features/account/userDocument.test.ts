import type { AuthUser } from '@/features/auth';
import {
  PHOTO_URL_MAX_LENGTH,
  preferenceChanges,
  profileChanges,
  profileFromAuthUser,
  readStoredPreferences,
  readStoredProfile,
  type UserPreferences,
} from './userDocument';

const USER: AuthUser = { uid: 'u1', displayName: 'Ana', email: 'a@b.co', photoURL: 'https://img/ana.png' };
const DEFAULTS: UserPreferences = { theme: 'system', language: 'en' };

describe('profileFromAuthUser', () => {
  it('keeps name and photo', () => {
    expect(profileFromAuthUser(USER)).toEqual({ displayName: 'Ana', photoURL: 'https://img/ana.png' });
  });

  it('trims and caps the name, and turns blanks into null', () => {
    expect(profileFromAuthUser({ ...USER, displayName: '  Ana  ' }).displayName).toBe('Ana');
    expect(profileFromAuthUser({ ...USER, displayName: 'x'.repeat(150) }).displayName).toHaveLength(100);
    expect(profileFromAuthUser({ ...USER, displayName: '   ' }).displayName).toBeNull();
    expect(profileFromAuthUser({ ...USER, displayName: null }).displayName).toBeNull();
  });

  it('drops a photo URL that is too long', () => {
    const photoURL = `https://img/${'x'.repeat(PHOTO_URL_MAX_LENGTH)}`;
    expect(profileFromAuthUser({ ...USER, photoURL }).photoURL).toBeNull();
  });
});

describe('readStoredProfile', () => {
  it('reads strings and treats anything else as null', () => {
    expect(readStoredProfile({ displayName: 'Ana', photoURL: 3 })).toEqual({ displayName: 'Ana', photoURL: null });
    expect(readStoredProfile({})).toEqual({ displayName: null, photoURL: null });
  });
});

describe('readStoredPreferences', () => {
  it('returns valid stored preferences', () => {
    expect(readStoredPreferences({ theme: 'dark', language: 'pt-BR' }, DEFAULTS)).toEqual({
      theme: 'dark',
      language: 'pt-BR',
    });
  });

  it('falls back per invalid field', () => {
    expect(readStoredPreferences({ theme: 'neon', language: 'pt-BR' }, DEFAULTS)).toEqual({
      theme: 'system',
      language: 'pt-BR',
    });
    expect(readStoredPreferences({ theme: 'light' }, DEFAULTS)).toEqual({ theme: 'light', language: 'en' });
  });

  it('falls back entirely for a missing value', () => {
    expect(readStoredPreferences(undefined, DEFAULTS)).toBe(DEFAULTS);
    expect(readStoredPreferences('dark', DEFAULTS)).toBe(DEFAULTS);
  });
});

describe('preferenceChanges', () => {
  it('returns only the changed fields', () => {
    expect(preferenceChanges(DEFAULTS, { theme: 'dark', language: 'en' })).toEqual({ theme: 'dark' });
    expect(preferenceChanges(DEFAULTS, { theme: 'light', language: 'pt-BR' })).toEqual({
      theme: 'light',
      language: 'pt-BR',
    });
  });

  it('returns null when nothing changed', () => {
    expect(preferenceChanges(DEFAULTS, { ...DEFAULTS })).toBeNull();
  });
});

describe('profileChanges', () => {
  it('detects a new name or photo', () => {
    expect(profileChanges({ displayName: null, photoURL: null }, { displayName: 'Ana', photoURL: null })).toEqual({
      displayName: 'Ana',
    });
    expect(profileChanges({ displayName: 'Ana', photoURL: null }, { displayName: 'Ana', photoURL: null })).toBeNull();
  });
});
