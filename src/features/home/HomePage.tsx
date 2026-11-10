import { useTranslation } from 'react-i18next';
import { useShelfCount } from '@/features/books/lazy';
import { CurrentlyReading } from './components/CurrentlyReading';
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
 * The side column (series, friends, year) arrives with Phases 4, 6 and 7.
 */
export function HomePage() {
  const { t } = useTranslation();
  const isEmpty = useIsLibraryEmpty();

  return (
    <div className="flex max-w-4xl flex-col gap-7 lg:gap-9">
      <h1 className="sr-only">{t('pages.home.title')}</h1>
      {/* Placed only once the counts are known, so the section doesn't jump from bottom to top. */}
      {isEmpty === true && <PopularBooks />}
      <CurrentlyReading />
      <HomeShelves />
      {isEmpty === false && <PopularBooks />}
    </div>
  );
}
