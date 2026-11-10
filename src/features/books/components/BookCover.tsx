import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BooksIcon } from '@/shared/ui/icons';

export interface BookCoverProps {
  src: string | null;
  title: string;
  /** Sets the width; the height follows the 2:3 book cover ratio (no layout shift). */
  className?: string;
}

/** Book cover with a placeholder when there is no image or it fails to load. */
export function BookCover({ src, title, className = '' }: BookCoverProps) {
  return (
    <div className={`aspect-[2/3] overflow-hidden rounded-sm border border-border bg-surface-muted ${className}`}>
      {src ? <CoverImage key={src} src={src} title={title} /> : <CoverPlaceholder title={title} />}
    </div>
  );
}

function CoverImage({ src, title }: { src: string; title: string }) {
  const { t } = useTranslation();
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) return <CoverPlaceholder title={title} />;

  return (
    <img
      src={src}
      alt={t('books.coverAlt', { title })}
      loading="lazy"
      decoding="async"
      onError={() => setHasFailed(true)}
      className="size-full object-cover"
    />
  );
}

function CoverPlaceholder({ title }: { title: string }) {
  const { t } = useTranslation();

  return (
    <div role="img" aria-label={t('books.noCover', { title })} className="flex size-full items-center justify-center text-dot">
      <BooksIcon size={24} />
    </div>
  );
}
