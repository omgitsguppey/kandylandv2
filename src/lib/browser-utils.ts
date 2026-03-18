"use client";

/**
 * Detects if the current device is an iOS device (iPhone, iPad, iPod).
 */
const isIOS = () => {
    if (typeof window === "undefined") return false;

    return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
};

/**
 * Detects if the web app is running in "Standalone" mode (Added to Home Screen).
 */
export const isStandalone = () => {
    if (typeof window === "undefined") return false;

    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
    );
};

/**
 * Returns true if the device is iOS and NOT in standalone mode.
 * This is the state where Web Push is generally NOT supported on iOS.
 */
export const isIOSNonStandalone = () => {
    return isIOS() && !isStandalone();
};
