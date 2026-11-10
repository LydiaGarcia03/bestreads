/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves the app from https://<user>.github.io/<repo>/
const REPO_BASE = '/bestreads/';

// Dedicated ports, so this app never shares an origin (favicon, storage, cache) with
// other local Vite projects on the default 5173/4173. strictPort fails instead of
// silently moving to another port.
const DEV_PORT = 5180;
const PREVIEW_PORT = 4180;

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [react(), tailwindcss()],
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
