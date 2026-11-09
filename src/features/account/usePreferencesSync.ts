import { useEffect, useEffectEvent, useRef } from 'react';
import { useAuth } from '@/features/auth';
import { useLanguage, useTheme } from '@/features/preferences';
import type { UserRepository } from './types';
import { preferenceChanges, type UserPreferences } from './userDocument';

interface SyncedPreferences {
  uid: string;
  preferences: UserPreferences;
}

function logSyncError(error: unknown) {
  // Preferences still work locally (localStorage); the next login retries the sync.
  console.error('Could not sync preferences with the user document', error);
}

/**
 * Keeps theme and language in sync with `users/{uid}`:
 * on login the stored preferences win (a new user document starts from the local ones),
 * and later changes are written back.
 */
export function usePreferencesSync(loadRepository: () => Promise<UserRepository>) {
  const auth = useAuth();
  const user = auth.status === 'signedIn' ? auth.user : null;
  const { preference: theme, setPreference: setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const synced = useRef<SyncedPreferences | null>(null);

  const readLocalPreferences = useEffectEvent((): UserPreferences => ({ theme, language }));
  const applyPreferences = useEffectEvent((preferences: UserPreferences) => {
    setTheme(preferences.theme);
    setLanguage(preferences.language);
  });

  useEffect(() => {
    synced.current = null;
    if (!user) return;

    let isActive = true;
    loadRepository()
      .then((repository) => repository.ensureUser(user, readLocalPreferences()))
      .then((stored) => {
        if (!isActive) return;
        synced.current = { uid: user.uid, preferences: stored };
        applyPreferences(stored);
      })
      .catch(logSyncError);

    return () => {
      isActive = false;
    };
  }, [user, loadRepository]);

  useEffect(() => {
    const last = synced.current;
    if (!last) return;
    const current: UserPreferences = { theme, language };
    const changes = preferenceChanges(last.preferences, current);
    if (!changes) return;

    synced.current = { uid: last.uid, preferences: current };
    loadRepository()
      .then((repository) => repository.savePreferences(last.uid, changes))
      .catch(logSyncError);
  }, [theme, language, loadRepository]);
}
