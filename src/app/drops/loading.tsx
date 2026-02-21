"use client";

import { CandyOutlineIcon as Loader2 } from "@/components/ui/Icon";


export default function DropsLoading() {
    return (
        <main className="min-h-screen bg-black pt-24 md:pt-32 px-4 md:px-8 max-w-7xl mx-auto pb-24">
            {/* Page Header Skeleton */}
            <div className="mb-12 md:mb-16 flex flex-col items-center text-center">
                <div className="h-10 md:h-16 w-64 md:w-96 bg-white/5 rounded-2xl mb-4" />
                <div className="h-4 md:h-6 w-48 md:w-64 bg-white/5 rounded-xl" />
            </div>

            {/* Sticky Filter Bar Skeleton */}
            <div className="sticky top-20 z-40 py-4 mb-8">
                <div className="glass-panel p-2 rounded-2xl flex flex-col md:flex-row gap-4 border border-white/5">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 w-24 bg-white/5 rounded-xl shrink-0" />
                        ))}
                    </div>
                    <div className="h-10 w-full md:w-64 bg-white/5 rounded-xl" />
                </div>
            </div>

            {/* Grid Skeleton */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-8 px-4 md:px-0">
                    <div className="h-8 w-48 bg-white/5 rounded-lg" />
                    <div className="h-4 w-20 bg-white/5 rounded-lg" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 min-h-[350px]">
                            <div className="aspect-square bg-white/5 rounded-xl md:rounded-2xl mb-4" />
                            <div className="h-6 w-3/4 bg-white/5 rounded mb-2" />
                            <div className="h-4 w-full bg-white/5 rounded mb-4" />
                            <div className="flex justify-between items-center">
                                <div className="h-8 w-20 bg-white/5 rounded-lg" />
                                <div className="h-10 w-24 bg-white/5 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
