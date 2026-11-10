import { useTranslation } from 'react-i18next';
import { useShelfCount } from '@/features/books/lazy';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { CurrentlyReading } from './components/CurrentlyReading';
import { HomeFriends } from './components/HomeFriends';
import { HomeShelves } from './components/HomeShelves';
import { PopularBooks } from './components/PopularBooks';

/** Every library book has one of these statuses, so together they tell whether the library is empty. */
function useIsLibraryEmpty(): boolean | null {
  const counts = [
    useShelfCount({ kind: 'status', status: 'reading' }),
    useShelfCount({ kind: 'status', status: 'read' }),
    useShelfCount({ kind: 'status', status: 'wantToRead' }),
  ];
  if (counts.some((count) => count.isError)) return false;
  if (counts.some((count) => count.data === undefined)) return null;
  return counts.every((count) => count.data === 0);
}

/**
 * Home: "Currently reading", "My shelves" and "Popular books". With an empty library the
 * popular books come first, as a starting point; otherwise they follow the shelves.
 * Desktop adds a side column with friends' latest ratings (My Year arrives with Phase 7).
 */
export function HomePage() {
  const { t } = useTranslation();
  const isEmpty = useIsLibraryEmpty();
  // Rendered only on desktop, so phones don't read friends' ratings they never see.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <div className="flex max-w-6xl gap-10">
      <div className="flex max-w-4xl min-w-0 flex-1 flex-col gap-7 lg:gap-9">
        <h1 className="sr-only">{t('pages.home.title')}</h1>
        {/* Placed only once the counts are known, so the section doesn't jump from bottom to top. */}
        {isEmpty === true && <PopularBooks />}
        <CurrentlyReading />
        <HomeShelves />
        {isEmpty === false && <PopularBooks />}
      </div>
      {isDesktop && (
        <aside aria-label={t('home.sideColumn')} className="flex w-72 shrink-0 flex-col gap-6">
          <HomeFriends />
        </aside>
      )}
    </div>
  );
}
