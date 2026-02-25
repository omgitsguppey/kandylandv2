import "server-only";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                projectId: projectId
            });
            console.log("Firebase Admin Initialized with Service Account Cert.");
        } else {
            console.warn("⚠️ Firebase Service Account Missing. Attempting applicationDefault().");
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: projectId
            });
        }
    } catch (error) {
        console.error("Firebase Admin Initialization Error:", error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
