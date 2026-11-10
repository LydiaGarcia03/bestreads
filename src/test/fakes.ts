import type { UserPreferences, UserRepository } from '@/features/account';
import type { AuthService, AuthUser } from '@/features/auth';
import type { AppServices } from '@/app/services';
import type {
  LibraryBook,
  LibraryBookPatch,
  LibraryRepository,
  ListBooksOptions,
  RatingChange,
  ReadingStatus,
  Review,
  Shelf,
  ShelfFilter,
} from '@/features/books';
// Test helpers may use domain internals to build realistic data.
import { sortShelves } from '@/features/books/shelves';
// Test helpers may use domain internals to build realistic data.
import { newLibraryBookData } from '@/features/books/library';
import type { CatalogBook, CatalogProvider, CatalogSearchOptions, CatalogSearchResult } from '@/features/catalog';

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

/**
 * In-memory book catalog: `search` returns `results` for every query and `getBook` finds books
 * by id in `results` (both are spies, so tests can override them).
 */
export class FakeCatalog implements CatalogProvider {
  results: CatalogBook[];

  constructor(results: CatalogBook[] = []) {
    this.results = results;
  }

  search = vi.fn(
    async (_query: string, { page, pageSize }: CatalogSearchOptions, _signal?: AbortSignal): Promise<CatalogSearchResult> => {
      const start = page * pageSize;
      return { books: this.results.slice(start, start + pageSize), hasMore: start + pageSize < this.results.length };
    },
  );
  getBook = vi.fn(
    async (bookId: string, _signal?: AbortSignal) => this.results.find((book) => book.id === bookId) ?? null,
  );
  /** Popular books: `results` too, unless a test sets `popularBooks`. */
  popularBooks: CatalogBook[] | null = null;
  popular = vi.fn(async (limit: number, _signal?: AbortSignal) => (this.popularBooks ?? this.results).slice(0, limit));
}

export function createTestBook(overrides: Partial<CatalogBook> = {}): CatalogBook {
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
    publishedDate: '2021-05-04',
    categories: ['Fiction', 'Science Fiction'],
    popularity: 0,
    series: null,
    subjects: [],
    source: 'googleBooks',
    ...overrides,
  };
}

const isOnShelf = (book: LibraryBook, filter: ShelfFilter) =>
  filter.kind === 'status' ? book.status === filter.status : book.shelfIds.includes(filter.shelfId);

/**
 * In-memory `users/{uid}/books` and `users/{uid}/shelves` for one user.
 * Methods are spies, so tests can check calls or force errors.
 */
export class FakeLibraryRepository implements LibraryRepository {
  readonly books = new Map<string, LibraryBook>();
  readonly shelves = new Map<string, Shelf>();
  private nextShelfId = 1;

  constructor(books: LibraryBook[] = [], shelves: Shelf[] = []) {
    books.forEach((book) => this.books.set(book.id, book));
    shelves.forEach((shelf) => this.shelves.set(shelf.id, shelf));
  }

  getBook = vi.fn(async (_uid: string, bookId: string) => this.books.get(bookId) ?? null);

  addBook = vi.fn(async (_uid: string, book: CatalogBook, status: ReadingStatus, today: string) => {
    const existing = this.books.get(book.id);
    if (existing) return existing;
    const added: LibraryBook = { id: book.id, ...newLibraryBookData(book, status, today), addedAt: null, updatedAt: null };
    this.books.set(book.id, added);
    return added;
  });

  updateBook = vi.fn(async (_uid: string, bookId: string, patch: LibraryBookPatch) => {
    const book = this.books.get(bookId);
    if (book) this.books.set(bookId, { ...book, ...patch });
  });

  updateRating = vi.fn(async (_uid: string, { id }: LibraryBook, change: RatingChange) => {
    const book = this.books.get(id);
    if (book) this.books.set(id, { ...book, ...change });
  });

  readonly reviews = new Map<string, Review>();

  removeBook = vi.fn(async (_uid: string, bookId: string) => {
    this.books.delete(bookId);
    this.reviews.delete(bookId);
  });

  getReview = vi.fn(async (_uid: string, bookId: string) => this.reviews.get(bookId) ?? null);

  readonly covers = new Map<string, string>();

  getPersonalCover = vi.fn(async (_uid: string, bookId: string) => this.covers.get(bookId) ?? null);

  savePersonalCover = vi.fn(async (_uid: string, bookId: string, dataUrl: string | null) => {
    if (dataUrl) this.covers.set(bookId, dataUrl);
    else this.covers.delete(bookId);
    const book = this.books.get(bookId);
    if (book) this.books.set(bookId, { ...book, hasPersonalCover: dataUrl !== null });
  });

  saveReview = vi.fn(async (_uid: string, bookId: string, text: string) => {
    if (text) this.reviews.set(bookId, { text, updatedAt: null });
    else this.reviews.delete(bookId);
  });

  listBooks = vi.fn(async (_uid: string, { filter, limit }: ListBooksOptions) =>
    [...this.books.values()].filter((book) => isOnShelf(book, filter)).slice(0, limit),
  );

  countBooks = vi.fn(
    async (_uid: string, filter: ShelfFilter) => [...this.books.values()].filter((book) => isOnShelf(book, filter)).length,
  );

  listShelves = vi.fn(async (_uid: string) => sortShelves([...this.shelves.values()]));

  createShelf = vi.fn(async (_uid: string, data: Omit<Shelf, 'id'>) => {
    const shelf = { id: `shelf-${this.nextShelfId++}`, ...data };
    this.shelves.set(shelf.id, shelf);
    return shelf;
  });

  renameShelf = vi.fn(async (_uid: string, shelfId: string, name: string) => {
    const shelf = this.shelves.get(shelfId);
    if (shelf) this.shelves.set(shelfId, { ...shelf, name });
  });

  reorderShelves = vi.fn(async (_uid: string, orders: readonly { id: string; order: number }[]) => {
    orders.forEach(({ id, order }) => {
      const shelf = this.shelves.get(id);
      if (shelf) this.shelves.set(id, { ...shelf, order });
    });
  });

  deleteShelf = vi.fn(async (_uid: string, shelfId: string) => {
    this.shelves.delete(shelfId);
    this.books.forEach((book, id) =>
      this.books.set(id, { ...book, shelfIds: book.shelfIds.filter((shelf) => shelf !== shelfId) }),
    );
  });
}

/** A fixed calendar day for test data that needs one. */
export const TEST_TODAY = '2026-11-09';

/** A library book built from `createTestBook`, with optional overrides. */
export function createTestLibraryBook(overrides: Partial<LibraryBook> = {}): LibraryBook {
  const book = createTestBook();
  return { id: book.id, ...newLibraryBookData(book, 'wantToRead', TEST_TODAY), addedAt: null, updatedAt: null, ...overrides };
}

export interface FakeServicesOptions {
  authService: AuthService;
  userRepository?: UserRepository;
  catalog?: CatalogProvider;
  library?: LibraryRepository;
}

export function createFakeServices({
  authService,
  userRepository = new FakeUserRepository(),
  catalog = new FakeCatalog(),
  library = new FakeLibraryRepository(),
}: FakeServicesOptions): AppServices {
  return {
    loadAuthService: () => Promise.resolve(authService),
    loadUserRepository: () => Promise.resolve(userRepository),
    loadLibraryRepository: () => Promise.resolve(library),
    catalog,
  };
}
