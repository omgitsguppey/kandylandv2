"use client";

import dynamic from "next/dynamic";
import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuthIdentity, useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { trackEvent } from "@/lib/telemetry";

const HomepageRuntimeDiagnostics = dynamic(
    () => import("@/components/HomepageRuntimeDiagnostics").then((mod) => mod.HomepageRuntimeDiagnostics),
    { ssr: false },
);

export default function HomeClient() {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { loading } = useAuthLoading();
    const router = useRouter();
    const trackedHomeViewRef = useRef(false);
    const redirectPathRef = useRef<string | null>(null);
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
    const diagnosticsReady = useDeferredClientReady({
        delayMs: 1400,
        idle: true,
    });

    useEffect(() => {
        if (!loading && (!user || isAdmin) && !trackedHomeViewRef.current) {
            trackedHomeViewRef.current = true;
            trackEvent("home_page_viewed");
        }
    }, [isAdmin, loading, user]);

    useEffect(() => {
        if (!loading && user && userProfile && !isAdmin) {
            const nextPath = "/dashboard";
            if (redirectPathRef.current === nextPath) {
                return;
            }

            redirectPathRef.current = nextPath;
            startTransition(() => {
                router.replace(nextPath);
            });
        }
    }, [isAdmin, loading, router, user, userProfile]);

    return (
        <>
            {diagnosticsReady ? (
                <div className="contents" data-hydration-lane="idle">
                    <HomepageRuntimeDiagnostics />
                </div>
            ) : null}
            {shouldRedirectSignedInUser && redirectUiReady ? (
                <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+5.25rem)] z-[60] flex justify-center px-4" data-hydration-lane="critical">
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-black/30 backdrop-blur-sm">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
                        {userProfile?.creatorApplication ? "Returning you to your creator application status" : "Returning you to your dashboard"}
                    </div>
                </div>
            ) : null}
        </>
    );
}
