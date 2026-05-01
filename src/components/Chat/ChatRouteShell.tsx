"use client";

import { useEffect } from "react";
export function ChatRouteShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
// Early return removed to ensure mobile viewport is also locked for stable app-like behavior.

        const documentElement = document.documentElement;
        const body = document.body;
        const main = document.querySelector("main");
        const mainElement = main instanceof HTMLElement ? main : null;

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

        documentElement.style.overflow = "hidden";
        documentElement.style.overscrollBehaviorY = "none";
        body.style.overflow = "hidden";
        body.style.overscrollBehaviorY = "none";

        if (mainElement) {
            mainElement.style.boxSizing = "border-box";
            mainElement.style.overflow = "hidden";
            mainElement.style.overscrollBehaviorY = "none";
            mainElement.style.height = "100dvh";
            mainElement.style.maxHeight = "100dvh";
            mainElement.style.minHeight = "0";
            mainElement.style.paddingBottom = "0px";
        }

        return () => {
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
