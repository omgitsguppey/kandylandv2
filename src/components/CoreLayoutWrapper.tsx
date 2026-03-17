"use client";

import { PayPalProvider } from "@/components/PayPalProvider";
import { Toaster } from "sonner";
import CookieBanner from "@/components/CookieBanner";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { applyAnalyticsConsentToGtag, persistPrivacySettingsSnapshot, readPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { writeLastVisitedPath } from "@/lib/navigation-persistence";

const MobileBottomBar = dynamic(() => import("@/components/Navigation/MobileBottomBar"));
const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar));
const GlobalPurchaseModal = dynamic(() => import("@/components/GlobalPurchaseModal").then((mod) => mod.GlobalPurchaseModal));
const GlobalAuthModal = dynamic(() => import("@/components/GlobalAuthModal").then((mod) => mod.GlobalAuthModal));
const GuidedOnboarding = dynamic(() => import("@/components/Auth/GuidedOnboarding").then((mod) => mod.GuidedOnboarding), { ssr: false });
const DebugBreakpoints = dynamic(() => import("@/components/Debug/DebugBreakpoints").then((mod) => mod.DebugBreakpoints));
const InsufficientBalanceModal = dynamic(() => import("@/components/InsufficientBalanceModal").then((mod) => mod.InsufficientBalanceModal));
const ScrollToTop = dynamic(() => import("@/components/Navigation/ScrollToTop").then((mod) => mod.ScrollToTop));
const AutoScrollToTop = dynamic(() => import("@/components/Navigation/AutoScrollToTop").then((mod) => mod.AutoScrollToTop));
const DeepTracker = dynamic(() => import("@/components/Analytics/DeepTracker").then((mod) => mod.DeepTracker), { ssr: false });
const PwaRuntimeBridge = dynamic(() => import("@/components/PwaRuntimeBridge").then((mod) => mod.PwaRuntimeBridge), { ssr: false });
const NotificationRuntimeBridge = dynamic(
    () => import("@/components/Notifications/NotificationRuntimeBridge").then((mod) => mod.NotificationRuntimeBridge),
    { ssr: false },
);
const TaskGuidanceBanner = dynamic(
    () => import("@/components/Dashboard/TaskGuidanceBanner").then((mod) => mod.TaskGuidanceBanner),
    { ssr: false },
);

export function CoreLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user, userProfile } = useAuth();
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith("/admin") ?? false;
    const isLegalRoute = pathname === "/privacy" || pathname === "/terms";
    const isUserShell = Boolean(user) && userProfile?.role !== "admin" && !isAdminRoute;
    const shouldShowPublicChrome = !isAdminRoute;
    const shouldShowPurchaseUi = !isAdminRoute;
    const shouldShowAuthUi = !isAdminRoute;
    const shouldShowCookieBanner = !isAdminRoute;
    const shouldShowDebugBreakpoints = process.env.NODE_ENV !== "production";
    const shouldTrackDeepAnalytics = !isAdminRoute && !isLegalRoute;
    const shouldEnablePwaRuntime = !isAdminRoute;

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Track user properties in GA
            if (window.gtag && userProfile?.role) {
                window.gtag("set", "user_properties", {
                    user_role: userProfile.role,
                });
            }

            // Capture and store referral code from URL
            const params = new URLSearchParams(window.location.search);
            const refCode = params.get("ref");
            if (refCode) {
                sessionStorage.setItem("kandy_referral", refCode);
            }
        }
    }, [userProfile?.role]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (userProfile?.privacySettings) {
            persistPrivacySettingsSnapshot({
                anonymousAnalyticsEnabled: userProfile.privacySettings.anonymousAnalyticsEnabled,
                identifiedAnalyticsEnabled: userProfile.privacySettings.identifiedAnalyticsEnabled,
                allowRecommendations: userProfile.privacySettings.allowRecommendations,
                showInAnonymousStats: userProfile.privacySettings.showInAnonymousStats,
                honorGlobalPrivacyControl: userProfile.privacySettings.honorGlobalPrivacyControl,
                consentUpdatedAt: userProfile.privacySettings.consentUpdatedAt ?? Date.now(),
            });
            return;
        }

        applyAnalyticsConsentToGtag(readPrivacySettingsSnapshot());
    }, [userProfile?.privacySettings]);

    useEffect(() => {
        if (!pathname || typeof window === "undefined") {
            return;
        }

        const query = window.location.search;
        const nextPath = query ? `${pathname}${query}` : pathname;
        writeLastVisitedPath(nextPath);
    }, [pathname]);

    return (
        <>
            {shouldTrackDeepAnalytics ? <DeepTracker /> : null}
            {shouldEnablePwaRuntime ? <PwaRuntimeBridge /> : null}
            {isUserShell ? <NotificationRuntimeBridge /> : null}
            {isUserShell ? <TaskGuidanceBanner /> : null}
            <Navbar />
            {children}
            {shouldShowPublicChrome && !isLegalRoute ? <MobileBottomBar /> : null}
            <ScrollToTop />
            <AutoScrollToTop />
            {shouldShowPurchaseUi ? (
                <PayPalProvider>
                    <GlobalPurchaseModal />
                </PayPalProvider>
            ) : null}

            {isUserShell ? <InsufficientBalanceModal /> : null}
            {shouldShowAuthUi ? <GlobalAuthModal /> : null}
            {isUserShell ? <GuidedOnboarding /> : null}
            <Toaster position="top-center" theme="dark" richColors closeButton />
            {shouldShowCookieBanner ? <CookieBanner /> : null}
            {shouldShowDebugBreakpoints ? <DebugBreakpoints /> : null}
        </>
    );
}
