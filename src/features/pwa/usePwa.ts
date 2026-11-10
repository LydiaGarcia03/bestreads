import { useSyncExternalStore } from 'react';
import { canInstall, subscribeInstall } from './installPrompt';
import { isUpdateWaiting, subscribeUpdate } from './serviceWorker';

/** Whether the browser offers installing the app right now. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribeInstall, canInstall, () => false);
}

/** Whether a new version of the app is waiting for a reload. */
export function useUpdateWaiting(): boolean {
  return useSyncExternalStore(subscribeUpdate, isUpdateWaiting, () => false);
}

function subscribeOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

/** Whether the browser reports a network connection. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
