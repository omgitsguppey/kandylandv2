import { auth } from "@/lib/firebase";
import { getAppCheckToken } from "@/lib/app-check";
import { recordClientBreadcrumb, recordClientDiagnostic } from "@/lib/client-diagnostics";

function resolveSafeAuthFetchUrl(url: string) {
    if (typeof window === "undefined") {
        return url;
    }

    const resolvedUrl = new URL(url, window.location.origin);
    if (resolvedUrl.origin !== window.location.origin) {
        const detail = {
            url,
            attemptedOrigin: resolvedUrl.origin,
            currentOrigin: window.location.origin,
        };
        recordClientDiagnostic("network", "Blocked cross-origin authenticated request", detail, "error");
        recordClientBreadcrumb("network", `blocked authFetch ${resolvedUrl.origin}`, detail);
        throw new Error("Cross-origin authenticated requests are not allowed");
    }

    return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
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
    const [idToken, appCheckToken] = await Promise.all([
        currentUser.getIdToken(),
        getAppCheckToken(),
    ]);

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${idToken}`);
    if (appCheckToken) {
        headers.set("X-Firebase-AppCheck", appCheckToken);
    }
    if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const response = await fetch(safeUrl, {
            ...options,
            headers,
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
