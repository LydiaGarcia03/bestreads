/**
 * Service worker registration (production builds only; the plugin serves no worker in dev).
 * A new version waits until the user chooses "Reload", so nothing being typed is lost.
 */

let reloadWithUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let needsRefresh = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Registers the worker after the page loads, from its own chunk (`workbox-window`). */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const { registerSW } = await import('virtual:pwa-register');
  reloadWithUpdate = registerSW({
    onNeedRefresh() {
      needsRefresh = true;
      notify();
    },
  });
}

export function isUpdateWaiting(): boolean {
  return needsRefresh;
}

export function subscribeUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Activates the waiting version and reloads the page. */
export async function applyUpdate(): Promise<void> {
  await reloadWithUpdate?.(true);
}

/** Hides the banner until the next new version. */
export function dismissUpdate(): void {
  needsRefresh = false;
  notify();
}
