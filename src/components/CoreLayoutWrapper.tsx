"use client";

import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { AdminViewAsBanner } from "@/components/Admin/AdminViewAsBanner";
import MobileBottomBar from "@/components/Navigation/MobileBottomBar";
import dynamic from "next/dynamic";
import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useAuthIdentity, useAuthLoading, useUserProfile } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { CLIENT_RUNTIME_STORAGE_KEYS, writeSessionStorageValue } from "@/hooks/client-runtime";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { shouldBypassFanOnboarding } from "@/lib/creator-application";
import { applyAnalyticsConsentToGtag, persistPrivacySettingsSnapshot, readPrivacySettingsSnapshot } from "@/lib/privacy-consent";
import { writeLastVisitedPath } from "@/lib/navigation-persistence";
import { ADMIN_SHELL_ROUTE_CLASS } from "@/lib/admin-shell-spacing";
import {
    USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_TOP_RESERVED_HEIGHT,
} from "@/lib/user-mobile-shell";
import { detectDeviceDisplayMode, isIosStandalonePwa, type DeviceDisplayMode } from "@/lib/device-layout-contract";

const PayPalProvider = dynamic(() => import("@/components/PayPalProvider").then((mod) => mod.PayPalProvider), { ssr: false });
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
const CookieBanner = dynamic(() => import("@/components/CookieBanner"), { ssr: false });

