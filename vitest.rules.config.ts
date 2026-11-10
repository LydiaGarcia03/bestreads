/**
 * Firestore security rules tests. They run against the Firestore emulator started by
 * `npm run test:rules` (`firebase emulators:exec`), never against the real project.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    // One emulator database for every file: run them one after another.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
