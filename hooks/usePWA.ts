
import { useState, useEffect, useCallback } from 'react';
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = (addToast: (msg: string, type: 'success' | 'info') => void) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isManualUpdateCheck, setIsManualUpdateCheck] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration) {
      if (r) {
        setSwRegistration(r);
        console.log('SW Registered');
      }
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
    onOfflineReady() {
        // Show toast only if no controller is active (meaning this is the first install/cache)
        if (!navigator.serviceWorker.controller) {
            addToast("Приложение готово к работе оффлайн", "success");
        }
    }
  });

  // Check for successful update after reload
  useEffect(() => {
      const wasUpdated = localStorage.getItem('randomatched_update_complete');
      if (wasUpdated === 'true') {
          addToast("Обновление успешно установлено", "success");
          localStorage.removeItem('randomatched_update_complete');
      }
  }, [addToast]);

  // Handle detected update
  useEffect(() => {
    if (needRefresh) {
        if (isManualUpdateCheck) {
            // If update found during manual check: Install immediately and reload
            localStorage.setItem('randomatched_update_complete', 'true');
            updateServiceWorker(true);
        } else {
            // If found automatically (not requested by user right now), show banner
            setShowUpdateBanner(true);
            setIsCheckingUpdate(false);
        }
    }
  }, [needRefresh, isManualUpdateCheck, updateServiceWorker]);

  const handleUpdateApp = useCallback(() => {
    localStorage.setItem('randomatched_update_complete', 'true');
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
          setIsManualUpdateCheck(true); // Flag that this is a user-initiated check
          
          try {
              await swRegistration.update();
              
              // Give a small buffer for the 'needRefresh' state to trigger if update is found
              setTimeout(() => {
                  if (!needRefresh) {
                      // Only show this if NO update was triggered
                      addToast("У вас установлена последняя версия", "info");
                      setIsCheckingUpdate(false);
                      setIsManualUpdateCheck(false);
                  }
                  // If needRefresh becomes true, the useEffect above handles the rest
              }, 1000);

          } catch (e) {
              console.error("Manual update check failed", e);
              setIsCheckingUpdate(false);
              setIsManualUpdateCheck(false);
              addToast("Ошибка проверки обновления", "info");
          }
      } else {
          setIsCheckingUpdate(true);
          setTimeout(() => {
              setIsCheckingUpdate(false);
              addToast("Service Worker не активен (Dev режим?)", "info");
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
