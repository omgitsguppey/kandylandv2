/**
 * Firestore & Storage exports, separated from firebase.ts (auth-only)
 * for code-splitting. AuthContext can lazy-import this module so
 * Firestore doesn't block the initial auth bundle.
 */
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { app } from "./firebase";

export const db = getFirestore(app);
export const storage = getStorage(app);
