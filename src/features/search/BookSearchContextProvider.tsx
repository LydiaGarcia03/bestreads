import type { ReactNode } from 'react';
import { BookSearchContext } from './bookSearchContextValue';
import type { BookSearchProvider } from './types';

/** Makes the book search API available to the search screens (injected in `AppProviders`). */
export function BookSearchContextProvider({
  provider,
  children,
}: {
  provider: BookSearchProvider;
  children: ReactNode;
}) {
  return <BookSearchContext.Provider value={provider}>{children}</BookSearchContext.Provider>;
}
