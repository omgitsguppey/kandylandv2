"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
    canUseAnonymousAnalytics,
    readPrivacySettingsSnapshot,
    subscribeToPrivacySettings,
} from "@/lib/privacy-consent";

type PostHogClient = typeof import("posthog-js").default;

let posthogClientPromise: Promise<PostHogClient | null> | null = null;
let posthogInitialized = false;
let loadedPostHogClient: PostHogClient | null = null;

function loadPostHogClient() {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        return Promise.resolve(null);
    }

    if (!posthogClientPromise) {
        posthogClientPromise = import("posthog-js")
            .then((mod) => {
                const posthog = mod.default;
                if (!posthogInitialized) {
                    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
                        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
                        person_profiles: "identified_only",
                        capture_pageview: false,
                        disable_session_recording: process.env.NODE_ENV !== "production",
                    });
                    posthogInitialized = true;
                }

                loadedPostHogClient = posthog;
                return posthog;
            })
            .catch(() => null);
    }

    return posthogClientPromise;
}

function schedulePostPaint(callback: () => void) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => {
            if (!cancelled) {
                callback();
            }
        }, 0);
    });

    return () => {
        cancelled = true;
        window.cancelAnimationFrame(frameId);
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
        }
    };
}

function PostHogPageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [analyticsAllowed, setAnalyticsAllowed] = useState(() => canUseAnonymousAnalytics(readPrivacySettingsSnapshot()));

    useEffect(() => {
        return subscribeToPrivacySettings(() => {
            const nextAllowed = canUseAnonymousAnalytics(readPrivacySettingsSnapshot());
            if (loadedPostHogClient) {
                if (nextAllowed) {
                    loadedPostHogClient.opt_in_capturing();
                } else {
                    loadedPostHogClient.opt_out_capturing();
                }
            }
            setAnalyticsAllowed(nextAllowed);
        });
    }, []);

    useEffect(() => {
        if (!pathname || !analyticsAllowed || typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            return;
        }

        return schedulePostPaint(() => {
            void loadPostHogClient().then((posthog) => {
                if (!posthog || !canUseAnonymousAnalytics(readPrivacySettingsSnapshot())) {
                    return;
                }

                let url = window.origin + pathname;
                if (searchParams && searchParams.toString()) {
                    url = `${url}?${searchParams.toString()}`;
                }
                posthog.capture("$pageview", {
                    $current_url: url,
                });
            });
        });
    }, [analyticsAllowed, pathname, searchParams]);

    return null;
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Suspense fallback={null}>
                <PostHogPageViewTracker />
            </Suspense>
            {children}
        </>
    );
}
