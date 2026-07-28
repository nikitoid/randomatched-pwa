import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  const { trigger } = useHaptics();

  return (
    <button
      onClick={() => {
        trigger('light');
        toggleTheme();
      }}
      className="p-3 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-yellow-400 shadow-lg transition-transform active:scale-95 border border-slate-200 dark:border-slate-700"
      aria-label="Переключить тему"
      data-testid="theme-toggle"
    >
      {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
    </button>
  );
};