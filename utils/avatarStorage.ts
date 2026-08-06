import { AvatarRecord } from '../types';

const DB_NAME = 'randomatched_avatars_db';
const DB_VERSION = 1;
const STORE_NAME = 'avatars';
const LOCAL_STORAGE_FALLBACK_KEY = 'randomatched_avatars_fallback';

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
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalStorageAvatar(key: string, dataUrl: string | null) {
  try {
    const avatars = getLocalStorageAvatars();
    if (dataUrl) {
      avatars[key] = dataUrl;
    } else {
      delete avatars[key];
    }
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(avatars));
  } catch (e) {
    console.warn('[AvatarStorage] localStorage fallback error:', e);
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
        resolve(record ? record.dataUrl : getLocalStorageAvatars()[key] || null);
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

  saveLocalStorageAvatar(key, dataUrl);

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record); // Fallback already saved
    });
  } catch (e) {
    return record;
  }
}

export async function deleteAvatarFromStorage(entityType: 'player' | 'hero', entityId: string): Promise<void> {
  const key = getAvatarKey(entityType, entityId);
  saveLocalStorageAvatar(key, null);

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
        const map: Record<string, string> = { ...getLocalStorageAvatars() };
        records.forEach((r) => {
          map[r.id] = r.dataUrl;
        });
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
