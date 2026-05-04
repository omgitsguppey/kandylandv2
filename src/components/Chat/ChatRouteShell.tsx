"use client";

import { useEffect } from "react";
import {
    USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT,
    USER_MOBILE_CHAT_VIEWPORT_HEIGHT,
} from "@/lib/user-mobile-shell";

export function ChatRouteShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const documentElement = document.documentElement;
        const body = document.body;
        const main = document.querySelector("main");
        const mainElement = main instanceof HTMLElement ? main : null;
        const compactViewportQuery = window.matchMedia("(max-width: 767px)");
        const visualViewport = window.visualViewport;

        const previousChatViewportHeight = documentElement.style.getPropertyValue("--chat-visual-viewport-height");
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
        let frameId: number | null = null;

        documentElement.style.overflow = "hidden";
        documentElement.style.overscrollBehaviorY = "none";
        body.style.overflow = "hidden";
        body.style.overscrollBehaviorY = "none";

        const syncChatViewportShell = () => {
            frameId = null;
            const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight);
            documentElement.style.setProperty("--chat-visual-viewport-height", `${viewportHeight}px`);

            if (!mainElement) {
                return;
            }

            mainElement.style.boxSizing = "border-box";
            mainElement.style.overflow = "hidden";
            mainElement.style.overscrollBehaviorY = "none";
            mainElement.style.height = USER_MOBILE_CHAT_VIEWPORT_HEIGHT;
            mainElement.style.maxHeight = USER_MOBILE_CHAT_VIEWPORT_HEIGHT;
            mainElement.style.minHeight = "0";
            mainElement.style.paddingBottom = compactViewportQuery.matches
                ? `var(--user-mobile-chat-bottom-reserved-height, ${USER_MOBILE_CHAT_BOTTOM_RESERVED_HEIGHT})`
                : "0px";

            if (window.scrollY !== 0) {
                window.scrollTo(0, 0);
            }
        };

        const scheduleChatViewportShellSync = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            frameId = window.requestAnimationFrame(syncChatViewportShell);
        };

        syncChatViewportShell();
        visualViewport?.addEventListener("resize", scheduleChatViewportShellSync, { passive: true });
        visualViewport?.addEventListener("scroll", scheduleChatViewportShellSync, { passive: true });
        compactViewportQuery.addEventListener("change", scheduleChatViewportShellSync);

        const handleWindowBlur = () => scheduleChatViewportShellSync();
        window.addEventListener("blur", handleWindowBlur, { passive: true });

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            visualViewport?.removeEventListener("resize", scheduleChatViewportShellSync);
            visualViewport?.removeEventListener("scroll", scheduleChatViewportShellSync);
            compactViewportQuery.removeEventListener("change", scheduleChatViewportShellSync);
            window.removeEventListener("blur", handleWindowBlur);

            if (previousChatViewportHeight) {
                documentElement.style.setProperty("--chat-visual-viewport-height", previousChatViewportHeight);
            } else {
                documentElement.style.removeProperty("--chat-visual-viewport-height");
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
            }
        };
    }, []);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none touch-pan-y">
            {children}
        </div>
    );
}
