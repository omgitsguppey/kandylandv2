"use client";

export default function DropPreviewLoading() {
    return (
        <div className="mx-auto flex min-h-[calc(100dvh_-_var(--root-shell-top-spacing,6rem)_-_var(--user-mobile-bottom-nav-reserved-height,0px))] w-full max-w-5xl flex-col px-3 pb-4 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] sm:px-4 md:px-8 md:pb-8 md:pt-2">
            <div className="mb-3 flex items-center justify-between">
                <div className="h-11 w-24 animate-pulse rounded-full bg-white/8" />
                <div className="h-11 w-11 animate-pulse rounded-full bg-white/8" />
            </div>
            <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] md:items-center md:gap-7">
                <div className="aspect-[4/5] min-h-[21rem] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.04] md:rounded-[2rem]" />
                <div className="space-y-4">
                    <div className="h-36 animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.035]" />
                    <div className="h-16 animate-pulse rounded-[1.2rem] border border-white/10 bg-white/[0.035]" />
                    <div className="h-24 animate-pulse rounded-[1.2rem] border border-white/10 bg-white/[0.035]" />
                </div>
            </div>
        </div>
    );
}
