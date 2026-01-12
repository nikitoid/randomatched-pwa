import { useState, useEffect, useCallback } from 'react';
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = (addToast: (msg: string, type: 'success' | 'info' | 'error') => void) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        setRegistration(r);
        console.log('SW Registered: ', r);
        // Initial auto-check
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

  const checkForUpdate = useCallback(async () => {
      if (!registration) {
          addToast("Сервис обновлений недоступен", "error");
          return;
      }
      
      setIsCheckingUpdate(true);
      try {
          await registration.update();
          // If a new worker is found, 'needRefresh' will update via the plugin's internal listener
          // We wait a short moment to see if state changes, otherwise assume no update
          setTimeout(() => {
              if (registration.installing || registration.waiting) {
                  // Let the useEffect handle showing the banner
              } else {
                  addToast("Установлена последняя версия", "info");
              }
              setIsCheckingUpdate(false);
          }, 1000);
          
      } catch (e) {
          console.error("Update check failed", e);
          addToast("Ошибка проверки обновлений", "error");
          setIsCheckingUpdate(false);
      }
  }, [registration, addToast]);

  return {
      waitingWorker: null, 
      isUpdateAvailable: needRefresh,
      isCheckingUpdate,
      showUpdateBanner,
      setShowUpdateBanner,
      handleUpdateApp,
      handleOpenUpdateBanner,
      checkForUpdate
  };
};