import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from '@firebase/auth';
import { getFirestore } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const getReactNativePersistence = (FirebaseAuth as any)
    .getReactNativePersistence as ((storage: typeof AsyncStorage) => any) | undefined;

export const auth = (() => {
    try {
        if (!getReactNativePersistence) return FirebaseAuth.getAuth(app);

        return FirebaseAuth.initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch {
        return FirebaseAuth.getAuth(app);
    }
})();
export const db = getFirestore(app);
