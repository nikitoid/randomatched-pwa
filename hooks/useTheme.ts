
import { useState, useEffect } from 'react';
import { ColorScheme, ThemeRoundness } from '../types';
import { COLOR_SCHEMES_DATA } from '../constants';

export const useTheme = () => {
  // Lazy initialization for theme to prevent flash and handle defaults correctly
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  // Lazy initialization for colorScheme with 'emerald' as default
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    if (typeof window === 'undefined') return 'emerald';
    
    const savedScheme = localStorage.getItem('colorScheme') as ColorScheme | null;
    if (savedScheme && COLOR_SCHEMES_DATA[savedScheme]) {
      return savedScheme;
    }
    
    return 'emerald';
  });

  // Personalization settings
  const [roundness, setRoundness] = useState<ThemeRoundness>(() => {
    if (typeof window === 'undefined') return 'medium';
    return (localStorage.getItem('themeRoundness') as ThemeRoundness) || 'medium';
  });

  const [bgPattern, setBgPattern] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('themeBgPattern');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    // Apply theme class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save to local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply CSS variables for the selected color scheme
    const schemeData = COLOR_SCHEMES_DATA[colorScheme];
    if (!schemeData) return;
    
    const root = document.documentElement;
    
    // Set Primary Colors
    Object.entries(schemeData.primary).forEach(([shade, value]) => {
      root.style.setProperty(`--primary-${shade}`, value as string);
    });

    // Set Secondary Colors
    Object.entries(schemeData.secondary).forEach(([shade, value]) => {
      root.style.setProperty(`--secondary-${shade}`, value as string);
    });

    // Also update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', `rgb(${schemeData.primary[600]})`);
    }

    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  // Effects for new settings
  useEffect(() => {
    document.documentElement.setAttribute('data-roundness', roundness);
    localStorage.setItem('themeRoundness', roundness);
  }, [roundness]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bg-pattern', String(bgPattern));
    localStorage.setItem('themeBgPattern', String(bgPattern));
  }, [bgPattern]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return {
    theme,
    toggleTheme,
    colorScheme,
    setColorScheme,
    roundness,
    setRoundness,
    bgPattern,
    setBgPattern
  };
};
