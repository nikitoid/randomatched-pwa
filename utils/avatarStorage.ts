import { AvatarRecord } from '../types';
import { STORAGE_KEYS, getStorageJSON, setStorageJSON, removeStorageItem } from './storage';

const DB_NAME = 'randomatched_avatars_db';
const DB_VERSION = 1;
const STORE_NAME = 'avatars';

export function getAvatarKey(entityType: 'player' | 'hero', entityId: string): string {
  // Normalize string for consistency (case insensitive trimming for names)
  const normalizedId = entityId.trim().toLowerCase();
  return `${entityType}_${normalizedId}`;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB is not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn('[AvatarStorage] Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Fallback helpers for localStorage
function getLocalStorageAvatars(): Record<string, string> {
  const parsed = getStorageJSON<unknown>(STORAGE_KEYS.AVATARS_FALLBACK, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, string>)
    : {};
}

function saveLocalStorageAvatar(key: string, dataUrl: string | null) {
  const avatars = getLocalStorageAvatars();
  if (dataUrl) {
    avatars[key] = dataUrl;
  } else {
    delete avatars[key];
  }
  if (Object.keys(avatars).length === 0) {
    removeStorageItem(STORAGE_KEYS.AVATARS_FALLBACK);
  } else {
    setStorageJSON(STORAGE_KEYS.AVATARS_FALLBACK, avatars);
  }
}

function removeLocalStorageAvatarIfPresent(key: string) {
  const avatars = getLocalStorageAvatars();
  if (!(key in avatars)) return;
  delete avatars[key];
  if (Object.keys(avatars).length === 0) {
    removeStorageItem(STORAGE_KEYS.AVATARS_FALLBACK);
  } else {
    setStorageJSON(STORAGE_KEYS.AVATARS_FALLBACK, avatars);
  }
}

export async function getAvatarFromStorage(entityType: 'player' | 'hero', entityId: string): Promise<string | null> {
  if (!entityId) return null;
  const key = getAvatarKey(entityType, entityId);

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const record = req.result as AvatarRecord | undefined;
        if (record) {
          removeLocalStorageAvatarIfPresent(key);
          resolve(record.dataUrl);
        } else {
          resolve(getLocalStorageAvatars()[key] || null);
        }
      };

      req.onerror = () => {
        resolve(getLocalStorageAvatars()[key] || null);
      };
    });
  } catch (e) {
    return getLocalStorageAvatars()[key] || null;
  }
}

export async function saveAvatarToStorage(
  entityType: 'player' | 'hero',
  entityId: string,
  dataUrl: string
): Promise<AvatarRecord> {
  const key = getAvatarKey(entityType, entityId);
  const record: AvatarRecord = {
    id: key,
    entityType,
    entityId: entityId.trim(),
    dataUrl,
    updatedAt: Date.now(),
  };

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        removeLocalStorageAvatarIfPresent(key);
        resolve(record);
      };
      req.onerror = () => {
        saveLocalStorageAvatar(key, dataUrl);
        resolve(record);
      };
    });
  } catch (e) {
    saveLocalStorageAvatar(key, dataUrl);
    return record;
  }
}

export async function deleteAvatarFromStorage(entityType: 'player' | 'hero', entityId: string): Promise<void> {
  const key = getAvatarKey(entityType, entityId);
  removeLocalStorageAvatarIfPresent(key);

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {
    // Already removed from localStorage
  }
}

export async function getAllAvatarRecordsFromStorage(): Promise<AvatarRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result as AvatarRecord[];
        resolve(records || []);
      };

      req.onerror = () => {
        resolve([]);
      };
    });
  } catch (e) {
    return [];
  }
}

export async function getAllAvatarsFromStorage(): Promise<Record<string, string>> {

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result as AvatarRecord[];
        const fallbackAvatars = getLocalStorageAvatars();
        const map: Record<string, string> = { ...fallbackAvatars };
        let hasDuplicatesInFallback = false;

        records.forEach((r) => {
          map[r.id] = r.dataUrl;
          if (r.id in fallbackAvatars) {
            delete fallbackAvatars[r.id];
            hasDuplicatesInFallback = true;
          }
        });

        if (hasDuplicatesInFallback) {
          if (Object.keys(fallbackAvatars).length === 0) {
            removeStorageItem(STORAGE_KEYS.AVATARS_FALLBACK);
          } else {
            setStorageJSON(STORAGE_KEYS.AVATARS_FALLBACK, fallbackAvatars);
          }
        }

        resolve(map);
      };

      req.onerror = () => {
        resolve(getLocalStorageAvatars());
      };
    });
  } catch (e) {
    return getLocalStorageAvatars();
  }
}

export async function saveAllAvatarsToStorage(avatarsMap: Record<string, string>): Promise<void> {
  const keys = Object.keys(avatarsMap);
  for (const key of keys) {
    const parts = key.split('_');
    const entityType = parts[0] as 'player' | 'hero';
    const entityId = parts.slice(1).join('_');
    if (entityType && entityId && avatarsMap[key]) {
      await saveAvatarToStorage(entityType, entityId, avatarsMap[key]);
    }
  }
}
