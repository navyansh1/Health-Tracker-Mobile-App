// Firebase Configuration for NutriSnap
// Replace these values with your own Firebase project credentials
// See README.md for complete setup instructions

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ REPLACE THESE VALUES WITH YOUR OWN FIREBASE CONFIG
// Get these from Firebase Console → Project Settings → Your Apps → Web App
const firebaseConfig = {
    apiKey: "AIzaSyBnk740GKXk0e72U-SVFoscrobXuII63P0",
    authDomain: "nutri-snap-9e388.firebaseapp.com",
    projectId: "nutri-snap-9e388",
    storageBucket: "nutri-snap-9e388.firebasestorage.app",
    messagingSenderId: "872313418957",
    appId: "1:872313418957:web:8446120580a6e39c276584"
};

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage for persistence
let auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (error) {
    // Auth already initialized, get existing instance
    auth = getAuth(app);
    // Ensure persistence is set even if we got an existing instance
    // reliable way to fix "logged out after restart" issues
    const { setPersistence, browserLocalPersistence } = require("firebase/auth");
    setPersistence(auth, getReactNativePersistence(AsyncStorage))
        .catch((err) => console.log("Error setting persistence:", err));
}

export { auth };

// Initialize Cloud Storage (for food photos)
export const storage = getStorage(app);

// Initialize Firestore (for meal data)
export const firestore = getFirestore(app);

export default app;
