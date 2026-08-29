"use client";

import type { ReactNode } from "react";

interface KandyEditorialReleaseCollectionProps {
    children: ReactNode;
}

export function KandyEditorialReleaseCollection({ children }: KandyEditorialReleaseCollectionProps) {
    return (
        <section
            data-drops-collection-layout="editorial-release-shelves"
            data-drops-grid-density="editorial-release"
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6"
        >
            {children}
        </section>
    );
}

interface KandyEditorialPromotionInterludeProps {
    children: ReactNode;
}

export function KandyEditorialPromotionInterlude({ children }: KandyEditorialPromotionInterludeProps) {
    return (
        <aside className="h-full min-w-0">{children}</aside>
    );
}

interface KandyEditorialReleaseSkeletonProps {
    itemCount?: number;
}

export function KandyEditorialReleaseSkeleton({ itemCount = 4 }: KandyEditorialReleaseSkeletonProps) {
    return (
        <section
            aria-label="Loading live KandyDrops"
            data-mobile-density="editorial-release"
            data-mobile-skeleton="drops-editorial-release"
            className="mx-auto w-full max-w-7xl px-3 pb-5 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] sm:px-4 md:px-8 md:pb-8 md:pt-2"
        >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
                {Array.from({ length: itemCount }, (_, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border border-white/8 bg-[#121214]">
                        <div className="aspect-[4/3] animate-pulse bg-white/[0.055]" />
                        <div className="space-y-3 p-3 sm:p-4">
                            <div className="h-2.5 w-20 animate-pulse rounded-full bg-brand-purple/20" />
                            <div className="h-5 w-4/5 animate-pulse rounded-lg bg-white/[0.1]" />
                            <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.055]" />
                            <div className="h-10 w-full animate-pulse rounded-xl bg-white/[0.06]" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
