import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import type { AppCheck } from "firebase/app-check";
export { SITE_ORIGIN } from "@/lib/site-origin";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import {
    getFirebaseClientConfigForRuntime,
    FIREBASE_RECAPTCHA_ENTERPRISE_SITE_KEY,
    IS_DEVELOPMENT_ENV,
    getFirebaseRuntimeWarnings,
} from "@/lib/firebase-runtime";

const app = !getApps().length ? initializeApp(getFirebaseClientConfigForRuntime()) : getApp();
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

if (typeof window !== "undefined") {
    getFirebaseRuntimeWarnings().forEach((warning) => {
        recordClientDiagnostic("firebase", warning);
    });
}

export function getAppCheckInstance() {
    if (typeof window === "undefined" || appCheck) {
        return appCheck;
    }

    try {
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

    return appCheck;
}

export { app, auth, appCheck };
