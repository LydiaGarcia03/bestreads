import type { ReactNode } from 'react';
import { SocialContext, type LoadSocialRepository } from './socialContextValue';

/** Makes the social storage available to the social hooks (injected in `AppProviders`). */
export function SocialContextProvider({
  loadRepository,
  children,
}: {
  /** Must keep the same identity across renders. */
  loadRepository: LoadSocialRepository;
  children: ReactNode;
}) {
  return <SocialContext.Provider value={loadRepository}>{children}</SocialContext.Provider>;
}
