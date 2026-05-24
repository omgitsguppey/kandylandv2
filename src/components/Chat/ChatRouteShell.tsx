"use client";

import { useEffect } from "react";
import {
    USER_MOBILE_CHAT_ANDROID_PWA_BOTTOM_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_ANDROID_PWA_VIEWPORT_SHELL_HEIGHT,
    USER_MOBILE_CHAT_IOS_PWA_BOTTOM_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_IOS_PWA_VIEWPORT_SHELL_HEIGHT,
    USER_MOBILE_CHAT_VIEWPORT_HEIGHT,
} from "@/lib/user-mobile-shell";
import { DEVICE_VIEWPORT_QUERIES, isAndroidStandalonePwa, isIosStandalonePwa } from "@/lib/device-layout-contract";

export function ChatRouteShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const documentElement = document.documentElement;
        const body = document.body;
        const main = document.querySelector("main");
        const mainElement = main instanceof HTMLElement ? main : null;
        const compactViewportQuery = window.matchMedia(DEVICE_VIEWPORT_QUERIES.compact);
        const visualViewport = window.visualViewport;
        const androidPwa = isAndroidStandalonePwa();
        const iosPwa = isIosStandalonePwa();
        const iosPwaShell = iosPwa && !androidPwa;

        const previousChatViewportHeight = documentElement.style.getPropertyValue("--chat-visual-viewport-height");
        const previousAndroidPwaVisualHeight = documentElement.style.getPropertyValue("--kd-android-pwa-visual-height");
        const previousAndroidPwaBottomNavHeight = documentElement.style.getPropertyValue("--kd-android-pwa-bottom-nav-height");
        const previousAndroidPwaBottomSafePadding = documentElement.style.getPropertyValue("--kd-android-pwa-bottom-safe-padding");
        const previousIosPwaVisualHeight = documentElement.style.getPropertyValue("--kd-ios-pwa-visual-height");
        const previousIosPwaBottomNavY = documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-y");
        const previousIosPwaBottomNavHeight = documentElement.style.getPropertyValue("--kd-ios-pwa-bottom-nav-height");
        const previousIosPwaSafeBottom = documentElement.style.getPropertyValue("--kd-ios-pwa-safe-bottom");
        const previousIosPwaChatBottomGap = documentElement.style.getPropertyValue("--kd-ios-pwa-chat-bottom-gap");
        const previousIosPwaShellLift = documentElement.style.getPropertyValue("--kd-ios-pwa-shell-lift");
        const previousMobileBottomNavOffset = documentElement.style.getPropertyValue("--kd-mobile-bottom-nav-bottom-offset");
        const previousPlatformShell = documentElement.getAttribute("data-platform-shell");
        const previousDocumentOverflow = documentElement.style.overflow;
        const previousDocumentOverscrollY = documentElement.style.overscrollBehaviorY;
        const previousBodyOverflow = body.style.overflow;
        const previousBodyOverscrollY = body.style.overscrollBehaviorY;
        const previousMainOverflow = mainElement?.style.overflow ?? "";
        const previousMainOverscrollY = mainElement?.style.overscrollBehaviorY ?? "";
        const previousMainHeight = mainElement?.style.height ?? "";
        const previousMainMaxHeight = mainElement?.style.maxHeight ?? "";
        const previousMainMinHeight = mainElement?.style.minHeight ?? "";
        const previousMainBoxSizing = mainElement?.style.boxSizing ?? "";
        const previousMainPaddingBottom = mainElement?.style.paddingBottom ?? "";
        const previousMainChatBottomReservedHeight = mainElement?.style.getPropertyValue("--user-mobile-chat-bottom-reserved-height") ?? "";
        let frameId: number | null = null;
        let debounceTimer: number | null = null;

        if (androidPwa) {
            documentElement.setAttribute("data-platform-shell", "android-pwa");
        } else if (iosPwaShell) {
            documentElement.setAttribute("data-platform-shell", "ios-pwa");
        }

        documentElement.style.overflow = "hidden";
        documentElement.style.overscrollBehaviorY = "none";
        body.style.overflow = "hidden";
        body.style.overscrollBehaviorY = "none";

        const syncChatViewportShell = () => {
            frameId = null;
            const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight);
            documentElement.style.setProperty("--chat-visual-viewport-height", `${viewportHeight}px`);
            if (androidPwa) {
                const bottomNav = document.querySelector('nav[aria-label="Mobile navigation"]');
                const bottomNavElement = bottomNav instanceof HTMLElement ? bottomNav : null;
                const bottomNavRect = bottomNavElement?.getBoundingClientRect() ?? null;
                const bottomNavOverlayHeight = bottomNavRect
                    ? Math.max(0, Math.round(viewportHeight - bottomNavRect.top))
                    : 0;
                const bottomNavHeight = Math.max(0, bottomNavOverlayHeight);

                documentElement.style.setProperty("--kd-android-pwa-visual-height", `${viewportHeight}px`);
                documentElement.style.setProperty("--kd-android-pwa-bottom-nav-height", `${bottomNavHeight}px`);
                documentElement.style.setProperty("--kd-android-pwa-bottom-safe-padding", "12px");
            } else if (iosPwaShell) {
                const bottomNav = document.querySelector('nav[aria-label="Mobile navigation"]');
                const bottomNavElement = bottomNav instanceof HTMLElement ? bottomNav : null;
                const bottomNavRect = bottomNavElement?.getBoundingClientRect() ?? null;
                const navGap = 8;
                const bottomNavHeight = bottomNavRect ? Math.max(0, Math.round(bottomNavRect.height)) : 56;
                const viewportBottom = viewportHeight;
                const safeBottom = Math.max(0, Math.round(window.innerHeight - viewportHeight));
                const navBottomOffset = Math.max(0, viewportBottom - (bottomNavRect?.bottom ?? viewportBottom - navGap));

                documentElement.style.setProperty("--kd-ios-pwa-visual-height", `${viewportHeight}px`);
                documentElement.style.setProperty("--kd-ios-pwa-bottom-nav-height", `${bottomNavHeight}px`);
                documentElement.style.setProperty("--kd-ios-pwa-safe-bottom", `${safeBottom}px`);
                documentElement.style.setProperty("--kd-ios-pwa-bottom-nav-y", `${navBottomOffset}px`);
                documentElement.style.setProperty("--kd-ios-pwa-chat-bottom-gap", "10px");
                documentElement.style.setProperty("--kd-ios-pwa-shell-lift", "6px");
                documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", `${navBottomOffset}px`);
            }

            if (!mainElement) {
                return;
            }

            mainElement.style.boxSizing = "border-box";
            mainElement.style.overflow = "hidden";
            mainElement.style.overscrollBehaviorY = "none";
            mainElement.style.height = androidPwa
                ? USER_MOBILE_CHAT_ANDROID_PWA_VIEWPORT_SHELL_HEIGHT
                : iosPwaShell
                    ? USER_MOBILE_CHAT_IOS_PWA_VIEWPORT_SHELL_HEIGHT
                    : USER_MOBILE_CHAT_VIEWPORT_HEIGHT;
            mainElement.style.maxHeight = androidPwa
                ? USER_MOBILE_CHAT_ANDROID_PWA_VIEWPORT_SHELL_HEIGHT
                : iosPwaShell
                    ? USER_MOBILE_CHAT_IOS_PWA_VIEWPORT_SHELL_HEIGHT
                    : USER_MOBILE_CHAT_VIEWPORT_HEIGHT;
            mainElement.style.minHeight = "0";
            if (androidPwa) {
                mainElement.style.setProperty("--user-mobile-chat-bottom-reserved-height", USER_MOBILE_CHAT_ANDROID_PWA_BOTTOM_RESERVED_HEIGHT);
                mainElement.style.paddingBottom = USER_MOBILE_CHAT_ANDROID_PWA_BOTTOM_RESERVED_HEIGHT;
            } else if (iosPwaShell) {
                mainElement.style.setProperty("--user-mobile-chat-bottom-reserved-height", USER_MOBILE_CHAT_IOS_PWA_BOTTOM_RESERVED_HEIGHT);
                mainElement.style.paddingBottom = USER_MOBILE_CHAT_IOS_PWA_BOTTOM_RESERVED_HEIGHT;
            } else {
                mainElement.style.paddingBottom = "var(--user-mobile-chat-bottom-reserved-height, 0px)";
            }

            if (window.scrollY !== 0) {
                window.scrollTo(0, 0);
            }
        };

        const scheduleChatViewportShellSync = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            if (debounceTimer !== null) {
                window.clearTimeout(debounceTimer);
            }
            debounceTimer = window.setTimeout(() => {
                frameId = window.requestAnimationFrame(syncChatViewportShell);
            }, 60);
        };

        syncChatViewportShell();
        visualViewport?.addEventListener("resize", scheduleChatViewportShellSync, { passive: true });
        visualViewport?.addEventListener("scroll", scheduleChatViewportShellSync, { passive: true });
        compactViewportQuery.addEventListener("change", scheduleChatViewportShellSync);
        window.addEventListener("orientationchange", scheduleChatViewportShellSync, { passive: true });

        const handleWindowBlur = () => scheduleChatViewportShellSync();
        window.addEventListener("blur", handleWindowBlur, { passive: true });

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            if (debounceTimer !== null) {
                window.clearTimeout(debounceTimer);
            }
            visualViewport?.removeEventListener("resize", scheduleChatViewportShellSync);
            visualViewport?.removeEventListener("scroll", scheduleChatViewportShellSync);
            compactViewportQuery.removeEventListener("change", scheduleChatViewportShellSync);
            window.removeEventListener("orientationchange", scheduleChatViewportShellSync);
            window.removeEventListener("blur", handleWindowBlur);

            if (previousChatViewportHeight) {
                documentElement.style.setProperty("--chat-visual-viewport-height", previousChatViewportHeight);
            } else {
                documentElement.style.removeProperty("--chat-visual-viewport-height");
            }
            if (previousAndroidPwaVisualHeight) {
                documentElement.style.setProperty("--kd-android-pwa-visual-height", previousAndroidPwaVisualHeight);
            } else {
                documentElement.style.removeProperty("--kd-android-pwa-visual-height");
            }
            if (previousAndroidPwaBottomNavHeight) {
                documentElement.style.setProperty("--kd-android-pwa-bottom-nav-height", previousAndroidPwaBottomNavHeight);
            } else {
                documentElement.style.removeProperty("--kd-android-pwa-bottom-nav-height");
            }
            if (previousAndroidPwaBottomSafePadding) {
                documentElement.style.setProperty("--kd-android-pwa-bottom-safe-padding", previousAndroidPwaBottomSafePadding);
            } else {
                documentElement.style.removeProperty("--kd-android-pwa-bottom-safe-padding");
            }
            if (previousIosPwaVisualHeight) {
                documentElement.style.setProperty("--kd-ios-pwa-visual-height", previousIosPwaVisualHeight);
            } else {
                documentElement.style.removeProperty("--kd-ios-pwa-visual-height");
            }
            if (previousIosPwaBottomNavY) {
                documentElement.style.setProperty("--kd-ios-pwa-bottom-nav-y", previousIosPwaBottomNavY);
            } else {
                documentElement.style.removeProperty("--kd-ios-pwa-bottom-nav-y");
            }
            if (previousIosPwaBottomNavHeight) {
                documentElement.style.setProperty("--kd-ios-pwa-bottom-nav-height", previousIosPwaBottomNavHeight);
            } else {
                documentElement.style.removeProperty("--kd-ios-pwa-bottom-nav-height");
            }
            if (previousIosPwaSafeBottom) {
                documentElement.style.setProperty("--kd-ios-pwa-safe-bottom", previousIosPwaSafeBottom);
            } else {
                documentElement.style.removeProperty("--kd-ios-pwa-safe-bottom");
            }
            if (previousIosPwaChatBottomGap) {
                documentElement.style.setProperty("--kd-ios-pwa-chat-bottom-gap", previousIosPwaChatBottomGap);
            } else {
                documentElement.style.removeProperty("--kd-ios-pwa-chat-bottom-gap");
            }
            if (previousIosPwaShellLift) {
                documentElement.style.setProperty("--kd-ios-pwa-shell-lift", previousIosPwaShellLift);
            } else {
                documentElement.style.removeProperty("--kd-ios-pwa-shell-lift");
            }
            if (previousMobileBottomNavOffset) {
                documentElement.style.setProperty("--kd-mobile-bottom-nav-bottom-offset", previousMobileBottomNavOffset);
            } else {
                documentElement.style.removeProperty("--kd-mobile-bottom-nav-bottom-offset");
            }
            if (previousPlatformShell) {
                documentElement.setAttribute("data-platform-shell", previousPlatformShell);
            } else {
                documentElement.removeAttribute("data-platform-shell");
            }
            documentElement.style.overflow = previousDocumentOverflow;
            documentElement.style.overscrollBehaviorY = previousDocumentOverscrollY;
            body.style.overflow = previousBodyOverflow;
            body.style.overscrollBehaviorY = previousBodyOverscrollY;

            if (mainElement) {
                mainElement.style.overflow = previousMainOverflow;
                mainElement.style.overscrollBehaviorY = previousMainOverscrollY;
                mainElement.style.height = previousMainHeight;
                mainElement.style.maxHeight = previousMainMaxHeight;
                mainElement.style.minHeight = previousMainMinHeight;
                mainElement.style.boxSizing = previousMainBoxSizing;
                mainElement.style.paddingBottom = previousMainPaddingBottom;
                if (previousMainChatBottomReservedHeight) {
                    mainElement.style.setProperty("--user-mobile-chat-bottom-reserved-height", previousMainChatBottomReservedHeight);
                } else {
                    mainElement.style.removeProperty("--user-mobile-chat-bottom-reserved-height");
                }
            }
        };
    }, []);

    return (
        <div
            className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none touch-pan-y"
            data-chat-platform-shell={isIosStandalonePwa() ? "ios-pwa" : isAndroidStandalonePwa() ? "android-pwa" : "default"}
        >
            {children}
        </div>
    );
}
