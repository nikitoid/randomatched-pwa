import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// Config uses environment variables if available, otherwise falls back to provided debug keys
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBSvSbR_NJj7riu0HZPz3nile1X4tuxfsI",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "unmatched-randomizer.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "unmatched-randomizer",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "unmatched-randomizer.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "168086799887",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:168086799887:web:3c8af51f935999b7d6c57a",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-GEQPMK68B0"
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firestore with the new cache settings to avoid deprecation warnings
// and enable multi-tab persistence.
initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Firestore (Compat API)
export const db = app.firestore();