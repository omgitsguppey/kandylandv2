import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CreatorStudioCanvasProps = {
    children: ReactNode;
    className?: string;
};

export function CreatorStudioCanvas({ children, className }: CreatorStudioCanvasProps) {
    return (
        <div className={cn("relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0816]/90 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl", className)} data-creator-studio-canvas="soft-ui-kandy">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-purple/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-40 h-80 w-80 rounded-full bg-brand-pink/10 blur-3xl" />
            <div className="relative p-3 sm:p-5">{children}</div>
        </div>
    );
}
