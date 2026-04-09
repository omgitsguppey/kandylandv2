"use client";

import { PayPalProvider } from "@/components/PayPalProvider";
import { Toaster } from "sonner";
import CookieBanner from "@/components/CookieBanner";
import { Navbar } from "@/components/Navbar";
import MobileBottomBar from "@/components/Navigation/MobileBottomBar";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CLIENT_RUNTIME_STORAGE_KEYS, writeSessionStorageValue } from "@/hooks/client-runtime";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { shouldBypassFanOnboarding } from "@/lib/creator-application";
import { applyAnalyticsConsentToGtag, persistPrivacySettingsSnapshot, readPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { writeLastVisitedPath } from "@/lib/navigation-persistence";

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
const ClientDiagnosticsBridge = dynamic(
    () => import("@/components/ClientDiagnosticsBridge").then((mod) => mod.ClientDiagnosticsBridge),
    { ssr: false },
);
const GlobalBugReportTrigger = dynamic(
    () => import("@/components/Feedback/GlobalBugReportTrigger").then((mod) => mod.GlobalBugReportTrigger),
    { ssr: false },
);

export function CoreLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading } = useAuth();
    const {
        isAuthModalOpen,
        isInsufficientBalanceModalOpen,
        isPurchaseModalOpen,
    } = useUI();
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith("/admin") ?? false;
    const isLegalRoute = pathname === "/privacy" || pathname === "/terms";
    const authSettled = !loading;
    const isUserShell = authSettled && Boolean(user) && userProfile?.role !== "admin" && !isAdminRoute;
    const shouldShowPublicChrome = !isAdminRoute;
    const shouldShowBugReportTrigger = !isLegalRoute;
    const shouldShowPurchaseUi = !isAdminRoute;
    const shouldShowAuthUi = !isAdminRoute;
    const shouldShowCookieBanner = !isAdminRoute;
    const shouldShowDebugBreakpoints = process.env.NODE_ENV !== "production";
    const shouldTrackDeepAnalytics = true;
    const shouldEnablePwaRuntime = !isAdminRoute;
    const shouldLoadOnboarding = isUserShell && userProfile?.onboardingCompleted !== true && !shouldBypassFanOnboarding(userProfile);
    const runtimeReady = useDeferredClientReady();
    const afterPaintReady = useDeferredClientReady({ delayMs: 180 });
    const idleReady = useDeferredClientReady({ delayMs: 500, idle: true });

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
                writeSessionStorageValue(CLIENT_RUNTIME_STORAGE_KEYS.referralCode, refCode);
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
        writeLastVisitedPath(nextPath, user?.uid ?? null);
    }, [pathname, user?.uid]);

    return (
        <>
            <Navbar />
            {children}
            {shouldShowPublicChrome && !isLegalRoute ? <MobileBottomBar /> : null}
            <ScrollToTop />
            <AutoScrollToTop />
            {runtimeReady ? <ClientDiagnosticsBridge /> : null}
            {afterPaintReady && shouldTrackDeepAnalytics ? <DeepTracker /> : null}
            {afterPaintReady && isUserShell ? <NotificationRuntimeBridge /> : null}
            {afterPaintReady && isUserShell ? <TaskGuidanceBanner /> : null}
            {idleReady && shouldEnablePwaRuntime ? <PwaRuntimeBridge /> : null}
            {idleReady && shouldShowBugReportTrigger ? <GlobalBugReportTrigger /> : null}
            {afterPaintReady && shouldShowPurchaseUi && isPurchaseModalOpen ? (
                <PayPalProvider>
                    <GlobalPurchaseModal />
                </PayPalProvider>
            ) : null}
            {afterPaintReady && isUserShell && isInsufficientBalanceModalOpen ? <InsufficientBalanceModal /> : null}
            {afterPaintReady && shouldShowAuthUi && isAuthModalOpen ? <GlobalAuthModal /> : null}
            {idleReady && shouldLoadOnboarding ? <GuidedOnboarding /> : null}
            <Toaster position="top-center" theme="dark" richColors closeButton />
            {afterPaintReady && shouldShowCookieBanner ? <CookieBanner /> : null}
            {afterPaintReady && shouldShowDebugBreakpoints ? <DebugBreakpoints /> : null}
        </>
    );
}
