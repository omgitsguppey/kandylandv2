import type { ReactNode } from "react";

import { Card } from "@/components/creative-tim/ui/card";

type CreatorDashboardGlassFrameProps = {
    children: ReactNode;
};

export function CreatorDashboardGlassFrame({ children }: CreatorDashboardGlassFrameProps) {
    return (
        <>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-2 top-4 -z-10 h-48 rounded-full bg-brand-purple/15 blur-3xl"
            />
            <Card className="relative overflow-visible rounded-[28px] border-white/10 bg-[linear-gradient(145deg,rgba(38,24,67,0.9),rgba(12,8,28,0.96))] shadow-[0_24px_80px_rgba(8,4,24,0.38)] !gap-0 !p-0">
                <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">{children}</div>
            </Card>
        </>
    );
}
