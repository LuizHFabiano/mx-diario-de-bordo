import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mx-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
}

function getStoredTheme() {
  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === DARK_THEME || savedTheme === LIGHT_THEME) return savedTheme;
  } catch {}

  return null;
}

function getInitialTheme() {
  const appliedTheme = document.documentElement.dataset.theme;
  if (appliedTheme === DARK_THEME || appliedTheme === LIGHT_THEME) return appliedTheme;

  const storedTheme = getStoredTheme();
  if (storedTheme) return storedTheme;

  return getSystemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);
  const hasUserPreference = useRef(Boolean(getStoredTheme()));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    if (hasUserPreference.current || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => setTheme(event.matches ? DARK_THEME : LIGHT_THEME);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    hasUserPreference.current = true;
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {}
      return nextTheme;
    });
  };

  return { theme, toggleTheme };
}
