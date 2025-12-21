
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
        console.log('SW Registered');
        // Automatic update checks disabled per user request.
        // Updates will only be checked when manually triggered via Settings -> Info.
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
              // If no update found, just stop spinning after a delay. 
              // If update found, needRefresh effect will trigger automatically.
              setTimeout(() => {
                  if (!needRefresh) {
                      addToast("У вас установлена последняя версия", "info");
                  }
                  setIsCheckingUpdate(false);
              }, 1000);
          } catch (e) {
              console.error("Manual update check failed", e);
              setIsCheckingUpdate(false);
              addToast("Ошибка проверки обновления", "info");
          }
      } else {
          // Fallback if SW not supported or ready
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
