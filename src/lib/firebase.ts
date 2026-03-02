import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize the Vertex AI Gemini API backend service (Firebase AI Logic)
import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";

let ai;
let model;

// Ensure we only initialize AI logic on the client-side to prevent SSR Node errors with Web APIs if not polyfilled
if (typeof window !== "undefined") {
    try {
        ai = getAI(app, { backend: new VertexAIBackend() });
        // Use gemini-2.5-flash-lite as the stable baseline for 2026
        model = getGenerativeModel(ai, { model: "gemini-2.5-flash-lite" });
    } catch (error) {
        console.warn("Firebase AI Logic failed to initialize on client:", error);
    }
}

export { app, auth, ai, model };

export const SITE_ORIGIN = "https://kandydrops-by-ikandy.web.app";
