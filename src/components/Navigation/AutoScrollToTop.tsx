"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { recordClientDiagnostic } from "@/lib/client-diagnostics";

export function AutoScrollToTop() {
    const pathname = usePathname();
    const previousPathnameRef = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname) {
            return;
        }

        if (previousPathnameRef.current === null) {
            previousPathnameRef.current = pathname;
            return;
        }

        if (previousPathnameRef.current === pathname) {
            return;
        }

        const previousPathname = previousPathnameRef.current;
        previousPathnameRef.current = pathname;

        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        const frame = window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        });

        if (pathname === "/") {
            recordClientDiagnostic("ui", "Homepage scroll reset executed", {
                surface: "home",
                previousPathname,
                pathname,
                qualityLabel: "live",
            });
        }

        return () => window.cancelAnimationFrame(frame);
    }, [pathname]);

    return null;
}
