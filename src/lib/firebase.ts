import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const CANONICAL_AUTH_DOMAIN = "kandydrops--kandydrops-by-ikandy.us-central1.hosted.app";

function resolveAuthDomain() {
    const configuredDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();

    if (!configuredDomain) {
        return CANONICAL_AUTH_DOMAIN;
    }

    if (configuredDomain.endsWith("firebaseapp.com") || configuredDomain.endsWith("web.app")) {
        return CANONICAL_AUTH_DOMAIN;
    }

    return configuredDomain;
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: resolveAuthDomain(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth, CANONICAL_AUTH_DOMAIN };
