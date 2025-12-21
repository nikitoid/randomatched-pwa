
import { useState, useEffect } from 'react';
import { ColorScheme } from '../types';
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

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme, colorScheme, setColorScheme };
};
