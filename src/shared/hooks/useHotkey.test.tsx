import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isEditableTarget, useHotkey } from './useHotkey';

function HotkeyProbe({ onHotkey }: { onHotkey: () => void }) {
  useHotkey('/', onHotkey);
  return (
    <div>
      <input aria-label="Field" />
      <textarea aria-label="Notes" />
      <button type="button">Button</button>
    </div>
  );
}

describe('isEditableTarget', () => {
  it('detects text fields and contenteditable', () => {
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    // jsdom does not implement isContentEditable.
    Object.defineProperty(editable, 'isContentEditable', { value: true });

    expect(isEditableTarget(document.createElement('input'))).toBe(true);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('select'))).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(document.createElement('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('useHotkey', () => {
  it('fires on the key outside editable fields', async () => {
    const user = userEvent.setup();
    const onHotkey = vi.fn();
    render(<HotkeyProbe onHotkey={onHotkey} />);

    await user.keyboard('/');
    expect(onHotkey).toHaveBeenCalledTimes(1);

    screen.getByRole('button', { name: 'Button' }).focus();
    await user.keyboard('/');
    expect(onHotkey).toHaveBeenCalledTimes(2);
  });

  it('ignores the key while typing and with modifiers', async () => {
    const user = userEvent.setup();
    const onHotkey = vi.fn();
    render(<HotkeyProbe onHotkey={onHotkey} />);

    await user.click(screen.getByRole('textbox', { name: 'Field' }));
    await user.keyboard('/');
    await user.click(screen.getByRole('textbox', { name: 'Notes' }));
    await user.keyboard('/');
    screen.getByRole('button', { name: 'Button' }).focus();
    await user.keyboard('{Control>}/{/Control}');

    expect(onHotkey).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', async () => {
    const user = userEvent.setup();
    const onHotkey = vi.fn();
    const { unmount } = render(<HotkeyProbe onHotkey={onHotkey} />);

    unmount();
    await user.keyboard('/');
    expect(onHotkey).not.toHaveBeenCalled();
  });
});
