import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  let matches = initial;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the media query', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it('uses the fallback without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useMediaQuery('(x)', false)).result.current).toBe(false);
    expect(renderHook(() => useMediaQuery('(x)')).result.current).toBe(true);
  });
});
