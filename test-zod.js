require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
});

async function run() {
    try {
        const doc = await admin.firestore().collection('drops').doc('zIOMWB3lQaxwA5hivAx1').get();
        require('fs').writeFileSync('raw_drop2.json', JSON.stringify(doc.data(), null, 2), 'utf8');
    } catch (e) {
        console.error("Error fetching drop:", e);
    }
}
run();
