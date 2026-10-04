"use client";

import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

import { ReportBugButton } from "@/components/Feedback/ReportBugButton";

interface KandyErrorStateSurfaceProps {
    headline: string;
    body: string;
    actionLabel: string;
    onReload: () => void;
    onReset: () => void;
}

export function KandyErrorStateSurface({
    headline,
    body,
    actionLabel,
    onReload,
    onReset,
}: KandyErrorStateSurfaceProps) {
    return (
        <main
            className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08040f] px-4 py-10 text-center text-white"
            role="alert"
            aria-live="assertive"
            aria-labelledby="kandy-error-heading"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(178,140,255,0.25),transparent_25%),radial-gradient(circle_at_82%_78%,rgba(255,111,207,0.14),transparent_28%),linear-gradient(155deg,rgba(18,7,30,0.94),rgba(5,3,10,0.98))]" aria-hidden="true" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-purple/15" aria-hidden="true" />

            <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 px-5 py-8 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:px-8 sm:py-10 md:rounded-[2.5rem]">
                <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/70 to-transparent" aria-hidden="true" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-rose-300/30 bg-rose-500/12 text-rose-100 shadow-[0_14px_34px_rgba(244,63,94,0.16)]">
                    <AlertTriangle className="h-7 w-7" aria-hidden="true" />
                </div>

                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-brand-purple">KandyDrops needs a moment</p>
                <h1 id="kandy-error-heading" className="mt-3 text-2xl font-black leading-[1.02] tracking-[-0.04em] text-white sm:text-3xl">{headline}</h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-300 sm:text-base sm:leading-7">{body}</p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={onReload}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-white/14 bg-white/[0.06] px-4 text-sm font-black text-white transition-colors hover:border-brand-purple/45 hover:bg-brand-purple/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {actionLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-brand-purple/55 bg-[linear-gradient(110deg,rgba(178,140,255,0.94),rgba(120,74,222,0.96))] px-4 text-sm font-black text-white shadow-[0_14px_32px_rgba(164,118,255,0.22)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70"
                    >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Try Again
                    </button>
                </div>

                <div className="mt-4 flex justify-center">
                    <ReportBugButton context="error-boundary" label="Report this issue" variant="pill" />
                </div>
            </section>
        </main>
    );
}
