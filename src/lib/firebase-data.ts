/**
 * Firestore, Storage & Realtime Database exports, separated from
 * firebase.ts (auth-only) for code-splitting. AuthContext can
 * lazy-import this module so Firestore doesn't block the initial auth bundle.
 */
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { app } from "./firebase";
import { FIREBASE_DATABASE_URL } from "./firebase-runtime";

export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = FIREBASE_DATABASE_URL ? getDatabase(app, FIREBASE_DATABASE_URL) : getDatabase(app);
