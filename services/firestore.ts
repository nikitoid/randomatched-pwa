import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection as fsCollection,
  doc as fsDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  setDoc as fsSetDoc,
  deleteDoc as fsDeleteDoc,
  onSnapshot as fsOnSnapshot,
  query as fsQuery,
  orderBy as fsOrderBy,
  where as fsWhere,
  writeBatch as fsWriteBatch,
  type Firestore,
  type SetOptions,
  type DocumentReference,
  type CollectionReference,
  type Query,
  type QueryConstraint,
  type WhereFilterOp,
  type OrderByDirection,
  type DocumentData,
} from 'firebase/firestore';
import {
  isTestEnvironment,
  mockCollection,
  mockDoc,
  mockOrderBy,
  mockWhere,
  mockQuery,
  mockGetDoc,
  mockGetDocs,
  mockSetDoc,
  mockDeleteDoc,
  mockOnSnapshot,
  mockWriteBatch,
  type MockCollectionRef,
  type MockDocRef,
  type MockQueryRef,
  type MockQueryConstraint,
} from './mockFirestore';

export { isTestEnvironment };

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let realDbInstance: Firestore | null = null;

export const getRealFirestore = (): Firestore => {
  if (realDbInstance) return realDbInstance;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  try {
    realDbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    realDbInstance = getFirestore(app);
  }
  return realDbInstance;
};

// Keep lazy initialization so Playwright test environment never initializes real Firebase SDK
export const db: Firestore | null = isTestEnvironment() ? null : getRealFirestore();

export type AppCollectionRef = CollectionReference<DocumentData> | MockCollectionRef;
export type AppDocRef = DocumentReference<DocumentData> | MockDocRef;
export type AppQueryRef = Query<DocumentData> | MockQueryRef;
export type AppQueryConstraint = QueryConstraint | MockQueryConstraint;

export const collection = (collectionName: string): AppCollectionRef => {
  if (isTestEnvironment()) {
    return mockCollection(collectionName);
  }
  return fsCollection(getRealFirestore(), collectionName);
};

export const doc = (collectionName: string, docId: string): AppDocRef => {
  if (isTestEnvironment()) {
    return mockDoc(collectionName, docId);
  }
  return fsDoc(getRealFirestore(), collectionName, docId);
};

export const orderBy = (
  field: string,
  direction: OrderByDirection = 'asc'
): AppQueryConstraint => {
  if (isTestEnvironment()) {
    return mockOrderBy(field, direction);
  }
  return fsOrderBy(field, direction);
};

export const where = (
  field: string,
  op: WhereFilterOp,
  value: unknown
): AppQueryConstraint => {
  if (isTestEnvironment()) {
    return mockWhere(field, op, value);
  }
  return fsWhere(field, op, value);
};

export const query = (
  colRef: AppCollectionRef,
  ...constraints: AppQueryConstraint[]
): AppQueryRef => {
  if (isTestEnvironment()) {
    return mockQuery(colRef as MockCollectionRef, ...(constraints as MockQueryConstraint[]));
  }
  return fsQuery(
    colRef as CollectionReference<DocumentData>,
    ...(constraints as QueryConstraint[])
  );
};

export const getDoc = (docRef: AppDocRef) => {
  if (isTestEnvironment()) {
    return mockGetDoc(docRef as MockDocRef);
  }
  return fsGetDoc(docRef as DocumentReference<DocumentData>);
};

export const getDocs = (target: AppCollectionRef | AppQueryRef) => {
  if (isTestEnvironment()) {
    return mockGetDocs(target as MockCollectionRef | MockQueryRef);
  }
  return fsGetDocs(target as CollectionReference<DocumentData> | Query<DocumentData>);
};

export const setDoc = (
  docRef: AppDocRef,
  data: Record<string, any>,
  options?: SetOptions
): Promise<void> => {
  if (isTestEnvironment()) {
    return mockSetDoc(docRef as MockDocRef, data, options as { merge?: boolean } | undefined);
  }
  const ref = docRef as DocumentReference<DocumentData>;
  return options ? fsSetDoc(ref, data, options) : fsSetDoc(ref, data);
};

export const deleteDoc = (docRef: AppDocRef): Promise<void> => {
  if (isTestEnvironment()) {
    return mockDeleteDoc(docRef as MockDocRef);
  }
  return fsDeleteDoc(docRef as DocumentReference<DocumentData>);
};

export const onSnapshot = (
  target: AppDocRef | AppCollectionRef | AppQueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  if (isTestEnvironment()) {
    return mockOnSnapshot(
      target as MockDocRef | MockCollectionRef | MockQueryRef,
      onNext,
      onError
    );
  }
  return fsOnSnapshot(target as any, onNext, onError);
};

export interface AppWriteBatch {
  set: (docRef: AppDocRef, data: Record<string, any>, options?: SetOptions) => void;
  delete: (docRef: AppDocRef) => void;
  commit: () => Promise<void>;
}

export const writeBatch = (): AppWriteBatch => {
  if (isTestEnvironment()) {
    const batch = mockWriteBatch();
    return {
      set: (docRef, data, options) =>
        batch.set(docRef as MockDocRef, data, options as { merge?: boolean } | undefined),
      delete: (docRef) => batch.delete(docRef as MockDocRef),
      commit: () => batch.commit(),
    };
  }

  const batch = fsWriteBatch(getRealFirestore());
  return {
    set: (docRef, data, options) => {
      const ref = docRef as DocumentReference<DocumentData>;
      if (options) {
        batch.set(ref, data, options);
      } else {
        batch.set(ref, data);
      }
    },
    delete: (docRef) => {
      batch.delete(docRef as DocumentReference<DocumentData>);
    },
    commit: () => batch.commit(),
  };
};
