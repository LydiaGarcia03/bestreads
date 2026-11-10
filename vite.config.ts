/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from https://<user>.github.io/<repo>/
const REPO_BASE = '/bestreads/';

// Dedicated ports, so this app never shares an origin (favicon, storage, cache) with
// other local Vite projects on the default 5173/4173. strictPort fails instead of
// silently moving to another port.
const DEV_PORT = 5180;
const PREVIEW_PORT = 4180;

/** Light theme background (`--bg`): splash screen and browser UI before the app paints. */
const THEME_COLOR = '#F4F1EA';
const DAY_SECONDS = 24 * 60 * 60;

/**
 * Installable app: manifest from the "shelf" logo (icons from `npm run generate-pwa-assets`) and a
 * Workbox service worker that precaches the app shell (so the app opens offline) and keeps book
 * covers. Updates wait for the user ("Reload" banner), so a half-written review is never lost.
 * Firestore and the book APIs are never cached by the service worker.
 */
const pwa = VitePWA({
  registerType: 'prompt',
  injectRegister: false,
  includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'Bestreads',
    short_name: 'Bestreads',
    description: 'A private-first reading journal: shelves, ratings, reviews and reading plans.',
    lang: 'en',
    display: 'standalone',
    orientation: 'any',
    start_url: '.',
    scope: '.',
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Catalog covers (Google Books, Open Library and the archive it redirects to).
        urlPattern: ({ url }) =>
          (url.hostname === 'books.google.com' && url.pathname.startsWith('/books/')) ||
          url.hostname === 'covers.openlibrary.org' ||
          url.hostname.endsWith('.archive.org'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'book-covers',
          // Opaque (no-CORS) image responses have status 0.
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 400, maxAgeSeconds: 60 * DAY_SECONDS, purgeOnQuotaError: true },
        },
      },
    ],
  },
});

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react(), tailwindcss(), pwa],
  server: { port: DEV_PORT, strictPort: true },
  preview: { port: PREVIEW_PORT, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Rules tests need the Firestore emulator: `npm run test:rules` (vitest.rules.config.ts).
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));
