"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/creative-tim/ui/card";
import { cn } from "@/lib/utils";

interface KandyEditorialReleaseCollectionProps { children: ReactNode; }
export function KandyEditorialReleaseCollection({ children }: KandyEditorialReleaseCollectionProps) {
    return <section data-drops-collection-layout="editorial-release-shelves" data-drops-grid-density="editorial-release" className="grid min-w-0 gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))]">{children}</section>;
}

interface KandyEditorialPromotionInterludeProps { children: ReactNode; }
export function KandyEditorialPromotionInterlude({ children }: KandyEditorialPromotionInterludeProps) {
    return <aside className="h-full min-w-0">{children}</aside>;
}

interface KandyEditorialReleaseSkeletonProps { itemCount?: number; embedded?: boolean; }
export function KandyEditorialReleaseSkeleton({ itemCount = 4, embedded = false }: KandyEditorialReleaseSkeletonProps) {
    return (
        <section aria-label="Loading KandyDrops" aria-busy="true" data-mobile-density="editorial-release" data-mobile-skeleton="drops-editorial-release" className={cn("min-w-0 w-full", !embedded && "mx-auto max-w-7xl px-4 pb-8 pt-[calc(var(--kandy-cookie-offset,0px)+0.5rem)]")}>
            <p role="status" className="sr-only">Loading Drops</p>
            <KandyEditorialReleaseCollection>
                {Array.from({ length: itemCount }, (_, index) => (
                    <Card key={index} className="gap-0 overflow-hidden py-0" aria-hidden="true">
                        <div className="aspect-[4/3] animate-pulse bg-muted motion-reduce:animate-none" />
                        <div className="space-y-3 p-4">
                            <div className="h-5 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                            <div className="h-3 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                            <div className="h-11 w-full animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
                        </div>
                    </Card>
                ))}
            </KandyEditorialReleaseCollection>
        </section>
    );
}
