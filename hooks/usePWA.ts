import { useState, useEffect, useCallback } from 'react';
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const usePWA = (addToast: (msg: string, type: 'success' | 'info') => void) => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      if (r) {
        console.log('SW Registered: ', r);
        // Checking for updates logic is handled automatically by the browser/plugin mostly,
        // but we can simulate the "checking" state for UI feedback
        setIsCheckingUpdate(true);
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // Check every hour
        setTimeout(() => setIsCheckingUpdate(false), 2000);
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

  return {
      waitingWorker: null, // Abstracted by plugin
      isUpdateAvailable: needRefresh,
      isCheckingUpdate,
      showUpdateBanner,
      setShowUpdateBanner,
      handleUpdateApp,
      handleOpenUpdateBanner
  };
};