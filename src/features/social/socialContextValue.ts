import { createContext, useContext } from 'react';
import type { SocialRepository } from './types';

export type LoadSocialRepository = () => Promise<SocialRepository>;

export const SocialContext = createContext<LoadSocialRepository | null>(null);

export function useLoadSocialRepository(): LoadSocialRepository {
  const load = useContext(SocialContext);
  if (!load) throw new Error('useLoadSocialRepository must be used inside <SocialContextProvider>');
  return load;
}
