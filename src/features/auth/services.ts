import type { AuthService } from './types';

let firebaseAuthService: Promise<AuthService> | undefined;

/**
 * Loads the Firebase Auth implementation in its own chunk, once per page load,
 * so the SDK is not part of the initial bundle.
 */
export function loadFirebaseAuthService(): Promise<AuthService> {
  firebaseAuthService ??= import('./firebaseAuthService').then((module) => module.createFirebaseAuthService());
  return firebaseAuthService;
}
