import type { UserRepository } from './types';
import { usePreferencesSync } from './usePreferencesSync';

export interface PreferencesSyncProps {
  /** Loads the user document storage. Must keep the same identity across renders. */
  loadRepository: () => Promise<UserRepository>;
}

/** Renders nothing; keeps theme and language preferences in sync with the signed-in user's document. */
export function PreferencesSync({ loadRepository }: PreferencesSyncProps) {
  usePreferencesSync(loadRepository);
  return null;
}
