import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * CLI tool to promote a user to 'admin' role.
 * Usage: npm run promote-admin <email>
 */

async function main() {
    const input = process.argv[2];
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!input) {
        console.error("Usage: npm run promote-admin <email_or_uid>");
        process.exit(1);
    }

    const isEmail = input.includes("@");

    console.log(`Promoting user: ${input} (${isEmail ? "Email" : "UID"}) to admin...`);
    console.log(`Using Project ID: ${projectId || "Not detected"}`);

    // ... (Firebase Admin initialization code remains the same as before) ...
    // Note: I will only replace the body of the try-catch for clarity in this chunk
    // But since I'm using replace_file_content for a single block, I'll include the init too to be safe

    if (!admin.apps.length) {
        try {
            let credential;
            const saPath = path.resolve(process.cwd(), "service-account.json");

            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                console.log("Using GOOGLE_APPLICATION_CREDENTIALS from environment.");
                credential = admin.credential.applicationDefault();
            } else if (require("fs").existsSync(saPath)) {
                console.log(`Using service account key from: ${saPath}`);
                credential = admin.credential.cert(saPath);
            } else {
                console.log("No service account key found. Falling back to application default.");
                credential = admin.credential.applicationDefault();
            }

            admin.initializeApp({
                credential: credential,
                projectId: projectId
            });
            console.log("Firebase Admin Initialized");
        } catch (error) {
            console.error("Firebase Admin Initialization Error.");
            console.error("To fix this, please follow one of these steps:");
            console.error("1. Download a Service Account Key (JSON) from Firebase Console (Project Settings -> Service Accounts).");
            console.error("2. Rename it to 'service-account.json' and place it in your project root.");
            console.error("   OR set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the file path.");
            process.exit(1);
        }
    }

    const db = admin.firestore();
    const auth = admin.auth();

    try {
        // 1. Find user in Auth
        let user: admin.auth.UserRecord;
        if (isEmail) {
            user = await auth.getUserByEmail(input);
        } else {
            user = await auth.getUser(input);
        }

        console.log(`Found user in Auth: ${user.uid} (${user.email || "No email"})`);

        // 2. Set Custom Claims
        console.log("Setting custom claims: { admin: true }...");
        await auth.setCustomUserClaims(user.uid, { admin: true });

        // 3. Update Firestore (for UI consistency and fallback)
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            console.warn(`Warning: User profile not found in Firestore collection 'users' for UID ${user.uid}. Creating it...`);
            await userRef.set({
                uid: user.uid,
                email: user.email || null,
                role: "admin",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } else {
            await userRef.update({
                role: "admin"
            });
        }

        console.log(`Successfully promoted ${input} to admin.`);
        console.log("Note: The user must sign out and sign back in (or refresh their token) for the new admin claim to take effect.");
        process.exit(0);
    } catch (error: any) {
        console.error("Error promoting user:", error.message);
        process.exit(1);
    }
}

main();
