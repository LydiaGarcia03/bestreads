import { LOGIN_PATH } from '@/features/auth';
import { BOOK_PATH, SHELVES_PATH } from '@/features/books';
import { SEARCH_PATH } from '@/features/search';

/** Every route path in one place. */
export const PATHS = {
  home: '/',
  login: LOGIN_PATH,
  search: SEARCH_PATH,
  book: BOOK_PATH,
  shelves: SHELVES_PATH,
  friends: '/friends',
  year: '/year',
  settings: '/settings',
} as const;
