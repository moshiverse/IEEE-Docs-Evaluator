import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ieee-docs-theme-mode';

function getSystemTheme() {
  return 'light';
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'light';
  });

  const resolvedTheme = useMemo(() => {
    return themeMode === 'system' ? getSystemTheme() : themeMode;
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (themeMode === 'system') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [themeMode]);

  return { themeMode, setThemeMode, resolvedTheme };
}
