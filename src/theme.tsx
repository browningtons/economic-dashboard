import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDom(mode: ThemeMode) {
  // Use a single attribute so CSS can react instantly.
  document.documentElement.setAttribute('data-theme', mode);
}

function getInitialMode(): ThemeMode {
  // 1) saved preference
  const saved = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
  if (saved === 'light' || saved === 'dark') return saved;

  // 2) default to light mode for first-time visitors
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialMode());

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem('theme', next);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  };

  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    applyThemeToDom(mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
