import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const placeholderValues = new Set([
  'your-firebase-api-key-here',
  'your-project-id',
  'your-project-id.firebaseapp.com',
  'your-project-id.appspot.com',
  'your-messaging-sender-id',
  'your-firebase-app-id',
]);

const hasValidConfigValue = (value) => (
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !placeholderValues.has(value.trim())
);

export const isFirebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every(hasValidConfigValue);

// Initialize Firebase only when real credentials are present.
const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

export default app;
