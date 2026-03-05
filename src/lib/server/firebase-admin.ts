import "server-only";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

        if (clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                projectId: projectId,
                storageBucket: storageBucket
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: projectId,
                storageBucket: storageBucket
            });
        }
    } catch (error) {
        console.error("Firebase Admin Initialization Error:", error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();
