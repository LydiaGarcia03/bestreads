import { LOGIN_PATH } from '@/features/auth';
import { BOOK_PATH, SHELVES_PATH } from '@/features/books';
import { SEARCH_PATH } from '@/features/search';
import { FRIENDS_PATH, PROFILE_PATH } from '@/features/social';
import { YEAR_PATH } from '@/features/year';

/** Every route path in one place. */
export const PATHS = {
  home: '/',
  login: LOGIN_PATH,
  search: SEARCH_PATH,
  book: BOOK_PATH,
  shelves: SHELVES_PATH,
  friends: FRIENDS_PATH,
  profile: PROFILE_PATH,
  year: YEAR_PATH,
  settings: '/settings',
} as const;
