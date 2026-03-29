import "server-only";
import * as admin from "firebase-admin";
import { FIREBASE_DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET } from "@/lib/firebase-runtime";
import { captureException } from "@/lib/monitoring";

if (!admin.apps.length) {
    try {
        const projectId = FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const storageBucket = FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
        const databaseURL = FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
        const baseConfig = {
            projectId,
            storageBucket,
            databaseURL,
        };

        if (clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                ...baseConfig,
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                ...baseConfig,
            });
        }
    } catch (error) {
        captureException(error, { context: "Firebase Admin Initialization Error" });
        throw error;
    }
}

export const adminDb = admin.firestore();
export const firebaseAdmin = admin;
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
export const adminAppCheck = admin.appCheck();
