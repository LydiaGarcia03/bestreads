import { createContext, useContext } from 'react';
import type { CatalogProvider } from './types';

export const CatalogContext = createContext<CatalogProvider | null>(null);

export function useCatalog(): CatalogProvider {
  const provider = useContext(CatalogContext);
  if (!provider) throw new Error('useCatalog must be used inside <CatalogContextProvider>');
  return provider;
}
