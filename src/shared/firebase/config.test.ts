import { FIREBASE_ENV_KEYS, readFirebaseConfig } from './config';

const COMPLETE_ENV = {
  VITE_FIREBASE_API_KEY: 'api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
};

describe('readFirebaseConfig', () => {
  it('maps every env var to its Firebase option', () => {
    expect(readFirebaseConfig(COMPLETE_ENV)).toEqual({
      apiKey: 'api-key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo',
      storageBucket: 'demo.firebasestorage.app',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(readFirebaseConfig({ ...COMPLETE_ENV, VITE_FIREBASE_PROJECT_ID: '  demo  ' }).projectId).toBe('demo');
  });

  it('lists every missing or blank variable', () => {
    const env = { ...COMPLETE_ENV, VITE_FIREBASE_API_KEY: undefined, VITE_FIREBASE_APP_ID: '   ' };
    expect(() => readFirebaseConfig(env)).toThrow(
      `Missing Firebase config: ${FIREBASE_ENV_KEYS.apiKey}, ${FIREBASE_ENV_KEYS.appId}.`,
    );
  });

  it('fails for an empty environment', () => {
    expect(() => readFirebaseConfig({})).toThrow(/Missing Firebase config/);
  });
});
