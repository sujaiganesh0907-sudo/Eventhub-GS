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

export const THEME_OPTIONS: { id: ThemeMode; label: string; accentColor: string; bgPreview: string }[] = [
  { id: 'classic-blue', label: 'Classic Blue', accentColor: '#2563eb', bgPreview: '#f8fafc' },
  { id: 'light', label: 'Clean Light', accentColor: '#3b82f6', bgPreview: '#ffffff' },
  { id: 'dark', label: 'Charcoal Dark', accentColor: '#60a5fa', bgPreview: '#0f172a' },
  { id: 'midnight', label: 'Midnight Obsidian', accentColor: '#38bdf8', bgPreview: '#030712' },
  { id: 'ocean', label: 'Deep Ocean', accentColor: '#0ea5e9', bgPreview: '#082f49' },
  { id: 'emerald', label: 'Forest Emerald', accentColor: '#10b981', bgPreview: '#064e3b' },
  { id: 'violet', label: 'Royal Violet', accentColor: '#8b5cf6', bgPreview: '#2e1065' },
  { id: 'neutral', label: 'Minimal Neutral', accentColor: '#525252', bgPreview: '#f5f5f5' },
  { id: 'system', label: 'System Automatic', accentColor: '#64748b', bgPreview: '#cbd5e1' },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('eventhub_theme') as ThemeMode) || 'classic-blue';
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
      'theme-midnight',
      'theme-ocean',
      'theme-emerald',
      'theme-violet',
      'theme-neutral'
    );

    let effectiveDark = false;
    if (theme === 'system') {
      effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(effectiveDark ? 'theme-dark' : 'theme-light');
    } else {
      root.classList.add(`theme-${theme}`);
      effectiveDark = ['dark', 'midnight', 'ocean', 'emerald', 'violet'].includes(theme);
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
    setThemeState((prev) => (prev === 'dark' ? 'classic-blue' : 'dark'));
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
