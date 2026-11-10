import type { ReactNode } from 'react';
import { CatalogContext } from './catalogContextValue';
import type { CatalogProvider } from './types';

/** Makes the book search API available to the search screens (injected in `AppProviders`). */
export function CatalogContextProvider({
  provider,
  children,
}: {
  provider: CatalogProvider;
  children: ReactNode;
}) {
  return <CatalogContext.Provider value={provider}>{children}</CatalogContext.Provider>;
}
