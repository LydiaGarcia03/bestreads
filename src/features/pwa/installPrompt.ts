/**
 * "Install app": keeps the browser's `beforeinstallprompt` event (Chromium browsers on desktop and
 * Android) so a button can show the install dialog later. Safari has no such event; there the
 * button never shows (Share → "Add to Home Screen" installs it).
 */

/** Not in TypeScript's DOM types yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const STANDALONE_QUERY = '(display-mode: standalone)';

/** Whether the app already runs installed (no install button then). */
export function isStandalone(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(STANDALONE_QUERY).matches;
}

/** Starts listening; call once at startup, since the event can fire before React renders. */
export function listenForInstallPrompt(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (event) => {
    // Keep the event for our own button instead of the browser's mini-infobar.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  target.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function canInstall(): boolean {
  return deferred !== null && !isStandalone();
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows the browser's install dialog; the event can be used once, whatever the user chooses. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}
