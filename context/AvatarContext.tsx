import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAvatarKey,
  getAvatarFromStorage,
  saveAvatarToStorage,
  deleteAvatarFromStorage,
  getAllAvatarsFromStorage,
  getAllAvatarRecordsFromStorage,
  saveAllAvatarsToStorage,
} from '../utils/avatarStorage';
import { db } from '../firebase';
import { checkConnectivity as checkConnectivityUtil, withTimeout } from '../utils/connectivity';


const PENDING_DELETE_KEYS_STORAGE = 'randomatched_deleted_avatar_keys_v1';

const getPendingDeletes = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PENDING_DELETE_KEYS_STORAGE);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
};

const savePendingDeletes = (set: Set<string>) => {
  try {
    localStorage.setItem(PENDING_DELETE_KEYS_STORAGE, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Failed to save pending deletes:', e);
  }
};

const addPendingDelete = (key: string) => {
  const current = getPendingDeletes();
  current.add(key);
  savePendingDeletes(current);
};

const removePendingDelete = (key: string) => {
  const current = getPendingDeletes();
  current.delete(key);
  savePendingDeletes(current);
};

interface AvatarContextType {
  avatars: Record<string, string>;
  getAvatar: (entityType: 'player' | 'hero', entityId: string) => string | null;
  setAvatar: (entityType: 'player' | 'hero', entityId: string, dataUrl: string) => Promise<void>;
  removeAvatar: (entityType: 'player' | 'hero', entityId: string) => Promise<void>;
  exportAvatars: () => Promise<Record<string, string>>;
  importAvatars: (avatarsMap: Record<string, string>) => Promise<void>;
  syncAvatarsToCloud: () => Promise<boolean>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  // 1. Initial load from local IndexedDB
  useEffect(() => {
    let isMounted = true;
    getAllAvatarsFromStorage().then((stored) => {
      if (isMounted) {
        setAvatars(stored);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time Firebase Sync with Tombstone support
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      if (db && typeof db.collection === 'function') {
        const avatarsRef = db.collection('avatars');
        unsubscribe = avatarsRef.onSnapshot(
          (snapshot: any) => {
            if (!snapshot || !snapshot.docs) return;
            const pendingDeletes = getPendingDeletes();

            snapshot.docs.forEach((doc: any) => {
              const data = doc.data();
              if (!data || !data.id) return;
              const key = data.id;

              // Check if deleted in Cloud OR pending delete locally
              if (data.deleted || pendingDeletes.has(key)) {
                setAvatars((prev) => {
                  if (!prev[key]) return prev;
                  const copy = { ...prev };
                  delete copy[key];

                  const parts = key.split('_');
                  const entityType = parts[0] as 'player' | 'hero';
                  const entityId = parts.slice(1).join('_');
                  if (entityType && entityId) {
                    deleteAvatarFromStorage(entityType, entityId);
                  }
                  return copy;
                });
              } else if (data.dataUrl) {
                setAvatars((prev) => {
                  if (prev[key] === data.dataUrl) return prev;
                  const parts = key.split('_');
                  const entityType = parts[0] as 'player' | 'hero';
                  const entityId = parts.slice(1).join('_');
                  if (entityType && entityId) {
                    saveAvatarToStorage(entityType, entityId, data.dataUrl);
                  }
                  return { ...prev, [key]: data.dataUrl };
                });
              }
            });
          },
          (err: any) => {
            console.warn('[AvatarContext] Firestore snapshot offline or blocked:', err);
          }
        );
      }
    } catch (e) {
      console.warn('[AvatarContext] Firebase sync not initialized:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getAvatar = useCallback(
    (entityType: 'player' | 'hero', entityId: string): string | null => {
      if (!entityId) return null;
      const key = getAvatarKey(entityType, entityId);
      return avatars[key] || null;
    },
    [avatars]
  );

  const setAvatar = useCallback(
    async (entityType: 'player' | 'hero', entityId: string, dataUrl: string) => {
      if (!entityId || !dataUrl) return;
      const key = getAvatarKey(entityType, entityId);

      // Clear from pending deletes
      removePendingDelete(key);

      // 1. INSTANT Local Persistence (0ms UI lag)
      await saveAvatarToStorage(entityType, entityId, dataUrl);
      setAvatars((prev) => ({ ...prev, [key]: dataUrl }));

      // 2. Safe non-blocking background push
      setTimeout(async () => {
        try {
          const isConnected = await checkConnectivityUtil(3000);
          if (!isConnected) {
            console.log('[AvatarContext] Network offline. Saved locally.');
            return;
          }

          if (db && typeof db.collection === 'function') {
            await withTimeout(
              db.collection('avatars').doc(key).set({
                id: key,
                entityType,
                entityId: entityId.trim(),
                dataUrl,
                deleted: false,
                updatedAt: Date.now(),
              }),
              3500
            );
          }
        } catch (e) {
          console.warn('[AvatarContext] Background push skipped:', e);
        }
      }, 50);
    },
    []
  );

  const removeAvatar = useCallback(
    async (entityType: 'player' | 'hero', entityId: string) => {
      if (!entityId) return;
      const key = getAvatarKey(entityType, entityId);

      // Register in pending deletes (Tombstone)
      addPendingDelete(key);

      // 1. INSTANT Local Removal
      await deleteAvatarFromStorage(entityType, entityId);
      setAvatars((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      // 2. Safe non-blocking delete/tombstone push
      setTimeout(async () => {
        try {
          const isConnected = await checkConnectivityUtil(3000);
          if (!isConnected) return;

          if (db && typeof db.collection === 'function') {
            await withTimeout(
              db.collection('avatars').doc(key).set({
                id: key,
                deleted: true,
                updatedAt: Date.now(),
              }),
              3500
            );
            removePendingDelete(key);
          }
        } catch (e) {
          console.warn('[AvatarContext] Background delete skipped:', e);
        }
      }, 50);
    },
    []
  );

  const syncAvatarsToCloud = useCallback(async (): Promise<boolean> => {
    try {
      if (!db || typeof db.collection !== 'function') return false;

      const isConnected = await checkConnectivityUtil(4000);
      if (!isConnected) {
        console.log('[AvatarContext] Skip sync: no internet connectivity');
        return false;
      }

      // 1. Process pending tombstone deletes created on THIS device while offline
      const pendingDeletes = getPendingDeletes();
      if (pendingDeletes.size > 0) {
        for (const key of Array.from(pendingDeletes)) {
          try {
            await withTimeout(
              db.collection('avatars').doc(key).set({
                id: key,
                deleted: true,
                updatedAt: Date.now(),
              }),
              3000
            );
            removePendingDelete(key);
          } catch (delErr) {
            console.warn(`[AvatarContext] Failed to sync delete for ${key}:`, delErr);
          }
        }
      }

      // 2. Fetch current Cloud avatar records for conflict resolution
      const cloudMap = new Map<string, any>();
      try {
        const cloudSnapshot: any = await withTimeout(db.collection('avatars').get(), 4000);
        if (cloudSnapshot && cloudSnapshot.docs) {
          cloudSnapshot.docs.forEach((doc: any) => {
            cloudMap.set(doc.id, doc.data());
          });
        }
      } catch (cloudFetchErr) {
        console.warn('[AvatarContext] Could not fetch cloud avatars map:', cloudFetchErr);
      }

      // 3. Process local active avatars against Cloud state
      const localRecords = await getAllAvatarRecordsFromStorage();

      for (const rec of localRecords) {
        if (!rec || !rec.id) continue;
        const key = rec.id;

        // Skip if currently pending delete on this device
        if (pendingDeletes.has(key)) continue;

        const cloudData = cloudMap.get(key);

        if (cloudData) {
          // CONFLICT RESOLUTION:
          // Case A: Cloud document is marked as DELETED by another device!
          if (cloudData.deleted) {
            const cloudDeletedAt = cloudData.updatedAt || 0;
            const localUpdatedAt = rec.updatedAt || 0;

            // If deleted in Cloud after or near local creation, ACCEPT CLOUD DELETION
            if (cloudDeletedAt >= localUpdatedAt) {
              console.log(`[AvatarContext] Cloud avatar ${key} was deleted on another device. Deleting locally.`);
              await deleteAvatarFromStorage(rec.entityType, rec.entityId);
              setAvatars((prev) => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
              });
              continue; // Do NOT push local stale avatar back to Cloud!
            }
          }

          // Case B: Cloud document is newer than local version
          if (cloudData.updatedAt && cloudData.updatedAt > (rec.updatedAt || 0) && cloudData.dataUrl) {
            console.log(`[AvatarContext] Cloud avatar ${key} is newer. Accepting cloud version.`);
            await saveAvatarToStorage(rec.entityType, rec.entityId, cloudData.dataUrl);
            setAvatars((prev) => ({ ...prev, [key]: cloudData.dataUrl }));
            continue;
          }
        }

        // Case C: Local version is newer OR not present in cloud -> Push to Cloud
        if (rec.dataUrl) {
          try {
            await withTimeout(
              db.collection('avatars').doc(key).set({
                id: key,
                entityType: rec.entityType,
                entityId: rec.entityId,
                dataUrl: rec.dataUrl,
                deleted: false,
                updatedAt: rec.updatedAt || Date.now(),
              }),
              4000
            );
          } catch (itemErr) {
            console.warn(`[AvatarContext] Failed to sync avatar ${key}:`, itemErr);
          }
        }
      }

      console.log(`[AvatarContext] Successfully synced avatars & resolved conflicts with cloud.`);
      return true;
    } catch (e) {
      console.warn('[AvatarContext] Manual sync error:', e);
      return false;
    }
  }, []);



  // 3. Auto-sync unpushed avatars when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncAvatarsToCloud();
    };
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncAvatarsToCloud]);

  const exportAvatars = useCallback(async () => {
    return await getAllAvatarsFromStorage();
  }, []);

  const importAvatars = useCallback(async (avatarsMap: Record<string, string>) => {
    await saveAllAvatarsToStorage(avatarsMap);
    setAvatars((prev) => ({ ...prev, ...avatarsMap }));
  }, []);


  return (
    <AvatarContext.Provider
      value={{
        avatars,
        getAvatar,
        setAvatar,
        removeAvatar,
        exportAvatars,
        importAvatars,
        syncAvatarsToCloud,
      }}
    >

      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatars = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatars must be used within an AvatarProvider');
  }
  return context;
};
