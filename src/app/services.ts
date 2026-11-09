import { loadFirestoreUserRepository, type UserRepository } from '@/features/account';
import { loadFirebaseAuthService, type AuthService } from '@/features/auth';
import { createBookSearchProvider, type BookSearchProvider } from '@/features/search';

/** External services the app depends on, injected through `AppProviders` (faked in tests). */
export interface AppServices {
  loadAuthService: () => Promise<AuthService>;
  loadUserRepository: () => Promise<UserRepository>;
  bookSearch: BookSearchProvider;
}

/** Production services: Firebase (loaded on demand) and the public book APIs. */
export const appServices: AppServices = {
  loadAuthService: loadFirebaseAuthService,
  loadUserRepository: loadFirestoreUserRepository,
  bookSearch: createBookSearchProvider({ apiKey: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY }),
};
