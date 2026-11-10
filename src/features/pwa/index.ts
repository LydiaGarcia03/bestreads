// Public API (initial bundle: the shell and `main.tsx`). Small on purpose: `workbox-window` is
// imported dynamically by `registerServiceWorker`.
export { InstallAppButton } from './components/InstallAppButton';
export { PwaBanners } from './components/PwaBanners';
export { listenForInstallPrompt } from './installPrompt';
export { registerServiceWorker } from './serviceWorker';
