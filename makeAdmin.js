const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
require('dotenv').config({ path: '.env.local' });

const targetUser = process.argv[2];
if (!targetUser) {
    console.error('Usage: node makeAdmin.js <email>');
    process.exit(1);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

initializeApp({
    credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    })
});

const db = getFirestore();
const auth = getAuth();

async function makeAdmin() {
    const email = targetUser;
    try {
        const user = await auth.getUserByEmail(email);
        console.log("Found user:", user.uid);
        await db.collection("users").doc(user.uid).update({ role: "admin" });
        console.log("Success! Granted admin to " + email);
    } catch (err) {
        // If not by email, let's just query the db
        console.log("Trying to find by email in DB...");
        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await doc.ref.update({ role: "admin" });
            console.log("Success! Granted admin to " + doc.id);
        } else {
            console.log("User not found");
        }
    }
}
makeAdmin();
