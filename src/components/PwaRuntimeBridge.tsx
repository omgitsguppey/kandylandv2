"use client";

import { useEffect } from "react";

import { KANDYDROPS_APP_UPDATE_EVENT, registerAppServiceWorker } from "@/lib/firebase-messaging";
import { detectDeviceDisplayMode } from "@/lib/device-layout-contract";
import {
    classifyPwaServiceWorkerSafety,
    type PwaServiceWorkerSafetyInput,
} from "@/lib/features/pwa/pwa-service-worker-contract";
import { trackPwaServiceWorkerEvent } from "@/lib/features/pwa/pwa-update-telemetry";
import { PUBLIC_APP_VERSION } from "@/lib/release-notes/public-release-notes";
import { trackEvent } from "@/lib/telemetry";

const BUILD_REFRESH_SESSION_KEY = "kandydrops.build-refresh.version";
const BUILD_REFRESH_CHECK_SESSION_KEY = "kandydrops.build-refresh.last-check";
const BUILD_REFRESH_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const WORKER_RECOVERY_SESSION_KEY = "kandydrops.service-worker-recovery.version";
const WORKER_RECOVERY_MESSAGE_TYPE = "KANDYDROPS_SERVICE_WORKER_RECOVERY";
let singletonFreshnessWatcherMounted = false;

function resolveNotificationPermissionState() {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported" as const;
    }

    return Notification.permission === "granted"
        ? "granted"
        : Notification.permission === "denied"
            ? "denied"
            : "default";
}

function emitPwaEvent(eventName: Parameters<typeof trackPwaServiceWorkerEvent>[0]["eventName"], overrides: Partial<PwaServiceWorkerSafetyInput> = {}) {
    const safety = classifyPwaServiceWorkerSafety({
        serviceWorkerSupported: typeof window !== "undefined" && "serviceWorker" in navigator,
        registrationAttempted: true,
        offlineFallbackAvailable: true,
        forbiddenCachePathSafe: true,
        notificationPermissionState: resolveNotificationPermissionState(),
        pushTokenStatus: "missing",
        displayMode: detectDeviceDisplayMode(),
        mobileSafeAreaContractApplied: true,
        staleShellRiskSignals: [],
        ...overrides,
    });

    trackPwaServiceWorkerEvent({
        eventName,
        serviceWorkerStatus: safety.serviceWorkerStatus,
        registrationStatus: safety.registrationStatus,
        updateStatus: safety.updateStatus,
        offlineSupportStatus: safety.offlineSupportStatus,
        notificationCompatibility: safety.notificationCompatibility,
        standaloneMode: safety.standaloneMode,
        mobileSafeAreaImpact: safety.mobileSafeAreaImpact,
        route: typeof window === "undefined" ? "/" : window.location.pathname,
        sourceComponent: "PwaRuntimeBridge",
    }, trackEvent);
}

async function fetchManifestNoStore() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const response = await fetch(`/manifest.json?v=${encodeURIComponent(PUBLIC_APP_VERSION)}`, {
            cache: "no-store",
            headers: {
                "cache-control": "no-cache",
                pragma: "no-cache",
            },
        });
        return response.ok ? response : null;
    } catch {
        return null;
    }
}

async function fetchCurrentReleaseVersionNoStore() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const response = await fetch(`/kandydrops-release-notes.json?deployCheck=${Date.now()}`, {
            cache: "no-store",
            headers: {
                "cache-control": "no-cache",
                pragma: "no-cache",
            },
        });
        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as { currentVersion?: unknown };
        return typeof payload.currentVersion === "string" ? payload.currentVersion : null;
    } catch {
        return null;
    }
}

async function clearManagedKandyDropsCaches() {
    if (typeof window === "undefined" || !("caches" in window)) {
        return;
    }

    try {
        const cacheNames = await window.caches.keys();
        await Promise.all(
            cacheNames
                .filter((cacheName) => (
                    cacheName.startsWith("kandydrops-app-shell-")
                    || cacheName.startsWith("kandydrops-runtime-")
                ))
                .map((cacheName) => window.caches.delete(cacheName)),
        );
    } catch {
        // Cache cleanup is best-effort; the no-store reload still moves the tab forward.
    }
}

function readServiceWorkerRecoveryVersion(data: unknown) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return null;
    }

    const payload = data as { type?: unknown; cacheVersion?: unknown };
    if (payload.type !== WORKER_RECOVERY_MESSAGE_TYPE || typeof payload.cacheVersion !== "string") {
        return null;
    }

    return payload.cacheVersion;
}

