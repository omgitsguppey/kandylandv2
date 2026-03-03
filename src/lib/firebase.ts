import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import type { AppCheck } from "firebase/app-check";

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

let ai: ReturnType<typeof getAI> | undefined;
let model: ReturnType<typeof getGenerativeModel> | undefined;
let appCheck: AppCheck | undefined;

// Client-only initializations (App Check, AI Logic)
if (typeof window !== "undefined") {
    // --- Firebase App Check (ReCaptcha Enterprise) ---
    try {
        // Enable debug token in development so local requests aren't rejected
        if (process.env.NODE_ENV === "development") {
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
        if (recaptchaKey) {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
                isTokenAutoRefreshEnabled: true,
            });
        }
    } catch (error) {
        console.warn("Firebase App Check failed to initialize:", error);
    }

    // --- Firebase AI Logic (Gemini) ---
    try {
        ai = getAI(app, { backend: new VertexAIBackend() });
        model = getGenerativeModel(ai, { model: "gemini-2.5-flash-lite" });
    } catch (error) {
        console.warn("Firebase AI Logic failed to initialize on client:", error);
    }
}

export { app, auth, ai, model, appCheck };

export const SITE_ORIGIN = "https://kandydrops-by-ikandy.web.app";
