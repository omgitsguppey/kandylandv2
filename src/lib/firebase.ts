import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export { SITE_ORIGIN } from "@/lib/site-origin";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import {
    getFirebaseClientConfigForRuntime,
    getFirebaseRuntimeWarnings,
} from "@/lib/firebase-runtime";
import { isLocalPublicPreviewClient } from "@/lib/local-public-preview-client";

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

const localPublicPreview = isLocalPublicPreviewClient();
const normalizedFirebaseConfig = localPublicPreview
    ? { config: EMPTY_FIREBASE_CLIENT_CONFIG, isConfigured: false }
    : normalizeFirebaseClientConfig();
const firebaseConfig = normalizedFirebaseConfig.config;
const firebaseClientConfigured = !localPublicPreview && normalizedFirebaseConfig.isConfigured;

const app = (localPublicPreview ? null : (!getApps().length ? initializeApp(firebaseConfig) : getApp())) as FirebaseApp;
const auth = firebaseClientConfigured && app ? getAuth(app) : null;

if (typeof window !== "undefined" && !localPublicPreview) {
    getFirebaseRuntimeWarnings().forEach((warning) => {
        recordClientDiagnostic("firebase", warning);
    });
}

export { app, auth, firebaseClientConfigured };
