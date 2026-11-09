import { useEffect, useRef } from 'react';

/** True when the event target accepts text input, so single-key shortcuts must not fire. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/**
 * Calls `handler` when `key` is pressed without modifiers, outside editable fields.
 * The latest handler is always used without re-subscribing the listener.
 */
export function useHotkey(key: string, handler: (event: KeyboardEvent) => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      handlerRef.current(event);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [key]);
}
