"use client";

import { getAnalytics, isSupported, logEvent, Analytics } from "firebase/analytics";
import { app } from "./firebase";

let analyticsInstance: Analytics | null = null;

// Initialize analytics only on the client side, and only if supported by the browser.
export async function initializeAnalytics() {
    if (typeof window !== "undefined" && analyticsInstance === null) {
        const supported = await isSupported();
        if (supported) {
            analyticsInstance = getAnalytics(app);
            console.log("Firebase Analytics securely initialized.");
        }
    }
}

/**
 * Global helper to log custom events to Google Analytics safely.
 * @param eventName - The standard or custom GA4 event name (e.g. "purchase", "drop_clicked")
 * @param eventParams - A dictionary of metadata to pass with the event
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
    // Attempt initialization if missed
    if (!analyticsInstance && typeof window !== "undefined") {
        initializeAnalytics().then(() => {
            if (analyticsInstance) {
                logEvent(analyticsInstance, eventName, eventParams);
            }
        });
        return;
    }

    if (analyticsInstance) {
        logEvent(analyticsInstance, eventName, eventParams);
    }
}
