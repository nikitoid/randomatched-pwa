import { useEffect, useState } from 'react';
import { useHeroListsContext } from '../context/HeroListsContext';
import { useMatchHistoryContext } from '../context/MatchHistoryContext';
import { useSeasonsContext } from '../context/SeasonsContext';
import { useAvatars } from '../context/AvatarContext';
import { useConnectivityContext } from '../context/ConnectivityContext';
import { APP_VERSION } from '../utils/changelog';
import { STORAGE_KEYS, getStorageItem, getStorageJSON, setStorageItem } from '../utils/storage';

/**
 * Performs a one-time initial cloud auto-sync for brand-new users with no local data.
 */
export const useInitialAutoSync = (onMarkVersionSeen: (version: string) => void) => {
  const { isOnline } = useConnectivityContext();
  const { isLoaded: isListsLoaded, syncWithCloud } = useHeroListsContext();
  const { isLoaded: isHistoryLoaded, syncHistory } = useMatchHistoryContext();
  const { isLoaded: isSeasonsLoaded, syncSeasons } = useSeasonsContext();
  const { syncAvatarsToCloud } = useAvatars();

  const [autoSyncAttempted, setAutoSyncAttempted] = useState(false);
  const isAllLoaded = isListsLoaded && isHistoryLoaded && isSeasonsLoaded;

  useEffect(() => {
    if (!isAllLoaded || !isOnline || autoSyncAttempted) return;

    const hasSyncedBefore = getStorageItem(STORAGE_KEYS.HAS_AUTO_SYNCED);
    if (!hasSyncedBefore) {
      // Safely check whether storage already contains real user data (not empty [] arrays)
      const hasExistingData = (() => {
        const parsedLists = getStorageJSON<unknown>(STORAGE_KEYS.LISTS, null);
        if (Array.isArray(parsedLists) && parsedLists.length > 0) return true;

        const parsedHistory = getStorageJSON<unknown>(STORAGE_KEYS.MATCH_HISTORY, null);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) return true;

        const parsedSeasons = getStorageJSON<unknown>(STORAGE_KEYS.SEASONS, null);
        if (Array.isArray(parsedSeasons) && parsedSeasons.length > 0) return true;

        const parsedNames = getStorageJSON<unknown>(STORAGE_KEYS.PLAYER_NAMES, null);
        if (
          Array.isArray(parsedNames) &&
          parsedNames.some((n: unknown) => typeof n === 'string' && n.trim() !== '')
        ) {
          return true;
        }

        return false;
      })();

      // Mark flag immediately to avoid duplicate auto-sync attempts
      setStorageItem(STORAGE_KEYS.HAS_AUTO_SYNCED, 'true');
      setAutoSyncAttempted(true);

      // Auto-sync runs strictly for new users without existing local data
      if (!hasExistingData) {
        setStorageItem(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
        onMarkVersionSeen(APP_VERSION);

        const performInitialAutoSync = async () => {
          try {
            await syncWithCloud();
            await syncHistory({ silentIfNoChanges: true });
            await syncSeasons({ silentIfNoChanges: true });
            await syncAvatarsToCloud();
          } catch (e) {
            console.error('Error during initial auto-sync:', e);
          }
        };

        void performInitialAutoSync();
      }
    }
  }, [
    isAllLoaded,
    isOnline,
    autoSyncAttempted,
    syncWithCloud,
    syncHistory,
    syncSeasons,
    syncAvatarsToCloud,
    onMarkVersionSeen,
  ]);
};
