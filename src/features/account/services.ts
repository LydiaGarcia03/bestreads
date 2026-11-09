import type { UserRepository } from './types';

let firestoreUserRepository: Promise<UserRepository> | undefined;

/** Loads the Firestore implementation in its own chunk, once per page load. */
export function loadFirestoreUserRepository(): Promise<UserRepository> {
  firestoreUserRepository ??= import('./firestoreUserRepository').then((module) =>
    module.createFirestoreUserRepository(),
  );
  return firestoreUserRepository;
}
