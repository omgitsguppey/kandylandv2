import * as admin from "firebase-admin";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

let initialized = false;

function ensureAdminApp() {
    if (initialized && admin.apps.length > 0) {
        return admin.app();
    }

    if (admin.apps.length > 0) {
        initialized = true;
        return admin.app();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.DATABASE_URL || (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined);

    if (clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            projectId,
            storageBucket,
            databaseURL,
        });
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId,
            storageBucket,
            databaseURL,
        });
    }

    initialized = true;
    return admin.app();
}

export function getRuntimeAdminDb() {
    ensureAdminApp();
    return admin.firestore();
}
