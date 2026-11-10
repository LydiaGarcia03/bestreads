import { createContext, useContext } from 'react';
import type { LibraryRepository } from './types';

export type LoadLibraryRepository = () => Promise<LibraryRepository>;

export const LibraryContext = createContext<LoadLibraryRepository | null>(null);

export function useLoadLibraryRepository(): LoadLibraryRepository {
  const load = useContext(LibraryContext);
  if (!load) throw new Error('useLoadLibraryRepository must be used inside <LibraryContextProvider>');
  return load;
}