export function CoreLayoutWrapper({ children }: { children: React.ReactNode }) {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();
    const { loading } = useAuthLoading();
    const {
        isAuthModalOpen,
        isInsufficientBalanceModalOpen,
        isPurchaseModalOpen,
    } = useUI();
    const [displayMode, setDisplayMode] = useState<DeviceDisplayMode>("unknown");
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
    const mobileBottomNavReservedHeight = shouldReserveMobileBottomNav
            ? USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT
            : "0px";
    const mobileShellStyle = {
        "--user-mobile-bottom-nav-reserved-height": mobileBottomNavReservedHeight,
        ...(isChatRoute
            ? {
                "--root-shell-top-spacing": USER_MOBILE_CHAT_TOP_RESERVED_HEIGHT,
                "--user-mobile-chat-bottom-reserved-height": USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT,
            }
            : {}),
    } as CSSProperties;
    const shouldLoadOnboarding = isUserShell && userProfile?.onboardingCompleted !== true && !shouldBypassFanOnboarding(userProfile);
    const shouldShowTaskGuidanceBanner = isUserShell && !isChatRoute;
    const criticalLaneReady = true;
    const afterPaintLaneReady = useDeferredClientReady({ delayMs: 120 });
    const idleLaneReady = useDeferredClientReady({ delayMs: 500, idle: true });
    const homepageAfterPaintLaneReady = useDeferredClientReady({
        enabled: isHomeRoute,
        delayMs: 500,
    });
    const homepageIdleLaneReady = useDeferredClientReady({
        enabled: isHomeRoute,
        delayMs: 1200,
        idle: true,
    });
    const homepageOverlayLaneReady = useDeferredClientReady({
        enabled: isHomeRoute,
        delayMs: 2400,
        idle: true,
    });
    const interactionOpenedLaneReady = afterPaintLaneReady || isAuthModalOpen || isPurchaseModalOpen || isInsufficientBalanceModalOpen;
    const diagnosticsReady = isHomeRoute ? homepageAfterPaintLaneReady : afterPaintLaneReady;
    const telemetryReady = isHomeRoute ? homepageIdleLaneReady : afterPaintLaneReady;
    const enhancementReady = isHomeRoute ? homepageIdleLaneReady : idleLaneReady;
    const overlayReady = isHomeRoute ? homepageOverlayLaneReady : telemetryReady;
    const afterPaintReady = afterPaintLaneReady;
    const idleReady = idleLaneReady;
    const interactiveOverlayReady = overlayReady;
    const hydrationPriorityLanes = {
        critical: criticalLaneReady,
        afterPaint: afterPaintReady,
        idle: idleReady,
        interactionOpened: interactionOpenedLaneReady,
        interactiveOverlay: interactiveOverlayReady,
        adminOnly: isAdminRoute,
        routeOnly: Boolean(pathname),
    };
    const scrollControlsReady = !isHomeRoute || homepageAfterPaintLaneReady;

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

    useEffect(() => {
        setDisplayMode(detectDeviceDisplayMode());
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const root = document.documentElement;
        const syncIosPwaNavOffset = () => {
            if (!isIosStandalonePwa()) {
                if (root.getAttribute("data-platform-shell") === "ios-pwa") {
                    root.removeAttribute("data-platform-shell");
                }
                root.style.removeProperty("--kd-mobile-bottom-nav-bottom-offset");
                return;
            }

            root.setAttribute("data-platform-shell", "ios-pwa");
            const visualHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
            const safeBottom = Math.max(0, Math.round(window.innerHeight - visualHeight));
            root.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", `${safeBottom}px`);
        };

        const visualViewport = window.visualViewport;
        let frame: number | null = null;
        const scheduleSync = () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
            frame = window.requestAnimationFrame(syncIosPwaNavOffset);
        };

        scheduleSync();
        visualViewport?.addEventListener("resize", scheduleSync, { passive: true });
        visualViewport?.addEventListener("scroll", scheduleSync, { passive: true });
        window.addEventListener("orientationchange", scheduleSync, { passive: true });

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
            visualViewport?.removeEventListener("resize", scheduleSync);
            visualViewport?.removeEventListener("scroll", scheduleSync);
            window.removeEventListener("orientationchange", scheduleSync);
        };
    }, []);

    const routedChildren = isAdminRoute ? (
        <div
            className={ADMIN_SHELL_ROUTE_CLASS}
            data-admin-shell-route="true"
            data-device-layout-contract="true"
            data-display-mode={displayMode}
            data-hydration-lane="critical"
            data-hydration-after-paint-ready={hydrationPriorityLanes.afterPaint ? "true" : "false"}
            data-hydration-idle-ready={hydrationPriorityLanes.idle ? "true" : "false"}
            data-client-hydration-optimized="true"
            data-telemetry-critical-path="connected"
            data-privacy-consent-hydration="preserved"
            style={mobileShellStyle}
        >
            {children}
        </div>
    ) : (
        <div
            className="flex min-h-0 flex-1 flex-col"
            data-device-layout-contract="true"
            data-display-mode={displayMode}
            data-hydration-lane="critical"
            data-hydration-after-paint-ready={hydrationPriorityLanes.afterPaint ? "true" : "false"}
            data-hydration-idle-ready={hydrationPriorityLanes.idle ? "true" : "false"}
            data-client-hydration-optimized="true"
            data-telemetry-critical-path="connected"
            data-privacy-consent-hydration="preserved"
            data-user-mobile-shell-route={isChatRoute ? "chat-owned" : shouldReserveMobileBottomNav ? "reserved" : "none"}
            style={mobileShellStyle}
        >
            {children}
        </div>
    );

    return (
        <>
            <Navbar />
            <AdminViewAsBanner />
            {routedChildren}
            {shouldShowPublicChrome && !isLegalRoute ? <MobileBottomBar /> : null}
            {scrollControlsReady ? <div className="contents" data-hydration-lane="after-paint"><ScrollToTop /></div> : null}
            {afterPaintLaneReady ? <div className="contents" data-hydration-lane="after-paint"><AutoScrollToTop /></div> : null}
            {diagnosticsReady ? <div className="contents" data-hydration-lane="after-paint"><ClientDiagnosticsBridge /></div> : null}
            {telemetryReady && shouldTrackDeepAnalytics ? <div className="contents" data-hydration-lane="after-paint"><DeepTracker /></div> : null}
            {telemetryReady && isUserShell ? <div className="contents" data-hydration-lane="after-paint"><NotificationRuntimeBridge /></div> : null}
            {telemetryReady && shouldShowTaskGuidanceBanner ? <div className="contents" data-hydration-lane="after-paint"><TaskGuidanceBanner /></div> : null}
            {enhancementReady && shouldEnablePwaRuntime ? <div className="contents" data-hydration-lane="idle"><PwaRuntimeBridge /></div> : null}
            {hydrationPriorityLanes.interactiveOverlay && shouldShowBugReportTrigger ? <div className="contents" data-hydration-lane="idle"><GlobalBugReportTrigger /></div> : null}
            {interactionOpenedLaneReady && shouldShowPurchaseUi && isPurchaseModalOpen ? (
                <div className="contents" data-hydration-lane="interaction-opened">
                    <PayPalProvider>
                        <GlobalPurchaseModal />
                    </PayPalProvider>
                </div>
            ) : null}
            {interactionOpenedLaneReady && isUserShell && isInsufficientBalanceModalOpen ? <div className="contents" data-hydration-lane="interaction-opened"><InsufficientBalanceModal /></div> : null}
            {interactionOpenedLaneReady && shouldShowAuthUi && isAuthModalOpen ? <div className="contents" data-hydration-lane="interaction-opened"><GlobalAuthModal /></div> : null}
            {enhancementReady && shouldLoadOnboarding ? <div className="contents" data-hydration-lane="idle"><GuidedOnboarding /></div> : null}
            <Toaster position="top-center" theme="dark" richColors closeButton />
            {hydrationPriorityLanes.interactiveOverlay && shouldShowCookieBanner ? <div className="contents" data-hydration-lane="idle"><CookieBanner /></div> : null}
            {telemetryReady && shouldShowDebugBreakpoints ? <div className="contents" data-hydration-lane="after-paint"><DebugBreakpoints /></div> : null}
        </>
    );
}
