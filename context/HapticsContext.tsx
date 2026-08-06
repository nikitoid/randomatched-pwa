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
  forceAudioMode: boolean;
  toggle: () => void;
  toggleForceAudioMode: () => void;
  setForceAudioMode: (val: boolean) => void;
  trigger: (type?: HapticFeedbackType) => void;
}

const STORAGE_KEY_HAPTICS = 'randomatched_haptics_enabled_v1';
const STORAGE_KEY_FORCE_AUDIO_HAPTICS = 'randomatched_haptics_force_audio_v1';

// Web Audio API Haptic Engine Singleton (for iOS Safari where navigator.vibrate is undefined)
let audioCtxInstance: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtxInstance) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtxInstance = new AudioCtx();
    }
  }
  return audioCtxInstance;
};

// Global listener to unlock AudioContext on first touch/user gesture (iOS Autoplay policy)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
}

// Plays a low-frequency micro-pulse with rapid exponential decay to simulate a tactile click
const playMicroPulse = (
  ctx: AudioContext,
  freq: number,
  durationMs: number,
  gainValue: number,
  delayMs: number = 0
) => {
  try {
    const startTime = ctx.currentTime + delayMs / 1000;
    const durationSec = durationMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 'triangle' waveform provides rich harmonics suitable for tiny smartphone speakers
    osc.type = 'triangle';
    
    // Fast pitch sweep attack (pitch drop) to produce a crisp mechanical click sound on mobile speakers
    const startFreq = Math.min(freq * 2.8, 650);
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + Math.min(0.004, durationSec * 0.4));

    gain.gain.setValueAtTime(gainValue, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.01);
  } catch (e) {
    // Ignore audio synthesis errors
  }
};

const triggerWebAudioHaptic = (type: HapticFeedbackType = 'light') => {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  if (typeof type === 'number') {
    const freq = type < 15 ? 150 : type < 25 ? 130 : 110;
    playMicroPulse(ctx, freq, type, 0.5);
    return;
  }

  if (Array.isArray(type)) {
    let currentDelay = 0;
    type.forEach((dur, index) => {
      if (index % 2 === 0 && dur > 0) {
        playMicroPulse(ctx, 130, dur, 0.45, currentDelay);
      }
      currentDelay += dur;
    });
    return;
  }

  switch (type) {
    case 'light':
      playMicroPulse(ctx, 150, 10, 0.45);
      break;
    case 'medium':
      playMicroPulse(ctx, 130, 14, 0.6);
      break;
    case 'heavy':
      playMicroPulse(ctx, 100, 20, 0.75);
      break;
    case 'success':
      playMicroPulse(ctx, 160, 12, 0.5, 0);
      playMicroPulse(ctx, 160, 12, 0.5, 45);
      break;
    case 'warning':
      playMicroPulse(ctx, 95, 14, 0.6, 0);
      playMicroPulse(ctx, 95, 14, 0.6, 50);
      playMicroPulse(ctx, 95, 14, 0.6, 100);
      break;
    default:
      playMicroPulse(ctx, 150, 10, 0.45);
  }
};

const executeHapticTrigger = (
  type: HapticFeedbackType = 'light',
  isEnabled: boolean,
  forceAudioMode: boolean = false
) => {
  if (!isEnabled || typeof window === 'undefined') return;

  // Force Web Audio micro-clicks mode (for testing on Android / Desktop)
  if (forceAudioMode) {
    triggerWebAudioHaptic(type);
    return;
  }

  // 1. Try native Web Vibration API (Android / Supported devices)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
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
      const result = navigator.vibrate(pattern);
      if (result) return;
    } catch (e) {
      // Fallback to Web Audio synthesis if vibrate throws error
    }
  }

  // 2. Web Audio API Haptics Fallback (iOS Safari / Devices without navigator.vibrate)
  triggerWebAudioHaptic(type);
};

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export const HapticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_KEY_HAPTICS);
    return saved !== null ? saved === 'true' : true;
  });

  const [forceAudioMode, setForceAudioMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const searchHasForce = window.location.search.includes('forceAudioHaptics=true') || window.location.search.includes('audioHaptics=1');
    const saved = localStorage.getItem(STORAGE_KEY_FORCE_AUDIO_HAPTICS);
    return searchHasForce || (saved !== null ? saved === 'true' : false);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HAPTICS, String(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FORCE_AUDIO_HAPTICS, String(forceAudioMode));
  }, [forceAudioMode]);

  const trigger = useCallback(
    (type: HapticFeedbackType = 'light') => {
      executeHapticTrigger(type, isEnabled, forceAudioMode);
    },
    [isEnabled, forceAudioMode]
  );

  const toggle = useCallback(() => {
    setIsEnabled(prev => {
      const next = !prev;
      if (next) {
        executeHapticTrigger('medium', true, forceAudioMode);
      }
      return next;
    });
  }, [forceAudioMode]);

  const toggleForceAudioMode = useCallback(() => {
    setForceAudioMode(prev => {
      const next = !prev;
      if (next) {
        executeHapticTrigger('medium', true, true);
      }
      return next;
    });
  }, []);

  return (
    <HapticsContext.Provider
      value={{ isEnabled, forceAudioMode, toggle, toggleForceAudioMode, setForceAudioMode, trigger }}
    >
      {children}
    </HapticsContext.Provider>
  );
};

export const useHaptics = (): HapticsContextType => {
  const context = useContext(HapticsContext);
  if (!context) {
    const savedEnabled = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_HAPTICS) : null;
    const savedForce = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_FORCE_AUDIO_HAPTICS) : null;
    const isEnabled = savedEnabled !== null ? savedEnabled === 'true' : true;
    const forceAudioMode = savedForce !== null ? savedForce === 'true' : false;

    const trigger = (type: HapticFeedbackType = 'light') => {
      executeHapticTrigger(type, isEnabled, forceAudioMode);
    };

    return {
      isEnabled,
      forceAudioMode,
      toggle: () => {},
      toggleForceAudioMode: () => {},
      setForceAudioMode: () => {},
      trigger
    };
  }
  return context;
};
