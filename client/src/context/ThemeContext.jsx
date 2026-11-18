import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'campusmate_theme';
const ThemeContext = createContext(null);

function applyTheme() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.style.colorScheme = 'dark';
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', '#161616');
}

export function ThemeProvider({ children }) {
  // Always locked to dark mode
  const theme = 'dark';

  useEffect(() => {
    applyTheme();
    try {
      window.localStorage.setItem(THEME_KEY, 'dark');
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, []);

  const setThemeExplicit = useCallback(() => {}, []);
  const toggleTheme = useCallback(() => {}, []);

  const value = useMemo(
    () => ({ theme: 'dark', isDark: true, setTheme: setThemeExplicit, toggleTheme }),
    [setThemeExplicit, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export default ThemeContext;
