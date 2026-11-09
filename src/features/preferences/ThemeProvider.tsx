import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeContext';
import {
  applyTheme,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  subscribeToSystemTheme,
  systemPrefersDark,
  type ThemePreference,
} from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(loadThemePreference);
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => subscribeToSystemTheme(setPrefersDark), []);

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    saveThemePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved: resolveTheme(preference, prefersDark), setPreference }),
    [preference, prefersDark, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
