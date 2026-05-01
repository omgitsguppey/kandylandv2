"use client";

import { PayPalProvider } from "@/components/PayPalProvider";
import { Toaster } from "sonner";
import CookieBanner from "@/components/CookieBanner";
import { Navbar } from "@/components/Navbar";
import MobileBottomBar from "@/components/Navigation/MobileBottomBar";
import dynamic from "next/dynamic";
import { useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useAuthIdentity, useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CLIENT_RUNTIME_STORAGE_KEYS, writeSessionStorageValue } from "@/hooks/client-runtime";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { shouldBypassFanOnboarding } from "@/lib/creator-application";
import { applyAnalyticsConsentToGtag, persistPrivacySettingsSnapshot, readPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { writeLastVisitedPath } from "@/lib/navigation-persistence";
import { ADMIN_SHELL_ROUTE_CLASS } from "@/lib/admin-shell-spacing";
import { USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT } from "@/lib/user-mobile-shell";

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
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { loading } = useAuthLoading();
    const {
        isAuthModalOpen,
        isInsufficientBalanceModalOpen,
        isPurchaseModalOpen,
    } = useUI();
    const pathname = usePathname();
    const isHomeRoute = pathname === "/";
    const isAdminRoute = pathname?.startsWith("/admin") ?? false;
    const isLegalRoute = pathname === "/privacy" || pathname === "/terms";
    const authSettled = !loading;
    const isUserShell = authSettled && Boolean(user) && userProfile?.role !== "admin" && !isAdminRoute;
    const shouldShowPublicChrome = !isAdminRoute;
    const shouldShowBugReportTrigger = !isLegalRoute;
    const shouldShowPurchaseUi = !isAdminRoute;
    const shouldShowAuthUi = !isAdminRoute;
    const shouldShowCookieBanner = !isAdminRoute;
    const isChatRoute = pathname?.startsWith("/dashboard/chat") ?? false;
    const shouldShowDebugBreakpoints = process.env.NODE_ENV !== "production";
    const shouldTrackDeepAnalytics = true;
    const shouldEnablePwaRuntime = !isAdminRoute;
    const shouldReserveMobileBottomNav = shouldShowPublicChrome && !isLegalRoute && !isChatRoute;
    const mobileShellStyle = {
        "--user-mobile-bottom-nav-reserved-height": shouldReserveMobileBottomNav
            ? USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT
            : "0px",
    } as CSSProperties;
    const shouldLoadOnboarding = isUserShell && userProfile?.onboardingCompleted !== true && !shouldBypassFanOnboarding(userProfile);
    const shouldShowTaskGuidanceBanner = isUserShell && !isChatRoute;
    const runtimeReady = useDeferredClientReady();
    const afterPaintReady = useDeferredClientReady({ delayMs: 180 });
    const idleReady = useDeferredClientReady({ delayMs: 500, idle: true });
    const homepageAfterPaintReady = useDeferredClientReady({
        enabled: isHomeRoute,
        delayMs: 700,
    });
    const homepageIdleReady = useDeferredClientReady({
        enabled: isHomeRoute,
        delayMs: 1400,
        idle: true,
    });
    const homepageOverlayReady = useDeferredClientReady({
        enabled: isHomeRoute,
        delayMs: 3600,
        idle: true,
    });
    const diagnosticsReady = isHomeRoute ? homepageAfterPaintReady : runtimeReady;
    const telemetryReady = afterPaintReady;
    const enhancementReady = isHomeRoute ? homepageIdleReady : idleReady;
    const overlayReady = isHomeRoute ? homepageOverlayReady : telemetryReady;
    const scrollControlsReady = !isHomeRoute || homepageAfterPaintReady;

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

    const routedChildren = isAdminRoute ? (
        <div className={ADMIN_SHELL_ROUTE_CLASS} data-admin-shell-route="true" style={mobileShellStyle}>
            {children}
        </div>
    ) : (
        <div
            className="flex min-h-0 flex-1 flex-col"
            data-user-mobile-shell-route={shouldReserveMobileBottomNav ? "reserved" : "none"}
            style={mobileShellStyle}
        >
            {children}
        </div>
    );

    return (
        <>
            <Navbar />
            {routedChildren}
            {shouldShowPublicChrome && !isLegalRoute ? <MobileBottomBar /> : null}
            {scrollControlsReady ? <ScrollToTop /> : null}
            <AutoScrollToTop />
            {diagnosticsReady ? <ClientDiagnosticsBridge /> : null}
            {telemetryReady && shouldTrackDeepAnalytics ? <DeepTracker /> : null}
            {telemetryReady && isUserShell ? <NotificationRuntimeBridge /> : null}
            {telemetryReady && shouldShowTaskGuidanceBanner ? <TaskGuidanceBanner /> : null}
            {enhancementReady && shouldEnablePwaRuntime ? <PwaRuntimeBridge /> : null}
            {overlayReady && shouldShowBugReportTrigger ? <GlobalBugReportTrigger /> : null}
            {telemetryReady && shouldShowPurchaseUi && isPurchaseModalOpen ? (
                <PayPalProvider>
                    <GlobalPurchaseModal />
                </PayPalProvider>
            ) : null}
            {telemetryReady && isUserShell && isInsufficientBalanceModalOpen ? <InsufficientBalanceModal /> : null}
            {telemetryReady && shouldShowAuthUi && isAuthModalOpen ? <GlobalAuthModal /> : null}
            {enhancementReady && shouldLoadOnboarding ? <GuidedOnboarding /> : null}
            <Toaster position="top-center" theme="dark" richColors closeButton />
            {overlayReady && shouldShowCookieBanner ? <CookieBanner /> : null}
            {telemetryReady && shouldShowDebugBreakpoints ? <DebugBreakpoints /> : null}
        </>
    );
}
