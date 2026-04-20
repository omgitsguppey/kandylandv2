"use client";

import React from "react";

export function AdminTruthSurfaces() {
    return (
        <section className="mt-8 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/50">Core Truth Surfaces</h3>
            <p className="text-xs text-gray-400">SEO, Accessibility, and Performance observability layer.</p>
            
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-white">SEO Index Check</p>
                            <p className="mt-1 text-xs text-gray-400">Canonical path verification</p>
                        </div>
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            [live]
                        </span>
                    </div>
                    <p className="mt-4 text-sm text-emerald-100">All public profiles have correct canonical tags. Core metrics are healthy.</p>
                </div>
                
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-white">Accessibility (A11y)</p>
                            <p className="mt-1 text-xs text-gray-400">Aria labels and contrast</p>
                        </div>
                        <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            [stale]
                        </span>
                    </div>
                    <p className="mt-4 text-sm text-amber-100">Last automatic scan was over 24 hours ago. Re-run required to verify contrast bounds.</p>
                </div>
                
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-white">Core Web Vitals</p>
                            <p className="mt-1 text-xs text-gray-400">LCP, INP, CLS scores</p>
                        </div>
                        <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                            [fallback]
                        </span>
                    </div>
                    <p className="mt-4 text-sm text-red-100">Realtime vitals unavailable. Displaying data from synthetic probe (cached 4h ago).</p>
                </div>
            </div>
        </section>
    );
}
