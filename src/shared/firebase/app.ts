import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { readFirebaseConfig } from './config';

/**
 * The single Firebase app instance, created on first use.
 * Only data-access modules that are loaded with dynamic `import()` may import this file,
 * so the Firebase SDK stays out of the initial bundle. There is deliberately no index file.
 */
export function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(readFirebaseConfig(import.meta.env));
}
