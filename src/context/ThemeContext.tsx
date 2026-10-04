import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';
export type { ThemeMode };

interface ThemeContextType {
  theme: ThemeMode;
  currentTheme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_OPTIONS: { id: ThemeMode; label: string; accentColor: string; bgPreview: string; desc: string }[] = [
  { id: 'classic-blue', label: 'Classic Blue', accentColor: '#2563eb', bgPreview: '#f8fafc', desc: 'Clean academic light theme with cobalt highlights' },
  { id: 'neutral-slate', label: 'Neutral Slate', accentColor: '#3b82f6', bgPreview: '#0f172a', desc: 'Minimal high-contrast slate dark theme' },
  { id: 'system', label: 'System Default', accentColor: '#64748b', bgPreview: '#cbd5e1', desc: 'Automatically matches your device display preference' },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('eventhub_theme') as ThemeMode;
    if (saved === 'dark' || saved === 'neutral-slate') return 'neutral-slate';
    if (saved === 'light' || saved === 'classic-blue') return 'classic-blue';
    if (saved === 'system') return 'system';
    return 'classic-blue';
  });

  const [resolvedDark, setResolvedDark] = useState(false);

  useEffect(() => {
    localStorage.setItem('eventhub_theme', theme);
    const root = document.documentElement;

    // Remove all previous theme classes
    root.classList.remove(
      'theme-light',
      'theme-dark',
      'theme-classic-blue',
      'theme-neutral-slate',
      'theme-midnight',
      'theme-ocean',
      'theme-emerald',
      'theme-violet',
      'theme-neutral'
    );

    let effectiveDark = false;
    if (theme === 'system') {
      effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(effectiveDark ? 'theme-dark' : 'theme-classic-blue');
    } else if (theme === 'neutral-slate' || theme === 'dark') {
      root.classList.add('theme-neutral-slate');
      effectiveDark = true;
    } else {
      root.classList.add('theme-classic-blue');
      effectiveDark = false;
    }

    if (effectiveDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    setResolvedDark(effectiveDark);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleDarkMode = () => {
    setThemeState((prev) => (prev === 'neutral-slate' || prev === 'dark' ? 'classic-blue' : 'neutral-slate'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme: theme,
        setTheme,
        isDark: resolvedDark,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
