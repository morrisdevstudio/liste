import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyThemeClass,
  isThemePreference,
  readStoredTheme,
  writeStoredTheme,
  type ThemePreference,
} from './theme';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, persist = true }: { children: ReactNode; persist?: boolean }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredTheme);

  useEffect(() => {
    applyThemeClass(preference);
  }, [preference]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (readStoredTheme() === 'auto') applyThemeClass('auto');
    };
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onThemeChanged) return undefined;
    return window.electronAPI.onThemeChanged((next) => {
      if (!isThemePreference(next)) return;
      setPreferenceState(next);
      writeStoredTheme(next);
      applyThemeClass(next);
    });
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return undefined;
    let cancelled = false;
    void window.electronAPI.loadConfig().then((config) => {
      if (cancelled) return;
      const next = isThemePreference(config?.theme) ? config.theme : readStoredTheme();
      setPreferenceState(next);
      writeStoredTheme(next);
      applyThemeClass(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    writeStoredTheme(next);
    applyThemeClass(next);
    if (persist && window.electronAPI) {
      await window.electronAPI.saveConfig({ theme: next });
    }
  }, [persist]);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
