"use client";

import { useEffect } from "react";

export function ChatRouteShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
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

        documentElement.style.overflow = "hidden";
        documentElement.style.overscrollBehaviorY = "none";
        body.style.overflow = "hidden";
        body.style.overscrollBehaviorY = "none";

        if (mainElement) {
            mainElement.style.overflow = "hidden";
            mainElement.style.overscrollBehaviorY = "none";
        }

        return () => {
            documentElement.style.overflow = previousDocumentOverflow;
            documentElement.style.overscrollBehaviorY = previousDocumentOverscrollY;
            body.style.overflow = previousBodyOverflow;
            body.style.overscrollBehaviorY = previousBodyOverscrollY;

            if (mainElement) {
                mainElement.style.overflow = previousMainOverflow;
                mainElement.style.overscrollBehaviorY = previousMainOverscrollY;
            }
        };
    }, []);

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none touch-pan-y">
            {children}
        </div>
    );
}
