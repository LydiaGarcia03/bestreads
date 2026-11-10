import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { CoverImageError, resizeCoverImage } from '../coverImage';
import type { LibraryBook } from '../library';
import { checkCoverFile } from '../personalCover';
import { useSavePersonalCover } from '../usePersonalCover';

type CoverError = 'notImage' | 'tooLarge' | 'unreadable' | 'tooBig' | 'saveFailed' | 'noImageInClipboard';

/** "Change cover (only you)": opens the cover dialog. */
export function ChangeCover({ book }: { book: LibraryBook }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setIsOpen(false);
    openButtonRef.current?.focus();
  };

  return (
    <div className="flex justify-center">
      <button
        ref={openButtonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="min-h-11 text-[13px] font-bold text-accent hover:underline lg:min-h-8"
      >
        {book.hasPersonalCover ? t('cover.change') : t('cover.add')}
      </button>
      {isOpen && <CoverDialog book={book} onClose={close} />}
    </div>
  );
}

/** The first image among pasted or dropped files and items, if any. */
function imageFrom(transfer: DataTransfer | null): File | null {
  if (!transfer) return null;
  const fromFiles = [...transfer.files].find((file) => file.type.startsWith('image/'));
  if (fromFiles) return fromFiles;
  const item = [...transfer.items].find((entry) => entry.kind === 'file' && entry.type.startsWith('image/'));
  return item?.getAsFile() ?? null;
}

/**
 * Dialog to set the cover: drop or paste an image, or choose a file; it is resized in the browser,
 * previewed, and saved privately on "Save cover". Also removes an existing personal cover.
 */
function CoverDialog({ book, onClose }: { book: LibraryBook; onClose: () => void }) {
  const { t } = useTranslation();
  const headingId = useId();
  const hintId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const save = useSavePersonalCover(book.id);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<CoverError | null>(null);
  const isBusy = isPreparing || save.isPending;

  const takeImage = async (file: File | null) => {
    setError(null);
    if (!file) {
      setError('noImageInClipboard');
      return;
    }
    const fileError = checkCoverFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    setIsPreparing(true);
    try {
      setPreview(await resizeCoverImage(file));
    } catch (resizeError) {
      setError(resizeError instanceof CoverImageError ? resizeError.reason : 'unreadable');
    } finally {
      setIsPreparing(false);
    }
  };

  const saveCover = (dataUrl: string | null) =>
    save.mutate(dataUrl, { onSuccess: onClose, onError: () => setError('saveFailed') });

  useEffect(() => {
    dialogRef.current?.focus();
    // Ctrl+V / Cmd+V anywhere while the dialog is open uses the copied image.
    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      void takeImage(imageFrom(event.clipboardData));
    };
    document.addEventListener('paste', onPaste);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('paste', onPaste);
      document.body.style.overflow = previousOverflow;
    };
    // Set up once per opening; `takeImage` only uses setters and stable values.
  }, []);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void takeImage(imageFrom(event.dataTransfer));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={hintId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
        className="flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl outline-none sm:max-w-md sm:rounded-lg sm:pb-5"
      >
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="text-lg font-bold">
            {t('cover.dialogTitle')}
          </h2>
          <p id={hintId} className="text-sm text-fg-muted">
            {t('cover.privacy')}
          </p>
        </div>

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <img src={preview} alt={t('cover.previewAlt')} className="aspect-[2/3] w-40 rounded-sm border border-border object-cover" />
            <button type="button" onClick={() => setPreview(null)} className="min-h-11 text-sm text-fg-muted hover:text-fg hover:underline">
              {t('cover.pickAnother')}
            </button>
          </div>
        ) : (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center gap-3 rounded-md border-2 border-dashed px-4 py-8 text-center ${
              isDragging ? 'border-accent bg-surface-muted' : 'border-border-strong'
            }`}
          >
            <p className="text-sm font-bold">{isPreparing ? t('cover.preparing') : t('cover.dropHere')}</p>
            <p className="text-xs text-fg-muted">{t('cover.pasteHint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label={t('cover.chooseFile')}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                // Cleared so choosing the same file again still fires a change.
                event.target.value = '';
                if (file) void takeImage(file);
              }}
              className="sr-only"
            />
            <Button variant="secondary" disabled={isBusy} onClick={() => fileInputRef.current?.click()}>
              {t('cover.chooseFile')}
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {t(`cover.errors.${error}`)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!preview || isBusy} onClick={() => preview && saveCover(preview)}>
            {save.isPending ? t('cover.saving') : t('cover.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('books.cancel')}
          </Button>
          {book.hasPersonalCover && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => saveCover(null)}
              className="ml-auto min-h-11 text-sm text-fg-muted hover:text-danger hover:underline disabled:opacity-60"
            >
              {t('cover.remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
