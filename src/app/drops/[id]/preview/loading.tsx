"use client";

import { Card } from "@/components/creative-tim/ui/card";

export default function DropPreviewLoading() {
    return (
        <div
            className="relative isolate mx-auto flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px))] w-full max-w-5xl flex-col overflow-x-clip px-3 pb-4 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] sm:px-4 md:px-8 md:pb-8 md:pt-2"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-skeleton="drop-preview-route"
        >
            <div className="relative z-10 mb-4 flex items-center justify-between">
                <div className="h-11 w-24 animate-pulse rounded-full border border-white/10 bg-black/35" />
                <div className="h-11 w-11 animate-pulse rounded-full border border-white/10 bg-black/35" />
            </div>
            <div className="relative z-10 grid flex-1 gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] md:items-center md:gap-8">
                <Card className="aspect-[4/5] min-h-[16rem] animate-pulse !gap-0 !rounded-[1.6rem] !border-white/10 !bg-white/[0.045] !p-0 shadow-[0_28px_90px_rgba(0,0,0,0.4)] md:min-h-[20rem] md:!rounded-[2rem]" />
                <div className="space-y-3 md:space-y-4">
                    <Card className="h-28 animate-pulse !gap-0 !rounded-[1.25rem] !border-white/10 !bg-white/[0.045] !p-0 shadow-[0_18px_54px_rgba(0,0,0,0.18)] md:h-36 md:!rounded-[1.35rem]" />
                    <Card className="h-16 animate-pulse !gap-0 !rounded-[1.2rem] !border-white/10 !bg-white/[0.045] !p-0" />
                    <Card className="h-20 animate-pulse !gap-0 !rounded-[1.2rem] !border-white/10 !bg-white/[0.045] !p-0 md:h-24" />
                </div>
            </div>
        </div>
    );
}
