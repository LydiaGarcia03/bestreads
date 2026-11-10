import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase/firestore';
import { getFirebaseApp } from '@/shared/firebase/app';
import { FOLLOW_LIST_LIMIT, followId } from './follows';
import { readPublicProfile, type PublicProfile } from './publicProfile';
import { nextRatingsCursor, readPublicRating, type PublicRating } from './publicRating';
import { UsernameAlreadySetError, UsernameTakenError, type SocialRepository } from './types';

const USERNAMES = 'usernames';
const PUBLIC = 'public';
const RATINGS = 'ratings';
const FOLLOWS = 'follows';
const ADMINS = 'admins';

/** Documents deleted per batch (Firestore allows 500 writes per batch). */
const DELETE_CHUNK_SIZE = 400;

/** Firestore timestamps → `Date`, so the domain never sees SDK types. */
function withDates(data: DocumentData): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value instanceof Timestamp ? value.toDate() : value]),
  );
}

/** Firestore implementation of `SocialRepository`. Loaded on demand (see `services.ts`). */
export function createFirestoreSocialRepository(db: Firestore = getFirestore(getFirebaseApp())): SocialRepository {
  const usernameRef = (username: string) => doc(db, USERNAMES, username);
  const profileRef = (uid: string) => doc(db, PUBLIC, uid);
  const followRef = (followerUid: string, followedUid: string) => doc(db, FOLLOWS, followId(followerUid, followedUid));
  const follows = collection(db, FOLLOWS);

  const getPublicProfile = async (uid: string) => {
    const snapshot = await getDoc(profileRef(uid));
    return snapshot.exists() ? readPublicProfile(uid, snapshot.data()) : null;
  };

  /** Deletes every document `source` returns, one batch per chunk. */
  const deleteAll = async (source: Query) => {
    for (;;) {
      const snapshot = await getDocs(query(source, limit(DELETE_CHUNK_SIZE)));
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
      if (snapshot.size < DELETE_CHUNK_SIZE) return;
    }
  };

  /** Profiles on the other side of `uid`'s follows. Equality filter only, so no composite index. */
  const listFollowProfiles = async (field: 'followerUid' | 'followedUid', uid: string) => {
    const otherField = field === 'followerUid' ? 'followedUid' : 'followerUid';
    const snapshot = await getDocs(query(follows, where(field, '==', uid), limit(FOLLOW_LIST_LIMIT)));
    const uids = snapshot.docs
      .map((document) => document.data()[otherField])
      .filter((other): other is string => typeof other === 'string');
    const profiles = await Promise.all(uids.map(getPublicProfile));
    return profiles.filter((profile): profile is PublicProfile => profile !== null);
  };

  return {
    getPublicProfile,

    async claimUsername(uid, username, details) {
      // A transaction, so two people can't take the same name and nobody gets two (the rules check it too).
      await runTransaction(db, async (transaction) => {
        const [taken, profile] = await Promise.all([
          transaction.get(usernameRef(username)),
          transaction.get(profileRef(uid)),
        ]);
        if (profile.exists()) throw new UsernameAlreadySetError();
        if (taken.exists()) throw new UsernameTakenError(username);
        transaction.set(usernameRef(username), { uid, createdAt: serverTimestamp() });
        transaction.set(profileRef(uid), { username, ...details });
      });
      return { uid, username, ...details };
    },

    async findProfileByUsername(username) {
      const snapshot = await getDoc(usernameRef(username));
      const uid = snapshot.exists() ? snapshot.data().uid : null;
      return typeof uid === 'string' ? getPublicProfile(uid) : null;
    },

    async listPublicRatings(uid, { pageSize, after }) {
      // Ordered by date, then id (ties); single-field index only, no composite index needed.
      const constraints = [
        orderBy('ratedAt', 'desc'),
        orderBy(documentId(), 'desc'),
        ...(after ? [startAfter(Timestamp.fromDate(after.ratedAt), after.bookId)] : []),
        limit(pageSize),
      ];
      const snapshot = await getDocs(query(collection(db, PUBLIC, uid, RATINGS), ...constraints));
      const documents = snapshot.docs.map((document) => ({ bookId: document.id, data: withDates(document.data()) }));
      const ratings = documents
        .map(({ bookId, data }) => readPublicRating(bookId, data))
        .filter((rating): rating is PublicRating => rating !== null);
      const last = documents.at(-1);
      const next = nextRatingsCursor(documents.length, pageSize, last && { bookId: last.bookId, ratedAt: last.data.ratedAt });
      return { ratings, next };
    },

    async isFollowing(followerUid, followedUid) {
      return (await getDoc(followRef(followerUid, followedUid))).exists();
    },

    async follow(followerUid, followedUid) {
      await setDoc(followRef(followerUid, followedUid), { followerUid, followedUid, createdAt: serverTimestamp() });
    },

    async unfollow(followerUid, followedUid) {
      await deleteDoc(followRef(followerUid, followedUid));
    },

    async countFollows(uid) {
      // Aggregations: billed as one read per 1,000 documents counted, without downloading them.
      const [followers, following] = await Promise.all([
        getCountFromServer(query(follows, where('followedUid', '==', uid))),
        getCountFromServer(query(follows, where('followerUid', '==', uid))),
      ]);
      return { followers: followers.data().count, following: following.data().count };
    },

    listFollowing: (uid) => listFollowProfiles('followerUid', uid),

    listFollowers: (uid) => listFollowProfiles('followedUid', uid),

    async isAdmin(uid) {
      return (await getDoc(doc(db, ADMINS, uid))).exists();
    },

    async removePublicRating(uid, bookId) {
      await deleteDoc(doc(db, PUBLIC, uid, RATINGS, bookId));
    },

    async removePublicProfile(uid) {
      // Ratings and follows first, the profile last: if this stops halfway, the profile is still
      // there to find and remove again.
      await deleteAll(collection(db, PUBLIC, uid, RATINGS));
      await deleteAll(query(follows, where('followedUid', '==', uid)));
      await deleteAll(query(follows, where('followerUid', '==', uid)));
      await deleteDoc(profileRef(uid));
    },
  };
}
