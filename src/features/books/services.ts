import type { LibraryRepository } from './types';

let firestoreLibraryRepository: Promise<LibraryRepository> | undefined;

/** Loads the Firestore implementation in its own chunk, once per page load. */
export function loadFirestoreLibraryRepository(): Promise<LibraryRepository> {
  firestoreLibraryRepository ??= import('./firestoreLibraryRepository').then((module) =>
    module.createFirestoreLibraryRepository(),
  );
  return firestoreLibraryRepository;
}
