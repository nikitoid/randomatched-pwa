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
export const db = app.firestore();