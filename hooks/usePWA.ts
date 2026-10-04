import { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = (addToast: (msg: string, type: 'success' | 'info' | 'error') => void) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Keep ref in sync
  useEffect(() => {
    registrationRef.current = registration;
  }, [registration]);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        setRegistration(r);
        registrationRef.current = r;
        console.log('SW Registered: ', r);

        // 1. If an updated worker is already waiting in background, notify immediately
        if (r.waiting) {
          console.log('SW already waiting on register');
          setNeedRefresh(true);
          setShowUpdateBanner(true);
        }

        // 2. Listen to native updatefound events to detect newly installed workers
        r.addEventListener('updatefound', () => {
          const newWorker = r.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker?.controller) {
                console.log('SW update found and installed');
                setNeedRefresh(true);
                setShowUpdateBanner(true);
              }
            });
          }
        });

        // 3. Immediate check on startup
        r.update().catch((e: any) => console.log('SW initial update check failed', e));

        // 4. Periodic auto-check every 30 minutes
        setInterval(() => {
          r.update().catch((e: any) => console.log('SW interval update failed', e));
        }, 30 * 60 * 1000); 
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
    onOfflineReady() {
      addToast("Приложение готово к работе оффлайн", "success");
    }
  });

  // Check existing SW registration on mount if onRegistered didn't fire yet
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        if (!registrationRef.current) {
          setRegistration(reg);
          registrationRef.current = reg;
        }
        if (reg.waiting) {
          console.log('SW waiting found via getRegistration()');
          setNeedRefresh(true);
          setShowUpdateBanner(true);
        }
        // Run update check
        reg.update().catch(() => {});
      }
    }).catch((e) => {
      console.log('SW getRegistration check failed', e);
    });
  }, [setNeedRefresh]);

  // Check for updates when user returns to the app from lockscreen / background tab
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        const currentReg = registrationRef.current;
        if (currentReg) {
          if (currentReg.waiting) {
            setNeedRefresh(true);
            setShowUpdateBanner(true);
          }
          currentReg.update().catch(() => {});
        } else {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) {
              setRegistration(reg);
              registrationRef.current = reg;
              if (reg.waiting) {
                setNeedRefresh(true);
                setShowUpdateBanner(true);
              }
              reg.update().catch(() => {});
            }
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [setNeedRefresh]);

  useEffect(() => {
    if (needRefresh) {
      setShowUpdateBanner(true);
    }
  }, [needRefresh]);

  // Check if app was just updated
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const hasUpdatedParam = urlParams.has('updated');
    const justUpdated = sessionStorage.getItem('randomatched_just_updated');

    if (hasUpdatedParam || justUpdated) {
      addToast('Приложение успешно обновлено до последней версии!', 'success');
      try {
        sessionStorage.removeItem('randomatched_just_updated');
      } catch (e) {
        console.error("Failed to remove update marker", e);
      }
      if (hasUpdatedParam) {
        urlParams.delete('updated');
        const newSearch = urlParams.toString();
        const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
        window.history.replaceState(window.history.state, '', newUrl);
      }
    }
  }, [addToast]);

  const handleUpdateApp = useCallback(async () => {
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      console.error("Scroll reset error", e);
    }
    
    setShowUpdateBanner(false);

    try {
      sessionStorage.setItem('randomatched_just_updated', 'true');
    } catch (e) {
      console.error("Failed to set update marker", e);
    }

    let reloaded = false;
    const executeReload = () => {
      if (reloaded) return;
      reloaded = true;
      window.scrollTo(0, 0);
      const updateUrl = window.location.origin + window.location.pathname + '?updated=' + Date.now();
      window.location.replace(updateUrl);
    };

    // When the new worker takes control, reload cleanly
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        executeReload();
      });
    }

    // Try finding the waiting worker from state or native registration
    let targetWorker = registration?.waiting;
    if (!targetWorker && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const nativeReg = await navigator.serviceWorker.getRegistration();
        targetWorker = nativeReg?.waiting;
      } catch (e) {
        console.error("Failed to query native registration", e);
      }
    }

    if (targetWorker) {
      targetWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    try {
      await updateServiceWorker(true);
    } catch (e) {
      console.log("updateServiceWorker execution", e);
    }

    // Fallback safety timeout in case controllerchange doesn't fire
    setTimeout(() => {
      executeReload();
    }, 800);
  }, [updateServiceWorker, registration]);

  const handleOpenUpdateBanner = useCallback(() => {
    setShowUpdateBanner(true);
  }, []);

  const checkForUpdate = useCallback(async () => {
    let reg = registrationRef.current || registration;
    if (!reg && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        reg = (await navigator.serviceWorker.getRegistration()) || null;
        if (reg) {
          setRegistration(reg);
          registrationRef.current = reg;
        }
      } catch (e) {
        console.error("Error checking navigator registration", e);
      }
    }

    if (!reg) {
      addToast("Сервис обновлений недоступен", "error");
      return;
    }
    
    setIsCheckingUpdate(true);
    try {
      // Immediate check if a waiting worker is already queued
      if (reg.waiting) {
        setNeedRefresh(true);
        setShowUpdateBanner(true);
        addToast("Доступно обновление приложения!", "info");
        setIsCheckingUpdate(false);
        return;
      }

      await reg.update();

      setTimeout(() => {
        const activeReg = registrationRef.current || reg;
        if (activeReg?.installing || activeReg?.waiting) {
          setNeedRefresh(true);
          setShowUpdateBanner(true);
          addToast("Доступно обновление приложения!", "info");
        } else {
          addToast("Установлена последняя версия", "info");
        }
        setIsCheckingUpdate(false);
      }, 1200);
      
    } catch (e) {
      console.error("Update check failed", e);
      addToast("Ошибка проверки обновлений", "error");
      setIsCheckingUpdate(false);
    }
  }, [registration, addToast, setNeedRefresh]);

  const isUpdateAvailable = Boolean(needRefresh || showUpdateBanner || registration?.waiting || registrationRef.current?.waiting);

  return {
    waitingWorker: registration?.waiting || null, 
    isUpdateAvailable,
    isCheckingUpdate,
    showUpdateBanner,
    setShowUpdateBanner,
    handleUpdateApp,
    handleOpenUpdateBanner,
    checkForUpdate
  };
};