import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Config uses Vite environment variables (must start with VITE_)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firestore with the new cache settings to avoid deprecation warnings
// and enable multi-tab persistence.
// We cast app to any to avoid potential type mismatch between compat and modular types if strictly checked
initializeFirestore(app as any, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Firestore (Compat API)
// Initialize Firestore (Compat API)
const realDB = app.firestore();

// Mock DB for Playwright Tests
const getMockDB = () => {
  // Ensure global storage for mock data exists
  if (!(window as any).__MOCK_DB_DATA__) {
    (window as any).__MOCK_DB_DATA__ = {}; // Map: collection -> array of docs
  }

  const mockDB = {
    collection: (collectionName: string) => {
      const getCollectionData = () => ((window as any).__MOCK_DB_DATA__[collectionName] || []);
      const setCollectionData = (data: any[]) => { (window as any).__MOCK_DB_DATA__[collectionName] = data; };

      return {
        doc: (docId: string) => ({
          set: async (data: any) => {
            console.log(`[MOCK DB] SET ${collectionName}/${docId}`, data);
            const current = getCollectionData();
            const index = current.findIndex((d: any) => d.id === docId);
            const newDoc = { ...data, id: docId };
            if (index >= 0) {
              current[index] = newDoc;
            } else {
              current.push(newDoc);
            }
            setCollectionData(current);
            return Promise.resolve();
          },
          get: async () => {
            console.log(`[MOCK DB] GET ${collectionName}/${docId}`);
            const doc = getCollectionData().find((d: any) => d.id === docId);
            return Promise.resolve({
              exists: !!doc,
              data: () => doc
            });
          },
          delete: async () => {
            console.log(`[MOCK DB] DELETE ${collectionName}/${docId}`);
            const current = getCollectionData();
            setCollectionData(current.filter((d: any) => d.id !== docId));
            return Promise.resolve();
          }
        }),
        orderBy: (field: string, direction: 'asc' | 'desc') => ({
          get: async () => {
            console.log(`[MOCK DB] QUERY ${collectionName} ORDER BY ${field} ${direction}`);
            const sorted = [...getCollectionData()].sort((a: any, b: any) => {
              if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
              if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
              return 0;
            });
            return Promise.resolve({
              docs: sorted.map(doc => ({
                id: doc.id,
                data: () => doc
              }))
            });
          }
        }),
        get: async () => {
          return Promise.resolve({
            docs: getCollectionData().map((doc: any) => ({
              id: doc.id,
              data: () => doc
            }))
          });
        }
      };
    }
  };

  return mockDB as any;
};

// Check if running in Playwright (injected via addInitScript)
// Since this file is loaded in the browser, valid window check is enough
const isTestMode = typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_TEST__;

export const db = isTestMode ? getMockDB() : realDB;