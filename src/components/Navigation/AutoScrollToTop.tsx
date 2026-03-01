"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AutoScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        // Next.js sometimes maintains scroll position between route pushes.
        // This unequivocally forces the exact top of the page on any URL transition.
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

        // A slight timeout catches React hydration delays where elements render post-mount
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }, 50);

        return () => clearTimeout(timer);
    }, [pathname]);

    return null;
}
