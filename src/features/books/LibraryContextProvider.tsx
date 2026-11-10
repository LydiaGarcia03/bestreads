import type { ReactNode } from 'react';
import { LibraryContext, type LoadLibraryRepository } from './libraryContextValue';

/** Makes the library storage available to the library hooks (injected in `AppProviders`). */
export function LibraryContextProvider({
  loadRepository,
  children,
}: {
  /** Must keep the same identity across renders. */
  loadRepository: LoadLibraryRepository;
  children: ReactNode;
}) {
  return <LibraryContext.Provider value={loadRepository}>{children}</LibraryContext.Provider>;
}
