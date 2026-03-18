import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import type { AppCheck } from "firebase/app-check";
export { SITE_ORIGIN } from "@/lib/site-origin";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import {
    FIREBASE_CLIENT_CONFIG,
    FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY,
    IS_DEVELOPMENT_ENV,
    getFirebaseRuntimeWarnings,
} from "@/lib/firebase-runtime";

const app = !getApps().length ? initializeApp(FIREBASE_CLIENT_CONFIG) : getApp();
const auth = getAuth(app);

let appCheck: AppCheck | undefined;

function shouldEnableAppCheck() {
    if (typeof window === "undefined") {
        return false;
    }

    const { navigator } = window;
    const userAgent = navigator.userAgent || "";
    const automationGlobals = window as typeof window & {
        __playwright__binding__?: unknown;
        __pwManual?: unknown;
        __nightmare?: unknown;
    };
    const automatedContext = Boolean(
        navigator.webdriver ||
        automationGlobals.__playwright__binding__ ||
        automationGlobals.__pwManual ||
        automationGlobals.__nightmare ||
        /HeadlessChrome|Playwright|Electron/i.test(userAgent),
    );

    return !automatedContext;
}

// Client-only initialization (App Check)
if (typeof window !== "undefined") {
    getFirebaseRuntimeWarnings().forEach((warning) => {
        recordClientDiagnostic("firebase", warning);
    });

    // --- Firebase App Check (ReCaptcha Enterprise) ---
    try {
        // Enable debug token in development so local requests aren't rejected
        if (IS_DEVELOPMENT_ENV) {
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        const recaptchaKey = FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY;
        if (recaptchaKey && shouldEnableAppCheck()) {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
                isTokenAutoRefreshEnabled: true,
            });
        }
    } catch (error) {
        recordClientDiagnostic("firebase", "Firebase App Check failed to initialize", {
            message: error instanceof Error ? error.message : String(error),
        });
        console.warn("Firebase App Check failed to initialize:", error);
    }
}

export { app, auth, appCheck };
