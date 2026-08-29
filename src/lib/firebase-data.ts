/**
 * Firestore, Storage & Realtime Database exports, separated from
 * firebase.ts (auth-only) for code-splitting. AuthContext can
 * lazy-import this module so Firestore doesn't block the initial auth bundle.
 */
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getDatabase, type Database } from "firebase/database";
import { app } from "./firebase";
import { FIREBASE_DATABASE_URL } from "./firebase-runtime";
import { isLocalPublicPreviewClient } from "./local-public-preview-client";

const localPublicPreview = isLocalPublicPreviewClient();

export const db = !localPublicPreview && app
    ? (() => {
        try {
            return initializeFirestore(app, {
                experimentalAutoDetectLongPolling: true,
            });
        } catch {
            return getFirestore(app);
        }
    })()
    : null as unknown as Firestore;
export const storage = (!localPublicPreview && app ? getStorage(app) : null) as FirebaseStorage;
export const rtdb = !localPublicPreview && app
    ? FIREBASE_DATABASE_URL ? getDatabase(app, FIREBASE_DATABASE_URL) : getDatabase(app)
    : null as unknown as Database;
