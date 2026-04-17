"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function UIDebug() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
            // Initialize axe-core only in development
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

    if (process.env.NODE_ENV === "production" || !mounted) {
        return null;
    }

    return (
        <Script src="https://unpkg.com/react-scan/dist/auto.global.js" strategy="afterInteractive" />
    );
}
