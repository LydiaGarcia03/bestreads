import { createContext, useContext } from 'react';
import type { BookSearchProvider } from './types';

export const BookSearchContext = createContext<BookSearchProvider | null>(null);

export function useBookSearchProvider(): BookSearchProvider {
  const provider = useContext(BookSearchContext);
  if (!provider) throw new Error('useBookSearchProvider must be used inside <BookSearchContextProvider>');
  return provider;
}
