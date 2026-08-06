import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CreatorPublicProfileFrameProps = {
    children: ReactNode;
    className?: string;
    contentClassName?: string;
};

/**
 * Visual-only shell for public creator journeys. Creator data, actions, and
 * state remain owned by the route-level client components.
 */
export function CreatorPublicProfileFrame({
    children,
    className,
    contentClassName,
}: CreatorPublicProfileFrameProps) {
    return (
        <div className={cn("relative isolate overflow-hidden bg-[#08060d] text-white", className)}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-brand-purple/20 blur-3xl" />
                <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
                <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-white/[0.035] to-transparent" />
            </div>
            <div className={cn("relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10", contentClassName)}>
                {children}
            </div>
        </div>
    );
}