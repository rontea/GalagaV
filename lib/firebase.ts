import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// NOTE: In a real environment, these would be populated by process.env variables.
// For the purpose of this generated code, we check if keys exist to avoid crashing.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.warn("Firebase initialization failed (expected if no keys provided). Falling back to local mode.", error);
  // We allow the app to continue, services will handle missing DB gracefully
}

export { db, auth };
