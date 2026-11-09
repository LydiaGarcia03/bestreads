import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { STORAGE_KEYS } from './storage';
import { useTheme } from './ThemeContext';

type ChangeListener = (event: MediaQueryListEvent) => void;

/** Controllable `matchMedia` stub so tests can flip the OS dark-mode setting. */
function mockSystemTheme(initiallyDark: boolean) {
  let matches = initiallyDark;
  const listeners = new Set<ChangeListener>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
    })),
  );
  return {
    setDark(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
    },
  };
}

function ThemeProbe() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <div>
      <p>preference: {preference}</p>
      <p>resolved: {resolved}</p>
      <button type="button" onClick={() => setPreference('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setPreference('system')}>
        System
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the system setting by default and reacts to OS changes', () => {
    const system = mockSystemTheme(false);
    renderWithProviders(<ThemeProbe />);

    expect(screen.getByText('preference: system')).toBeInTheDocument();
    expect(screen.getByText('resolved: light')).toBeInTheDocument();

    act(() => system.setDark(true));
    expect(screen.getByText('resolved: dark')).toBeInTheDocument();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('applies and persists a manual theme, then returns to system', async () => {
    mockSystemTheme(false);
    const user = userEvent.setup();
    renderWithProviders(<ThemeProbe />);

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(screen.getByText('resolved: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(screen.getByText('resolved: light')).toBeInTheDocument();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('restores a stored preference on load', () => {
    mockSystemTheme(false);
    window.localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    renderWithProviders(<ThemeProbe />);

    expect(screen.getByText('preference: dark')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
