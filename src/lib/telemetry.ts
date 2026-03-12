import { auth } from "./firebase";
import { authFetch } from "./authFetch";

/**
 * Fire-and-forget telemetry tracking.
 * Sends analytics to GA when available and mirrors them to the backend for authenticated users.
 */
function sanitizeEventParams(eventParams?: Record<string, unknown>) {
    if (!eventParams) {
        return undefined;
    }

    const sanitized: Record<string, string | number | boolean> = {};

    Object.entries(eventParams).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            sanitized[key] = value;
            return;
        }

        if (value === null || typeof value === "undefined") {
            return;
        }

        sanitized[key] = JSON.stringify(value);
    });

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function trackEvent(eventName: string, eventParams?: Record<string, unknown>) {
    const sanitizedParams = sanitizeEventParams(eventParams);

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", eventName, sanitizedParams);
    }

    if (!auth.currentUser) {
        return;
    }

    // We don't await this because telemetry should never block UI.
    authFetch("/api/telemetry/track", {
        method: "POST",
        body: JSON.stringify({ eventName, eventParams: sanitizedParams }),
    }).catch((err) => {
        // Silently fail on the client if telemetry drops.
        console.error("[Telemetry] Failed to track event:", err);
    });
}
