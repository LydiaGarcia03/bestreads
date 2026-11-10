import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { buildBookPath } from '../bookPath';
import type { LibraryBook } from '../library';
import { buildSeriesTimeline, summarizeSeries, type SeriesVolume } from '../seriesTimeline';
import { useAddToLibrary } from '../useLibrary';
import { useCatalogSeries, useSeriesBooks } from '../useSeries';
import { BookCover } from './BookCover';
import { LibraryBookCover } from './LibraryBookCover';
import { SeriesDot } from './SeriesDot';

/**
 * The series of the current book: progress across volumes and a dot timeline of every volume
 * (owned or known to the catalog), with "+ Add" for missing ones and "Add whole series to Want to read".
 */
export function SeriesPanel({ book }: { book: LibraryBook }) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const name = book.series?.name ?? null;
  const owned = useSeriesBooks(name);
  const catalog = useCatalogSeries(name);
  const addToLibrary = useAddToLibrary();
  const [addingAll, setAddingAll] = useState(false);

  if (!name) return null;
  const volumes = buildSeriesTimeline(name, owned.data ?? [book], catalog.data ?? []);
  const summary = summarizeSeries(volumes);
  const missing = volumes.flatMap((volume) => (volume.catalogBook ? [volume.catalogBook] : []));
  const author = volumes.find((volume) => volume.authors.length > 0)?.authors[0];
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);

  const addVolume = ({ catalogBook }: SeriesVolume) =>
    catalogBook ? () => addToLibrary.mutate({ book: catalogBook, status: 'wantToRead' }) : null;

  const addAll = async () => {
    setAddingAll(true);
    try {
      // One at a time: each add is a small transaction, and the list refreshes as they land.
      for (const missingBook of missing) {
        await addToLibrary.mutateAsync({ book: missingBook, status: 'wantToRead' });
      }
    } finally {
      setAddingAll(false);
    }
  };

  return (
    <aside aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-fg-muted uppercase">{t('series.label')}</p>
        <h2 id={headingId} className="text-xl font-bold">
          {name}
        </h2>
        <p className="text-[13px] text-fg-muted">
          {author ? t('series.authorAndCount', { author, count: summary.total }) : t('series.count', { count: summary.total })}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-2 text-xs text-fg-muted">
          <span>{t('series.progress', { read: summary.read, reading: summary.reading })}</span>
          <span>{t('series.toGo', { count: summary.toGo })}</span>
        </div>
        <div aria-hidden="true" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, summary.total)}, minmax(0, 1fr))` }}>
          {volumes.map((volume) => (
            <div
              key={volume.bookId}
              className="h-1 rounded-full bg-border"
              style={
                volume.state === 'read'
                  ? { background: 'var(--accent)' }
                  : volume.state === 'reading'
                    ? { background: `linear-gradient(90deg, var(--accent) ${volume.percent ?? 0}%, var(--border) ${volume.percent ?? 0}%)` }
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      {catalog.isPending && owned.isSuccess && <p className="text-xs text-fg-muted">{t('series.loadingVolumes')}</p>}

      <ol className="flex flex-col">
        {volumes.map((volume, index) => (
          <TimelineItem
            key={volume.bookId}
            volume={volume}
            isCurrent={volume.bookId === book.id}
            isLast={index === volumes.length - 1}
            details={volumeDetails(volume, t, number)}
            onAdd={addVolume(volume)}
            isAdding={addToLibrary.isPending && addToLibrary.variables?.book.id === volume.bookId}
          />
        ))}
      </ol>

      {missing.length > 1 && (
        <button
          type="button"
          disabled={addingAll}
          onClick={() => void addAll()}
          className="min-h-11 w-fit text-left text-[13px] font-bold text-accent hover:underline disabled:opacity-60"
        >
          {addingAll ? t('series.adding') : t('series.addAll', { count: missing.length })}
        </button>
      )}
      {addToLibrary.isError && (
        <p role="alert" className="text-xs font-bold text-danger">
          {t('books.saveError')}
        </p>
      )}
    </aside>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** "#3 · 1981", or "#3 · reading · 25%". */
function volumeDetails(volume: SeriesVolume, t: Translate, number: Intl.NumberFormat): string {
  const parts = [
    volume.volume === null ? null : `#${number.format(volume.volume)}`,
    volume.state === 'reading' ? t('series.reading') : volume.year?.toString(),
    volume.state === 'reading' && volume.percent !== null ? `${volume.percent}%` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

interface TimelineItemProps {
  volume: SeriesVolume;
  isCurrent: boolean;
  isLast: boolean;
  details: string;
  onAdd: (() => void) | null;
  isAdding: boolean;
}

function TimelineItem({ volume, isCurrent, isLast, details, onAdd, isAdding }: TimelineItemProps) {
  const { t } = useTranslation();
  const lineColor = volume.state === 'read' ? 'bg-accent' : 'bg-border';
  const cover = volume.libraryBook ? (
    <LibraryBookCover book={volume.libraryBook} className="w-8 shrink-0" />
  ) : (
    <BookCover src={volume.catalogBook?.coverUrl ?? null} title={volume.title} className="w-8 shrink-0 opacity-80" />
  );
  const text = (
    <div className="min-w-0 flex-1">
      <p className="line-clamp-2 text-sm font-bold">{volume.title}</p>
      <p className={`text-xs ${volume.state === 'reading' ? 'text-accent' : 'text-fg-muted'}`}>{details}</p>
    </div>
  );

  return (
    <li className="flex gap-3">
      <div aria-hidden="true" className="flex w-4 flex-col items-center pt-5">
        <SeriesDot state={volume.state} />
        {!isLast && <span className={`w-0.5 flex-1 ${lineColor}`} />}
      </div>
      <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 ${isCurrent ? 'bg-surface-muted' : ''}`}>
        {isCurrent ? (
          <div aria-current="page" className="flex min-w-0 flex-1 items-center gap-3">
            {cover}
            {text}
          </div>
        ) : (
          <Link to={buildBookPath(volume.bookId)} className="flex min-w-0 flex-1 items-center gap-3 text-fg hover:text-fg">
            {cover}
            {text}
          </Link>
        )}
        {onAdd && (
          <button
            type="button"
            disabled={isAdding}
            onClick={onAdd}
            aria-label={t('series.addVolume', { title: volume.title })}
            className="min-h-11 shrink-0 px-1 text-xs font-bold text-accent hover:underline disabled:opacity-60 lg:min-h-8"
          >
            {t('series.addShort')}
          </button>
        )}
        <span className="sr-only">{t(`series.states.${volume.state}`)}</span>
      </div>
    </li>
  );
}
