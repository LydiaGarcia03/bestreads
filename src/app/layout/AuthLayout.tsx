import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LanguageSelect } from '@/features/preferences';
import { PageLoader } from '@/shared/ui/PageLoader';
import { Logo } from './Logo';

/** Minimal frame for signed-out screens: logo and language only, no navigation or search. */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-bg pt-[env(safe-area-inset-top)] lg:bg-surface">
        <div className="mx-auto flex max-w-page items-center justify-between gap-6 px-5 py-3 lg:px-6">
          <Logo />
          <LanguageSelect />
        </div>
      </header>
      <main className="flex-1 px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:pt-16">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
