import { auth } from "@/lib/firebase";
import { getAppCheckToken } from "@/lib/app-check";
import { recordClientBreadcrumb, recordClientDiagnostic } from "@/lib/client-diagnostics";

/**
 * Makes an authenticated fetch call by attaching the Firebase ID token
 * as a Bearer token in the Authorization header.
 *
 * Usage: const res = await authFetch("/api/some-route", { method: "POST", body: JSON.stringify(data) });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        recordClientDiagnostic("network", "Authenticated request attempted without a signed-in user", {
            url,
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
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const detail = {
                url,
                method: options.method || "GET",
                status: response.status,
                durationMs: Date.now() - requestStartedAt,
            };
            recordClientDiagnostic("network", "Authenticated request failed", detail, response.status >= 500 ? "error" : "warn");
            recordClientBreadcrumb("network", `${detail.method} ${url}`, detail);
        }

        return response;
    } catch (error) {
        const detail = {
            url,
            method: options.method || "GET",
            durationMs: Date.now() - requestStartedAt,
            message: error instanceof Error ? error.message : String(error),
        };
        recordClientDiagnostic("network", "Authenticated request threw", detail, "error");
        recordClientBreadcrumb("network", `${detail.method} ${url}`, detail);
        throw error;
    }
}
