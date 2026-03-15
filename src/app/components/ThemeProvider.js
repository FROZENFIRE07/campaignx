'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved) {
  const html = document.documentElement;
  html.setAttribute('data-theme', resolved);
  html.className = resolved;
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [mounted, setMounted] = useState(false);

  // On mount, read from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('campaignx-theme') || 'dark';
    setThemeState(stored);
    const resolved = stored === 'auto' ? getSystemTheme() : stored;
    applyTheme(resolved);
    setMounted(true);
  }, []);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'auto') {
        applyTheme(getSystemTheme());
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, mounted]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('campaignx-theme', newTheme);
    const resolved = newTheme === 'auto' ? getSystemTheme() : newTheme;
    applyTheme(resolved);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
