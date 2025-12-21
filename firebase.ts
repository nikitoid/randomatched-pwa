import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Config uses environment variables if available
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
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