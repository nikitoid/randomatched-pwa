import React, { createContext, useContext, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';

export type ThemeContextType = ReturnType<typeof useTheme>;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    theme,
    toggleTheme,
    colorScheme,
    setColorScheme,
    roundness,
    setRoundness,
    bgPattern,
    setBgPattern,
    bgGradient,
    setBgGradient,
  } = useTheme();

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      toggleTheme,
      colorScheme,
      setColorScheme,
      roundness,
      setRoundness,
      bgPattern,
      setBgPattern,
      bgGradient,
      setBgGradient,
    }),
    [theme, toggleTheme, colorScheme, roundness, bgPattern, bgGradient]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
