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

    const maskValue = (val: string, isMail: boolean) => {
        if (!val) return val;
        if (isMail) {
            const [local, domain] = val.split('@');
            if (!domain) return "***";
            return local.length <= 2 ? `***@${domain}` : `${local.substring(0, 2)}***@${domain}`;
        }
        return val.length <= 4 ? "***" : `${val.substring(0, 4)}***`;
    };

    const maskedInput = maskValue(input, isEmail);

    console.log(`Promoting user: ${maskedInput} (${isEmail ? "Email" : "UID"}) to admin...`);
    console.log(`Using Project ID: ${projectId || "Not detected"}`);

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

        const maskedUid = maskValue(user.uid, false);
        const maskedEmail = user.email ? maskValue(user.email, true) : "No email";
        console.log(`Found user in Auth: ${maskedUid} (${maskedEmail})`);

        // 2. Set Custom Claims
        console.log("Setting custom claims: { admin: true }...");
        await auth.setCustomUserClaims(user.uid, { admin: true });

        // 3. Update Firestore (for UI consistency and fallback)
        const userRef = db.collection("users").doc(user.uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            console.warn(`Warning: User profile not found in Firestore collection 'users' for UID ${maskedUid}. Creating it...`);
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

        console.log(`Successfully promoted ${maskedInput} to admin.`);
        console.log("Note: The user must sign out and sign back in (or refresh their session) for the new admin claim to take effect.");
        process.exit(0);
    } catch (error: any) {
        console.error("Error promoting user:", error.message);
        process.exit(1);
    }
}

main();
