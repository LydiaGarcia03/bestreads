import type { ReactNode } from 'react';

/** Page title (`h1`), one per screen. */
export function PageHeading({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold lg:text-[28px]">{children}</h1>;
}
