
import { useState, useEffect, useCallback } from 'react';
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = (addToast: (msg: string, type: 'success' | 'info') => void) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration) {
      if (r) {
        setSwRegistration(r);
        // Initial check simulation/trigger
        setIsCheckingUpdate(true);
        
        // Force an update check immediately on load
        r.update().then(() => {
            console.log('Initial SW update check completed');
        }).finally(() => {
            setTimeout(() => setIsCheckingUpdate(false), 800);
        });

        // Periodic check
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); 
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
    onOfflineReady() {
        addToast("Приложение готово к работе оффлайн", "success");
    }
  });

  useEffect(() => {
    if (needRefresh) {
        setShowUpdateBanner(true);
        setIsCheckingUpdate(false);
    }
  }, [needRefresh]);

  const handleUpdateApp = useCallback(() => {
    updateServiceWorker(true);
    setShowUpdateBanner(false);
  }, [updateServiceWorker]);

  const handleOpenUpdateBanner = useCallback(() => {
      if (needRefresh) {
          setShowUpdateBanner(true);
      }
  }, [needRefresh]);

  // Manual check function exposed to UI
  const checkUpdate = useCallback(async () => {
      if (swRegistration) {
          setIsCheckingUpdate(true);
          try {
              await swRegistration.update();
              // If no update found, just stop spinning. 
              // If update found, needRefresh effect will trigger.
              setTimeout(() => {
                  if (!needRefresh) {
                      addToast("У вас установлена последняя версия", "info");
                  }
                  setIsCheckingUpdate(false);
              }, 1000);
          } catch (e) {
              console.error("Manual update check failed", e);
              setIsCheckingUpdate(false);
          }
      } else {
          // Fallback if SW not supported or ready
          setIsCheckingUpdate(true);
          setTimeout(() => {
              setIsCheckingUpdate(false);
              addToast("Service Worker не активен", "info");
          }, 1000);
      }
  }, [swRegistration, needRefresh, addToast]);

  return {
      isUpdateAvailable: needRefresh,
      isCheckingUpdate,
      showUpdateBanner,
      setShowUpdateBanner,
      handleUpdateApp,
      handleOpenUpdateBanner,
      checkUpdate
  };
};
