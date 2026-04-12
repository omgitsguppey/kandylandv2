"use client";

import posthog from "posthog-js";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Only initialize outside of the component so it binds to the window securely once
if (typeof window !== "undefined") {
    // Only turn on if the API key exists and we are actually running securely
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
            person_profiles: "identified_only", 
            // We capture pageviews manually below to support Next.js's router architecture
            capture_pageview: false,
            // Opt out of automatic recording in development to prevent noise, only recording in production builds
            disable_session_recording: process.env.NODE_ENV !== "production",
        });
    }
}

function PostHogPageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (pathname && typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            let url = window.origin + pathname;
            if (searchParams && searchParams.toString()) {
                url = url + `?${searchParams.toString()}`;
            }
            posthog.capture("$pageview", {
                $current_url: url,
            });
        }
    }, [pathname, searchParams]);

    return null;
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    // We do not need the heavy <PostHogProvider client={posthog}> from posthog-js/react
    // as we just want purely passive trackings, not React hooks usage for feature flags.
    return (
        <>
            <Suspense fallback={null}>
                <PostHogPageViewTracker />
            </Suspense>
            {children}
        </>
    );
}
