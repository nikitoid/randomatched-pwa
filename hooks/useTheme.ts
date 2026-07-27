
import { useState, useLayoutEffect } from 'react';
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

  const [bgGradient, setBgGradient] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('themeBgGradient');
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
    localStorage.setItem('theme', theme);
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

    localStorage.setItem('colorScheme', colorScheme);
    localStorage.setItem('themeVariables', JSON.stringify(vars));
  }, [colorScheme]);

  // Effects for new settings
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-roundness', roundness);
    localStorage.setItem('themeRoundness', roundness);
  }, [roundness]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bg-pattern', String(bgPattern));
    localStorage.setItem('themeBgPattern', String(bgPattern));
  }, [bgPattern]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bg-gradient', String(bgGradient));
    localStorage.setItem('themeBgGradient', String(bgGradient));
  }, [bgGradient]);

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
    setBgPattern,
    bgGradient,
    setBgGradient
  };
};
