import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '@/shared/ui/PageLoader';
import { BottomTabBar } from './BottomTabBar';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

const MAIN_CONTENT_ID = 'main-content';

/** Responsive frame around every screen: top bar, side menu (desktop), tab bar (mobile). */
export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        onClick={(event) => {
          // HashRouter owns the URL hash, so move focus instead of navigating.
          event.preventDefault();
          document.getElementById(MAIN_CONTENT_ID)?.focus();
        }}
        className="sr-only z-20 rounded-md bg-surface px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('a11y.skipToContent')}
      </a>

      <TopBar />

      <div className="mx-auto flex max-w-[1280px] gap-6 lg:p-6">
        <SideNav />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="min-w-0 flex-1 px-5 pt-4 pb-[calc(68px+env(safe-area-inset-bottom)+1rem)] outline-none lg:p-0"
        >
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomTabBar />
    </div>
  );
}
