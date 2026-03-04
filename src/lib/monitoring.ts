/**
 * Global abstraction layer for Error Monitoring and Telemetry
 * Automatically stubbed for integration with Sentry, LogRocket, or Datadog.
 */

export function initMonitoring() {
    if (typeof window !== "undefined") {
        console.log("[Monitoring] Initialized client-side telemetry.");
        // Sentry.init({...})
        // LogRocket.init(...)
    }
}

export function captureException(error: Error, context?: Record<string, any>) {
    console.error("[Monitoring] Captured Exception:", error, context);
    // Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, context?: Record<string, any>) {
    console.log("[Monitoring] Captured Message:", message, context);
    // Sentry.captureMessage(message, { extra: context })
}
