import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { Button } from '@/shared/ui/Button';
import { LockIcon } from '@/shared/ui/icons';
import type { LibraryBook } from '../library';
import { hasReviewChanges, isReviewTooLong, REVIEW_MAX_LENGTH, reviewExcerpt } from '../review';
import { useReview, useSaveReview } from '../useReview';

/** Characters shown in the collapsed preview on phones. */
const EXCERPT_LENGTH = 180;
/** The counter appears once the review gets this close to the limit. */
const COUNTER_FROM = REVIEW_MAX_LENGTH - 2000;

/**
 * "My review", private to the owner. Desktop edits it in place, under the rating; phones show a
 * preview and "Add review" / "Edit review", which opens a full-screen editor (no inline long-text editing).
 */
export function ReviewSection({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const headingId = useId();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const review = useReview(book.id);
  const saved = review.data?.text ?? '';

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="text-[15px] font-bold lg:text-xl lg:font-normal lg:italic">
          {t('review.title')}
        </h2>
        <p className="flex items-center gap-1 text-xs text-fg-muted">
          <LockIcon size={13} />
          {t('review.private')}
        </p>
      </div>

      {review.isPending && (
        <p role="status" className="text-sm text-fg-muted">
          {t('review.loading')}
        </p>
      )}
      {review.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>{t('review.loadError')}</p>
          <Button variant="secondary" onClick={() => void review.refetch()} className="h-9">
            {t('books.retry')}
          </Button>
        </div>
      )}
      {review.isSuccess &&
        (isDesktop ? (
          <InlineReviewEditor bookId={book.id} saved={saved} />
        ) : (
          <MobileReview bookId={book.id} title={book.title} saved={saved} />
        ))}
    </section>
  );
}

interface ReviewFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/** The review textarea with a counter near the limit and a message beyond it. */
function ReviewField({ id, value, onChange, label, className = '' }: ReviewFieldProps) {
  const { t, i18n } = useTranslation();
  const counterId = useId();
  const length = value.trim().length;
  const tooLong = isReviewTooLong(value);
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <textarea
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('review.placeholder')}
        aria-invalid={tooLong}
        aria-describedby={length >= COUNTER_FROM ? counterId : undefined}
        className="min-h-0 w-full flex-1 resize-y rounded-md border border-border-strong bg-surface p-3 text-[15px] leading-relaxed text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
      />
      {length >= COUNTER_FROM && (
        <p id={counterId} className={`text-xs ${tooLong ? 'font-bold text-danger' : 'text-fg-muted'}`}>
          {tooLong
            ? t('review.tooLong', { max: number.format(REVIEW_MAX_LENGTH) })
            : t('review.counter', { count: length, max: number.format(REVIEW_MAX_LENGTH) })}
        </p>
      )}
    </div>
  );
}

/** Desktop: a large textarea with "Save review", always in place (rendered once the review has loaded). */
function InlineReviewEditor({ bookId, saved }: { bookId: string; saved: string }) {
  const { t } = useTranslation();
  const fieldId = useId();
  const [draft, setDraft] = useState(saved);
  const save = useSaveReview(bookId);
  const isDirty = hasReviewChanges(draft, saved);

  return (
    <div className="flex flex-col gap-3">
      <ReviewField id={fieldId} label={t('review.title')} value={draft} onChange={setDraft} className="[&_textarea]:h-56" />
      <div className="flex items-center gap-3">
        <Button disabled={!isDirty || isReviewTooLong(draft) || save.isPending} onClick={() => save.mutate(draft)}>
          {save.isPending ? t('review.saving') : t('review.save')}
        </Button>
        {isDirty && (
          <Button variant="secondary" onClick={() => setDraft(saved)}>
            {t('review.discard')}
          </Button>
        )}
        <p role="status" className="text-sm text-fg-muted">
          {!isDirty && save.isSuccess ? t('review.saved') : ''}
        </p>
      </div>
      {save.isError && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t('review.saveError')}
        </p>
      )}
    </div>
  );
}

/** Phones: a preview and a button opening the full-screen editor. */
function MobileReview({ bookId, title, saved }: { bookId: string; title: string; saved: string }) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsEditing(false);
    // Back to the button that opened the editor (it stays mounted), so keyboard and screen reader users keep their place.
    openButtonRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-start gap-3">
      {saved && <p className="text-[15px] leading-relaxed whitespace-pre-line">{reviewExcerpt(saved, EXCERPT_LENGTH)}</p>}
      <Button ref={openButtonRef} variant="secondary" onClick={() => setIsEditing(true)}>
        {saved ? t('review.edit') : t('review.add')}
      </Button>
      {isEditing && <FullScreenReviewEditor bookId={bookId} title={title} saved={saved} onClose={close} />}
    </div>
  );
}

interface FullScreenReviewEditorProps {
  bookId: string;
  title: string;
  saved: string;
  onClose: () => void;
}

/** Full-screen dialog with the review; closing with unsaved changes asks first. */
function FullScreenReviewEditor({ bookId, title, saved, onClose }: FullScreenReviewEditorProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const fieldId = useId();
  const [draft, setDraft] = useState(saved);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const save = useSaveReview(bookId);
  const isDirty = hasReviewChanges(draft, saved);

  const requestClose = () => (isDirty ? setIsConfirmingDiscard(true) : onClose());

  useEffect(() => {
    document.getElementById(fieldId)?.focus();
    // The page behind must not scroll while the editor covers it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fieldId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          requestClose();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="secondary" onClick={requestClose} className="h-10">
          {t('books.cancel')}
        </Button>
        <h2 id={headingId} className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">
          {t('review.editorTitle', { title })}
        </h2>
        <Button
          disabled={!isDirty || isReviewTooLong(draft) || save.isPending}
          onClick={() => save.mutate(draft, { onSuccess: onClose })}
          className="h-10"
        >
          {save.isPending ? t('review.saving') : t('review.save')}
        </Button>
      </header>

      {isConfirmingDiscard && (
        <div role="alertdialog" aria-label={t('review.discardQuestion')} className="flex flex-col gap-2 border-b border-border bg-surface px-4 py-3">
          <p className="text-sm">{t('review.discardQuestion')}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsConfirmingDiscard(false)} className="h-10">
              {t('review.keepEditing')}
            </Button>
            <Button variant="danger" onClick={onClose} className="h-10">
              {t('review.discard')}
            </Button>
          </div>
        </div>
      )}
      {save.isError && (
        <p role="alert" className="px-4 pt-3 text-sm font-bold text-danger">
          {t('review.saveError')}
        </p>
      )}

      <ReviewField id={fieldId} label={t('review.title')} value={draft} onChange={setDraft} className="min-h-0 flex-1 p-4 [&_textarea]:resize-none" />
    </div>
  );
}
