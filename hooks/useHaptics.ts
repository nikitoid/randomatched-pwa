
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY_HAPTICS = 'randomatched_haptics_enabled_v1';

export const useHaptics = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HAPTICS);
    return saved !== null ? saved === 'true' : true; // Default to true
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HAPTICS, String(isEnabled));
  }, [isEnabled]);

  const trigger = useCallback((pattern: number | number[] = 10) => {
    if (!isEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore errors on devices that don't support it or if context is blocked
    }
  }, [isEnabled]);

  const toggle = () => {
    setIsEnabled(prev => !prev);
    if (!isEnabled) {
        // Vibrate immediately to signal it's on
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    }
  };

  return { isEnabled, toggle, trigger };
};
