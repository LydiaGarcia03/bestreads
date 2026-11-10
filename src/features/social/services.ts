import type { SocialRepository } from './types';

let firestoreSocialRepository: Promise<SocialRepository> | undefined;

/** Loads the Firestore implementation in its own chunk, once per page load. */
export function loadFirestoreSocialRepository(): Promise<SocialRepository> {
  firestoreSocialRepository ??= import('./firestoreSocialRepository').then((module) =>
    module.createFirestoreSocialRepository(),
  );
  return firestoreSocialRepository;
}
