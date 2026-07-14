import { app, auth, firebaseClientConfigured } from "@/lib/firebase";
import { recordClientBreadcrumb, recordClientDiagnostic } from "@/lib/client-diagnostics";
import {
    buildAdminViewAsHeaders,
    isAdminViewAsBlockedRequest,
    readAdminViewAsStateFromStorage,
} from "@/lib/admin/synthetic-creators-view-as";
import { resolveSameOriginRelativePath } from "@/lib/client-safe-url";

export type AppCheckClientReadiness = {
    enabled: boolean;
    reason: "ready" | "off" | "browser_unavailable" | "firebase_unavailable" | "site_key_missing";
};

let appCheckInstancePromise: Promise<import("firebase/app-check").AppCheck | null> | null = null;
let appCheckFailureReported = false;

export function resolveAppCheckClientReadiness(input: {
    mode?: string | null;
    siteKey?: string | null;
    browserAvailable?: boolean;
    firebaseConfigured?: boolean;
}): AppCheckClientReadiness {
    if (input.mode?.trim().toLowerCase() !== "token") {
        return { enabled: false, reason: "off" };
    }
    if (input.browserAvailable !== true) {
        return { enabled: false, reason: "browser_unavailable" };
    }
    if (input.firebaseConfigured !== true) {
        return { enabled: false, reason: "firebase_unavailable" };
    }
    if (!input.siteKey?.trim()) {
        return { enabled: false, reason: "site_key_missing" };
    }
    return { enabled: true, reason: "ready" };
}

async function getCustomBackendAppCheckToken(): Promise<string | null> {
    const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_ID?.trim() ?? "";
    const readiness = resolveAppCheckClientReadiness({
        mode: process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_CLIENT_MODE,
        siteKey,
        browserAvailable: typeof window !== "undefined",
        firebaseConfigured: firebaseClientConfigured,
    });
    if (!readiness.enabled) {
        return null;
    }

    try {
        const appCheckSdk = await import("firebase/app-check");
        appCheckInstancePromise ??= Promise.resolve(appCheckSdk.initializeAppCheck(app, {
            provider: new appCheckSdk.ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: false,
        }));
        const appCheckInstance = await appCheckInstancePromise;
        if (!appCheckInstance) {
            return null;
        }

        const tokenResult = await appCheckSdk.getToken(appCheckInstance, false);
        appCheckFailureReported = false;
        return tokenResult.token?.trim() || null;
    } catch (error) {
        if (!appCheckFailureReported) {
            appCheckFailureReported = true;
            recordClientDiagnostic("firebase", "App Check client token unavailable; request continuing in source-ready fail-open mode", {
                errorName: error instanceof Error ? error.name : "unknown_error",
            }, "warn");
        }
        return null;
    }
}

function resolveSafeAuthFetchUrl(url: string) {
    if (typeof window === "undefined") {
        return url;
    }

    const safeUrl = resolveSameOriginRelativePath(url, window.location.origin);
    if (!safeUrl) {
        const detail = {
            url,
            currentOrigin: window.location.origin,
        };
        recordClientDiagnostic("network", "Blocked cross-origin authenticated request", detail, "error");
        recordClientBreadcrumb("network", "blocked authFetch unsafe URL", detail);
        throw new Error("Cross-origin authenticated requests are not allowed");
    }

    return safeUrl;
}

/**
 * Makes an authenticated fetch call by attaching the Firebase ID token
 * as a Bearer token in the Authorization header.
 *
 * Usage: const res = await authFetch("/api/some-route", { method: "POST", body: JSON.stringify(data) });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    if (!auth) {
        throw new Error("Authentication is unavailable in this environment");
    }

    const safeUrl = resolveSafeAuthFetchUrl(url);
    const currentUser = auth.currentUser;
    if (!currentUser) {
        recordClientDiagnostic("network", "Authenticated request attempted without a signed-in user", {
            url: safeUrl,
            method: options.method || "GET",
        }, "warn");
        throw new Error("Not authenticated");
    }

    const requestStartedAt = Date.now();
    const idToken = await currentUser.getIdToken();

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${idToken}`);
    const adminViewAsState = readAdminViewAsStateFromStorage();
    const blockedViewAsRequest = adminViewAsState
        ? isAdminViewAsBlockedRequest(safeUrl, options.method || "GET")
        : null;
    if (adminViewAsState) {
        Object.entries(buildAdminViewAsHeaders(adminViewAsState)).forEach(([key, value]) => {
            headers.set(key, value);
        });
    }
    const hasFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (!headers.has("Content-Type") && options.body && !hasFormDataBody) {
        headers.set("Content-Type", "application/json");
    }

    if (blockedViewAsRequest && adminViewAsState) {
        fetch("/api/admin/view-as-creator", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${idToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "blocked",
                targetUserId: adminViewAsState.adminViewingAsUserId,
                reason: blockedViewAsRequest.reason,
                route: safeUrl,
                routePrefix: blockedViewAsRequest.routePrefix,
                simulationStartedAt: adminViewAsState.simulationStartedAt,
            }),
            keepalive: true,
        }).catch(() => undefined);
        recordClientDiagnostic("network", "Blocked view-as state-changing request", {
            url: safeUrl,
            method: options.method || "GET",
            targetUserId: adminViewAsState.adminViewingAsUserId,
            reason: blockedViewAsRequest.reason,
        }, "warn");
        throw new Error(`${blockedViewAsRequest.reason} Return to admin to continue.`);
    }

    const appCheckToken = await getCustomBackendAppCheckToken();
    if (appCheckToken) {
        headers.set("X-Firebase-AppCheck", appCheckToken);
    }

    try {
        const response = await fetch(safeUrl, {
            ...options,
            headers,
            cache: options.cache ?? "no-store",
        });

        if (!response.ok) {
            const detail = {
                url: safeUrl,
                method: options.method || "GET",
                status: response.status,
                durationMs: Date.now() - requestStartedAt,
            };
            recordClientDiagnostic("network", "Authenticated request failed", detail, response.status >= 500 ? "error" : "warn");
            recordClientBreadcrumb("network", `${detail.method} ${safeUrl}`, detail);
        }

        return response;
    } catch (error) {
        const detail = {
            url: safeUrl,
            method: options.method || "GET",
            durationMs: Date.now() - requestStartedAt,
            message: error instanceof Error ? error.message : String(error),
        };
        recordClientDiagnostic("network", "Authenticated request threw", detail, "error");
        recordClientBreadcrumb("network", `${detail.method} ${safeUrl}`, detail);
        throw error;
    }
}
