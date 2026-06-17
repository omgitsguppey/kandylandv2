"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const ENABLE_UI_DEBUG_TOOLS = process.env.NEXT_PUBLIC_ENABLE_UI_DEBUG_TOOLS === "1";

export function UIDebug() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (ENABLE_UI_DEBUG_TOOLS && process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
            // Dev audit tools are opt-in because they are heavy on admin smoke sessions.
            import("react").then((React) => {
                import("react-dom").then((ReactDOM) => {
                    import("@axe-core/react").then((axe) => {
                        const runAxe = axe.default as (
                            reactModule: typeof import("react"),
                            reactDomModule: typeof import("react-dom"),
                            delay?: number,
                        ) => void;
                        runAxe(React, ReactDOM, 1000);
                    }).catch(() => {});
                });
            });
        }
    }, []);

    if (!ENABLE_UI_DEBUG_TOOLS || process.env.NODE_ENV === "production" || !mounted) {
        return null;
    }

    return (
        <Script src="https://unpkg.com/react-scan/dist/auto.global.js" strategy="afterInteractive" />
    );
}
