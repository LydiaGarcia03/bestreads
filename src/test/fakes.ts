import type { UserPreferences, UserRepository } from '@/features/account';
import type { AuthService, AuthUser } from '@/features/auth';
import type { BookSearchProvider, BookSearchResult } from '@/features/search';
import type { AppServices } from '@/app/services';

export const TEST_USER: AuthUser = {
  uid: 'test-user',
  displayName: 'Test Reader',
  email: 'reader@example.com',
  photoURL: null,
};

/** In-memory auth backend. Actions are spies; sign-in actions sign in `signInAs`. */
export class FakeAuthService implements AuthService {
  user: AuthUser | null;
  signInAs: AuthUser = TEST_USER;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();

  constructor(user: AuthUser | null) {
    this.user = user;
  }

  /** Simulates an auth state change coming from the backend. */
  setUser(user: AuthUser | null) {
    this.user = user;
    this.listeners.forEach((listener) => listener(user));
  }

  subscribe(listener: (user: AuthUser | null) => void) {
    this.listeners.add(listener);
    listener(this.user);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setLanguage = vi.fn();
  signInWithGoogle = vi.fn(async () => this.setUser(this.signInAs));
  signInWithEmail = vi.fn(async () => this.setUser(this.signInAs));
  signUpWithEmail = vi.fn(async () => this.setUser(this.signInAs));
  sendPasswordReset = vi.fn(async () => undefined);
  signOut = vi.fn(async () => this.setUser(null));
}

/** In-memory `users/{uid}` storage. `stored` is `null` until the first login creates it. */
export class FakeUserRepository implements UserRepository {
  stored: UserPreferences | null;

  constructor(stored: UserPreferences | null = null) {
    this.stored = stored;
  }

  ensureUser = vi.fn(async (_user: AuthUser, localPreferences: UserPreferences) => {
    this.stored ??= localPreferences;
    return this.stored;
  });

  savePreferences = vi.fn(async (_uid: string, changes: Partial<UserPreferences>) => {
    if (this.stored) this.stored = { ...this.stored, ...changes };
  });
}

/** In-memory book search: returns `results` for every query (a spy, so tests can override it). */
export class FakeBookSearchProvider implements BookSearchProvider {
  results: BookSearchResult[];

  constructor(results: BookSearchResult[] = []) {
    this.results = results;
  }

  search = vi.fn(async (_query: string, _signal?: AbortSignal) => this.results);
}

export function createTestBook(overrides: Partial<BookSearchResult> = {}): BookSearchResult {
  return {
    id: 'vol-1',
    title: 'Project Hail Mary',
    subtitle: null,
    authors: ['Andy Weir'],
    coverUrl: 'https://books.example/cover.jpg',
    description: null,
    pageCount: 476,
    isbn: '9780593135204',
    publishedYear: 2021,
    source: 'googleBooks',
    ...overrides,
  };
}

export function createFakeServices(
  authService: AuthService,
  userRepository: UserRepository,
  bookSearch: BookSearchProvider = new FakeBookSearchProvider(),
): AppServices {
  return {
    loadAuthService: () => Promise.resolve(authService),
    loadUserRepository: () => Promise.resolve(userRepository),
    bookSearch,
  };
}
