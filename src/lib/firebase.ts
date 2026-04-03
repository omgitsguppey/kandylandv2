import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export { SITE_ORIGIN } from "@/lib/site-origin";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import {
    getFirebaseClientConfigForRuntime,
    getFirebaseRuntimeWarnings,
} from "@/lib/firebase-runtime";

type FirebaseClientConfig = ReturnType<typeof getFirebaseClientConfigForRuntime>;

export const EMPTY_FIREBASE_CLIENT_CONFIG: FirebaseClientConfig = Object.freeze({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    databaseURL: "",
    messagingSenderId: "",
    appId: "",
});

export function normalizeFirebaseClientConfig(): {
    config: FirebaseClientConfig;
    isConfigured: boolean;
} {
    const runtimeConfig = getFirebaseClientConfigForRuntime();
    const apiKey = runtimeConfig.apiKey?.trim() ?? "";
    const projectId = runtimeConfig.projectId?.trim() ?? "";
    const appId = runtimeConfig.appId?.trim() ?? "";
    const databaseUrl = runtimeConfig.databaseURL?.trim();

    const isConfigured = apiKey.length > 0 && projectId.length > 0 && appId.length > 0;

    if (isConfigured) {
        return {
            isConfigured: true,
            config: {
                apiKey,
                authDomain: runtimeConfig.authDomain?.trim() || `${projectId}.firebaseapp.com`,
                projectId,
                storageBucket: runtimeConfig.storageBucket?.trim() || `${projectId}.appspot.com`,
                databaseURL: databaseUrl,
                messagingSenderId: runtimeConfig.messagingSenderId?.trim() || "000000000000",
                appId,
            },
        };
    }

    return {
        isConfigured: false,
        config: EMPTY_FIREBASE_CLIENT_CONFIG,
    };
}

const { config: firebaseConfig, isConfigured: firebaseClientConfigured } = normalizeFirebaseClientConfig();

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = firebaseClientConfigured ? getAuth(app) : null;

if (typeof window !== "undefined") {
    getFirebaseRuntimeWarnings().forEach((warning) => {
        recordClientDiagnostic("firebase", warning);
    });
}

export { app, auth, firebaseClientConfigured };
