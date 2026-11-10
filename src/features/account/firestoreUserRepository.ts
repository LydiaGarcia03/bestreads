import { doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/shared/firebase/app';
import type { UserRepository } from './types';
import {
  profileChanges,
  profileFromAuthUser,
  readStoredPreferences,
  readStoredProfile,
  type UserPreferences,
} from './userDocument';

const USERS_COLLECTION = 'users';
/** The public profile (`public/{uid}`), which repeats the display name and photo. */
const PUBLIC_COLLECTION = 'public';

/** Firestore implementation of `UserRepository`. Loaded on demand (see `services.ts`). */
export function createFirestoreUserRepository(db: Firestore = getFirestore(getFirebaseApp())): UserRepository {
  const userRef = (uid: string) => doc(db, USERS_COLLECTION, uid);

  return {
    async ensureUser(user, localPreferences) {
      const ref = userRef(user.uid);
      const snapshot = await getDoc(ref);
      const profile = profileFromAuthUser(user);

      if (!snapshot.exists()) {
        await setDoc(ref, { ...profile, preferences: localPreferences, createdAt: serverTimestamp() });
        return localPreferences;
      }

      const data = snapshot.data();
      const changes = profileChanges(readStoredProfile(data), profile);
      if (changes) {
        await updateDoc(ref, changes);
        // Profile changes are rare, so the extra read happens only then; no public profile, nothing to copy.
        const publicRef = doc(db, PUBLIC_COLLECTION, user.uid);
        if ((await getDoc(publicRef)).exists()) await updateDoc(publicRef, changes);
      }
      return readStoredPreferences(data.preferences, localPreferences);
    },

    async savePreferences(uid, changes) {
      const fields = Object.fromEntries(
        (Object.keys(changes) as (keyof UserPreferences)[]).map((key) => [`preferences.${key}`, changes[key]]),
      );
      await updateDoc(userRef(uid), fields);
    },
  };
}
