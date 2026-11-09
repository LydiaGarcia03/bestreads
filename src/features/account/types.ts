import type { AuthUser } from '@/features/auth';
import type { UserPreferences } from './userDocument';

/** `users/{uid}` storage boundary. Implemented with Firestore; faked in tests. */
export interface UserRepository {
  /**
   * Creates the user document on first login (with `localPreferences`), refreshes the stored
   * profile when it changed, and returns the stored preferences.
   */
  ensureUser(user: AuthUser, localPreferences: UserPreferences): Promise<UserPreferences>;
  savePreferences(uid: string, changes: Partial<UserPreferences>): Promise<void>;
}
