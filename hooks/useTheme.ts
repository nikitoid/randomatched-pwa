
import { useState, useLayoutEffect, useCallback } from 'react';
import { ColorScheme, ThemeRoundness } from '../types';
import { COLOR_SCHEMES_DATA } from '../constants';
import { STORAGE_KEYS, getStorageItem, setStorageItem, setStorageJSON } from '../utils/storage';

export const useTheme = () => {
  // Lazy initialization for theme to prevent flash and handle defaults correctly
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    
    const savedTheme = getStorageItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  // Lazy initialization for colorScheme with 'emerald' as default
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    if (typeof window === 'undefined') return 'emerald';
    
    const savedScheme = getStorageItem(STORAGE_KEYS.COLOR_SCHEME) as ColorScheme | null;
    if (savedScheme && COLOR_SCHEMES_DATA[savedScheme]) {
      return savedScheme;
    }
    
    return 'emerald';
  });

  // Personalization settings
  const [roundness, setRoundness] = useState<ThemeRoundness>(() => {
    if (typeof window === 'undefined') return 'medium';
    return (getStorageItem(STORAGE_KEYS.THEME_ROUNDNESS) as ThemeRoundness) || 'medium';
  });

  const [bgPattern, setBgPattern] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = getStorageItem(STORAGE_KEYS.THEME_BG_PATTERN);
    return saved !== null ? saved === 'true' : false;
  });

  const [bgGradient, setBgGradient] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = getStorageItem(STORAGE_KEYS.THEME_BG_GRADIENT);
    return saved !== null ? saved === 'true' : false;
  });

  useLayoutEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to local storage
    setStorageItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useLayoutEffect(() => {
    // Apply CSS variables for the selected color scheme
    const schemeData = COLOR_SCHEMES_DATA[colorScheme];
    if (!schemeData) return;
    
    const root = document.documentElement;
    const vars: Record<string, string> = {};
    
    // Set Primary Colors
    Object.entries(schemeData.primary).forEach(([shade, value]) => {
      const propName = `--primary-${shade}`;
      const valStr = value as string;
      root.style.setProperty(propName, valStr);
      vars[propName] = valStr;
    });

    // Set Secondary Colors
    Object.entries(schemeData.secondary).forEach(([shade, value]) => {
      const propName = `--secondary-${shade}`;
      const valStr = value as string;
      root.style.setProperty(propName, valStr);
      vars[propName] = valStr;
    });

    // Also update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', `rgb(${schemeData.primary[600]})`);
    }

    setStorageItem(STORAGE_KEYS.COLOR_SCHEME, colorScheme);
    setStorageJSON(STORAGE_KEYS.THEME_VARIABLES, vars);
  }, [colorScheme]);

  // Effects for new settings
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-roundness', roundness);
    setStorageItem(STORAGE_KEYS.THEME_ROUNDNESS, roundness);
  }, [roundness]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bg-pattern', String(bgPattern));
    setStorageItem(STORAGE_KEYS.THEME_BG_PATTERN, String(bgPattern));
  }, [bgPattern]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bg-gradient', String(bgGradient));
    setStorageItem(STORAGE_KEYS.THEME_BG_GRADIENT, String(bgGradient));
  }, [bgGradient]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return {
    theme,
    toggleTheme,
    colorScheme,
    setColorScheme,
    roundness,
    setRoundness,
    bgPattern,
    setBgPattern,
    bgGradient,
    setBgGradient
  };
};
