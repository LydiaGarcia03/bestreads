/** Firebase web config read from `VITE_FIREBASE_*` env vars: pure, no SDK import. */

export const FIREBASE_ENV_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const;

type FirebaseOption = keyof typeof FIREBASE_ENV_KEYS;
export type FirebaseWebConfig = Record<FirebaseOption, string>;

const FIREBASE_OPTIONS = Object.keys(FIREBASE_ENV_KEYS) as FirebaseOption[];

/** Builds the Firebase config, failing loudly with every missing variable name. */
export function readFirebaseConfig(env: Readonly<Record<string, unknown>>): FirebaseWebConfig {
  const valueOf = (option: FirebaseOption) => {
    const value = env[FIREBASE_ENV_KEYS[option]];
    return typeof value === 'string' ? value.trim() : '';
  };

  const missing = FIREBASE_OPTIONS.filter((option) => valueOf(option) === '').map(
    (option) => FIREBASE_ENV_KEYS[option],
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase config: ${missing.join(', ')}. Copy .env.example to .env.local and fill it in.`,
    );
  }

  return Object.fromEntries(FIREBASE_OPTIONS.map((option) => [option, valueOf(option)])) as FirebaseWebConfig;
}
