"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { getPreferredAuthenticatedPathForProfile } from "@/lib/creator-application";
import { trackEvent } from "@/lib/telemetry";

export default function HomeClient() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const isAdmin = userProfile?.role === "admin";
    const shouldRedirectSignedInUser =
        !loading &&
        Boolean(user) &&
        Boolean(userProfile) &&
        !isAdmin;
    const redirectUiReady = useDeferredClientReady({
        enabled: shouldRedirectSignedInUser,
        delayMs: 180,
    });

    useEffect(() => {
        if (!loading && (!user || isAdmin)) {
            trackEvent("home_page_viewed");
        }
    }, [isAdmin, loading, user]);

    useEffect(() => {
        if (!loading && user && userProfile && !isAdmin) {
            router.replace(getPreferredAuthenticatedPathForProfile(userProfile, user.uid));
        }
    }, [isAdmin, loading, router, user, userProfile]);

    if (!shouldRedirectSignedInUser || !redirectUiReady) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+5.25rem)] z-[60] flex justify-center px-4">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-black/30 backdrop-blur-sm">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
                {userProfile?.creatorApplication ? "Returning you to your creator application status" : "Returning you to your dashboard"}
            </div>
        </div>
    );
}