export function PwaRuntimeBridge() {
    useEffect(() => {
        emitPwaEvent("pwa_service_worker_registration_started", {
            registrationAttempted: true,
        });
        void registerAppServiceWorker().then((registration) => {
            emitPwaEvent(registration ? "pwa_service_worker_registered" : "pwa_service_worker_registration_failed", {
                registered: Boolean(registration),
                registrationFailed: !registration,
            });
        });
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || singletonFreshnessWatcherMounted) {
            return;
        }

        singletonFreshnessWatcherMounted = true;

        const markCurrentBuildSeen = () => {
            try {
                window.sessionStorage.setItem(BUILD_REFRESH_SESSION_KEY, PUBLIC_APP_VERSION);
            } catch {
                // no-op in restricted storage contexts
            }
        };

        const refreshForVersion = async (nextVersion: string) => {
            try {
                const refreshMarker = `${PUBLIC_APP_VERSION}->${nextVersion}`;
                if (window.sessionStorage.getItem(BUILD_REFRESH_SESSION_KEY) === refreshMarker) {
                    return;
                }

                window.sessionStorage.setItem(BUILD_REFRESH_SESSION_KEY, refreshMarker);
            } catch {
                // no-op in restricted storage contexts
            }

            await clearManagedKandyDropsCaches();
            window.location.reload();
        };

        const refreshForWorkerRecovery = async (cacheVersion: string) => {
            try {
                const refreshMarker = `${PUBLIC_APP_VERSION}:${cacheVersion}`;
                if (window.sessionStorage.getItem(WORKER_RECOVERY_SESSION_KEY) === refreshMarker) {
                    return;
                }

                window.sessionStorage.setItem(WORKER_RECOVERY_SESSION_KEY, refreshMarker);
            } catch {
                // no-op in restricted storage contexts
            }

            emitPwaEvent("pwa_update_available", {
                registered: true,
                updateAvailable: true,
                staleShellRiskSignals: ["service_worker_cache_recovery"],
            });
            await clearManagedKandyDropsCaches();
            window.location.reload();
        };

        const checkForNewerBuild = async (force = false) => {
            try {
                const lastCheckedAt = Number(window.sessionStorage.getItem(BUILD_REFRESH_CHECK_SESSION_KEY) || "0");
                const now = Date.now();
                if (!force && Number.isFinite(lastCheckedAt) && now - lastCheckedAt < BUILD_REFRESH_CHECK_INTERVAL_MS) {
                    return;
                }
                window.sessionStorage.setItem(BUILD_REFRESH_CHECK_SESSION_KEY, String(now));
            } catch {
                // no-op in restricted storage contexts
            }

            const nextVersion = await fetchCurrentReleaseVersionNoStore();
            if (nextVersion && nextVersion !== PUBLIC_APP_VERSION) {
                emitPwaEvent("pwa_update_available", {
                    registered: true,
                    updateAvailable: true,
                    staleShellRiskSignals: ["release_version_mismatch"],
                });
                await refreshForVersion(nextVersion);
            }
        };

        const handleUpdateAvailable = (event: Event) => {
            const nextVersion = event instanceof CustomEvent && typeof event.detail?.nextVersion === "string"
                ? event.detail.nextVersion
                : PUBLIC_APP_VERSION;
            emitPwaEvent("pwa_update_available", {
                registered: true,
                updateAvailable: true,
                staleShellRiskSignals: ["service_worker_update_available"],
            });
            if (nextVersion !== PUBLIC_APP_VERSION) {
                void refreshForVersion(nextVersion);
                return;
            }
            void checkForNewerBuild(true);
        };

        const handleOffline = () => {
            emitPwaEvent("pwa_offline_seen", {
                registered: true,
                offlineFallbackAvailable: true,
            });
        };

        const handleBeforeInstallPrompt = () => {
            emitPwaEvent("pwa_install_prompt_seen", {
                registered: true,
            });
        };

        const handleServiceWorkerMessage = (event: MessageEvent) => {
            const recoveryVersion = readServiceWorkerRecoveryVersion(event.data);
            if (!recoveryVersion) {
                return;
            }

            void refreshForWorkerRecovery(recoveryVersion);
        };

        markCurrentBuildSeen();
        void fetchManifestNoStore().then(() => {
            // Deliberately silent; ensures freshness check bypasses stale cache layers.
        });
        void checkForNewerBuild(true);

        const handleFocus = () => void checkForNewerBuild();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void checkForNewerBuild();
            }
        };

        window.addEventListener(KANDYDROPS_APP_UPDATE_EVENT, handleUpdateAvailable);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
        }
        window.addEventListener("offline", handleOffline);
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener(KANDYDROPS_APP_UPDATE_EVENT, handleUpdateAvailable);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
            }
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            singletonFreshnessWatcherMounted = false;
        };
    }, []);

    return null;
}
