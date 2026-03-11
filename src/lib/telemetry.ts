import { authFetch } from "./authFetch";

/**
 * Fire-and-forget telemetry tracking.
 * Securely logs events to the backend passing the user's auth token automatically.
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
    // We don't await this because telemetry should never block UI
    authFetch("/api/telemetry/track", {
        method: "POST",
        body: JSON.stringify({ eventName, eventParams }),
    }).catch((err) => {
        // Silently fail on the client if telemetry drops
        console.error("[Telemetry] Failed to track event:", err);
    });
}
