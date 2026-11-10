import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

function menuItemsIn(container: HTMLElement | null): HTMLElement[] {
  return [...(container?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
}

/**
 * Behavior of a menu button (WAI-ARIA menu pattern): opening focuses the checked item (or the first);
 * arrow keys, Home and End move between items; Escape closes and returns focus to the button;
 * Tab or a pointer outside closes it. Rendering stays with the component.
 */
export function useMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const items = menuItemsIn(containerRef.current);
    (items.find((item) => item.getAttribute('aria-checked') === 'true') ?? items[0])?.focus();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  const closeAndFocusButton = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const items = menuItemsIn(containerRef.current);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus();
    if (event.key === 'Escape') closeAndFocusButton();
    else if (event.key === 'ArrowDown') focusAt(index + 1);
    else if (event.key === 'ArrowUp') focusAt(index - 1);
    else if (event.key === 'Home') focusAt(0);
    else if (event.key === 'End') focusAt(items.length - 1);
    else if (event.key === 'Tab') setIsOpen(false);
    else return;
    if (event.key !== 'Tab') event.preventDefault();
  };

  /** Closes the menu, gives focus back to the button, then runs the chosen item's action. */
  const choose = (action: () => void) => {
    closeAndFocusButton();
    action();
  };

  return {
    isOpen,
    containerRef,
    choose,
    buttonProps: {
      ref: buttonRef,
      type: 'button' as const,
      'aria-haspopup': 'menu' as const,
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? menuId : undefined,
      onClick: () => setIsOpen((open) => !open),
    },
    menuProps: { id: menuId, role: 'menu' as const, onKeyDown: handleMenuKeyDown },
  };
}
