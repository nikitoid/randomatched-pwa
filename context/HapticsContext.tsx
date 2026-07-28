import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type HapticFeedbackType =
  | 'light'    // 8ms - soft tap for tabs, selectors, items, checkboxes
  | 'medium'   // 15ms - standard tap for opening modals, toggles, selections
  | 'heavy'    // 25ms - prominent tap for main actions (generate, reset)
  | 'success'  // [15, 30, 15]ms - double light vibration for saving/completing
  | 'warning'  // [30, 50, 30]ms - triple vibration for deletions/errors
  | number
  | number[];

interface HapticsContextType {
  isEnabled: boolean;
  toggle: () => void;
  trigger: (type?: HapticFeedbackType) => void;
}

const STORAGE_KEY_HAPTICS = 'randomatched_haptics_enabled_v1';

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export const HapticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_KEY_HAPTICS);
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HAPTICS, String(isEnabled));
  }, [isEnabled]);

  const trigger = useCallback((type: HapticFeedbackType = 'light') => {
    if (!isEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;

    let pattern: number | number[];
    if (typeof type === 'number' || Array.isArray(type)) {
      pattern = type;
    } else {
      switch (type) {
        case 'light':
          pattern = 8;
          break;
        case 'medium':
          pattern = 15;
          break;
        case 'heavy':
          pattern = 25;
          break;
        case 'success':
          pattern = [15, 30, 15];
          break;
        case 'warning':
          pattern = [30, 50, 30];
          break;
        default:
          pattern = 8;
      }
    }

    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore errors on non-supported platforms
    }
  }, [isEnabled]);

  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      const next = !prev;
      if (next && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(20);
        } catch (e) {}
      }
      return next;
    });
  }, []);

  return (
    <HapticsContext.Provider value={{ isEnabled, toggle, trigger }}>
      {children}
    </HapticsContext.Provider>
  );
};

export const useHaptics = (): HapticsContextType => {
  const context = useContext(HapticsContext);
  if (!context) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_HAPTICS) : null;
    const isEnabled = saved !== null ? saved === 'true' : true;

    const trigger = (type: HapticFeedbackType = 'light') => {
      if (!isEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
      let pattern: number | number[];
      if (typeof type === 'number' || Array.isArray(type)) {
        pattern = type;
      } else {
        switch (type) {
          case 'light': pattern = 8; break;
          case 'medium': pattern = 15; break;
          case 'heavy': pattern = 25; break;
          case 'success': pattern = [15, 30, 15]; break;
          case 'warning': pattern = [30, 50, 30]; break;
          default: pattern = 8;
        }
      }
      try { navigator.vibrate(pattern); } catch (e) {}
    };

    return { isEnabled, toggle: () => {}, trigger };
  }
  return context;
};
