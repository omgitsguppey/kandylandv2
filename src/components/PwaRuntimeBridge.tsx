"use client";

import { useEffect } from "react";

import { KANDYDROPS_APP_UPDATE_EVENT, registerAppServiceWorker } from "@/lib/firebase-messaging";
import { PUBLIC_APP_VERSION } from "@/lib/release-notes/public-release-notes";

const BUILD_REFRESH_SESSION_KEY = "kandydrops.build-refresh.version";
let singletonFreshnessWatcherMounted = false;

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

export function PwaRuntimeBridge() {
    useEffect(() => {
        void registerAppServiceWorker();
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

        const handleUpdateAvailable = () => {
            // Keep this update flow silent for public user surfaces.
            markCurrentBuildSeen();
        };

        markCurrentBuildSeen();
        void fetchManifestNoStore().then(() => {
            // Deliberately silent; ensures freshness check bypasses stale cache layers.
        });

        window.addEventListener(KANDYDROPS_APP_UPDATE_EVENT, handleUpdateAvailable);
        return () => {
            window.removeEventListener(KANDYDROPS_APP_UPDATE_EVENT, handleUpdateAvailable);
            singletonFreshnessWatcherMounted = false;
        };
    }, []);

    return null;
}
