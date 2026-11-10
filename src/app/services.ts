import { loadFirestoreUserRepository, type UserRepository } from '@/features/account';
import { loadFirebaseAuthService, type AuthService } from '@/features/auth';
import { loadFirestoreLibraryRepository, type LibraryRepository } from '@/features/books';
import { createCatalogProvider, type CatalogProvider } from '@/features/catalog';
import { loadFirestoreSocialRepository, type SocialRepository } from '@/features/social';

/** External services the app depends on, injected through `AppProviders` (faked in tests). */
export interface AppServices {
  loadAuthService: () => Promise<AuthService>;
  loadUserRepository: () => Promise<UserRepository>;
  loadLibraryRepository: () => Promise<LibraryRepository>;
  loadSocialRepository: () => Promise<SocialRepository>;
  catalog: CatalogProvider;
}

/** Production services: Firebase (loaded on demand) and the public book APIs. */
export const appServices: AppServices = {
  loadAuthService: loadFirebaseAuthService,
  loadUserRepository: loadFirestoreUserRepository,
  loadLibraryRepository: loadFirestoreLibraryRepository,
  loadSocialRepository: loadFirestoreSocialRepository,
  catalog: createCatalogProvider({ apiKey: import.meta.env.VITE_GOOGLE_BOOKS_API_KEY }),
};
