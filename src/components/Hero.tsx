"use client";

import { useRef } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { HomeDropTicker } from "@/components/HomeDropTicker";
import { HERO_PRIMARY_CTA } from "@/lib/marketing-copy";

export default function Hero() {
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUI();
    const ref = useRef(null);

    return (
        <section ref={ref} className="relative flex min-h-[72vh] w-full flex-col justify-center overflow-hidden pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[4rem] max-[360px]:min-h-[66vh] max-[360px]:pb-[calc(7.8rem+env(safe-area-inset-bottom))] max-[360px]:pt-[3.75rem] sm:min-h-[90vh] sm:pb-12 sm:pt-24 landscape:min-h-0 landscape:justify-start landscape:pb-[calc(6.8rem+env(safe-area-inset-bottom))] landscape:pt-12">
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-purple/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: "4s" }} />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-purple/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: "7s" }} />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                <div className="flex min-w-0 max-w-2xl w-full flex-col items-center space-y-3.5 max-[360px]:space-y-3 sm:space-y-7">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1.5 text-[10px] font-bold tracking-wide text-brand-purple max-[360px]:px-2.5 max-[360px]:py-1 max-[360px]:text-[9px] sm:text-sm">
                        <Sparkles className="w-4 h-4" />
                        PREMIUM DIGITAL EXPERIENCES
                    </div>

                    <h1 className="max-w-[11rem] text-[clamp(1.95rem,9.5vw,4.5rem)] font-extrabold leading-[1.02] tracking-tighter text-white min-[380px]:max-w-[12.5rem] sm:max-w-none sm:leading-[1.1] lg:text-7xl landscape:max-w-none landscape:text-[clamp(2.1rem,7vw,3.5rem)]">
                        Unwrap
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-purple-400">
                            live
                        </span>
                        <br />
                        creator drops.
                    </h1>

                    <p className="max-w-lg text-[15px] font-medium leading-6 text-gray-400 max-[360px]:text-[14px] max-[360px]:leading-6 sm:text-xl sm:leading-relaxed">
                        Unlock live creator drops on your phone, then keep the Kandy you unwrap in your library after the public drop disappears.
                    </p>

                    <div className="grid w-full max-w-xl gap-2 sm:grid-cols-3 sm:gap-3">
                        {[
                            "Live timers",
                            "Keep access after unwrap",
                            "Daily Gum Drops",
                        ].map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/90"
                            >
                                {item}
                            </div>
                        ))}
                    </div>

                    <div className="flex w-full flex-col justify-center gap-2.5 pt-1 max-[360px]:gap-2 sm:w-auto sm:flex-row sm:gap-4 sm:pt-3">
                        {user ? (
                            <Link href="/dashboard" className="w-full sm:w-auto">
                                <Button size="lg" variant="brand" className="w-full rounded-2xl px-6 py-3.5 text-base font-bold shadow-[0_0_30px_rgba(178,140,255,0.4)] transition-all hover:shadow-[0_0_40px_rgba(178,140,255,0.6)] max-[360px]:py-3 md:px-10 md:py-6 md:text-lg">
                                    Go to Dashboard <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                onClick={() => openAuthModal("signup")}
                                size="lg"
                                variant="brand"
                                className="w-full rounded-2xl px-6 py-3.5 text-base font-bold shadow-[0_0_30px_rgba(178,140,255,0.4)] transition-all hover:shadow-[0_0_40px_rgba(178,140,255,0.6)] max-[360px]:py-3 sm:w-auto md:px-10 md:py-6 md:text-lg"
                            >
                                {HERO_PRIMARY_CTA} <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
                        <Link href="/faq" className="text-sm font-semibold text-gray-300 transition-colors hover:text-white">
                            See how it works
                        </Link>
                        <Link href="/drops" className="text-sm font-semibold text-gray-500 transition-colors hover:text-white">
                            Browse live drops
                        </Link>
                    </div>

                    <details className="w-full max-w-xl rounded-[1.4rem] border border-white/10 bg-white/[0.03] text-left text-sm text-gray-300">
                        <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-white">
                            Need the quick rundown?
                        </summary>
                        <div className="space-y-2 border-t border-white/10 px-4 py-3 leading-6">
                            <p>Create your free profile once, keep your library synced, and return daily in Experiences to build your Gum Drops balance.</p>
                            <p className="text-gray-400">Live drops disappear from the public page after expiry, but the ones you unwrap stay in your dashboard.</p>
                        </div>
                    </details>

                    <div className="pb-1 pt-0.5 max-[360px]:pt-0 landscape:pb-0">
                        <ActivityTicker />
                    </div>

                    <div className="hidden w-full border-t border-white/10 pt-5 sm:block sm:pt-8 lg:w-4/5 landscape:hidden">
                        <p className="text-sm text-gray-400 font-medium mb-4">Latest Unwraps</p>
                        <HomeDropTicker />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ActivityTicker() {
    return (
        <div className="inline-flex max-w-[95vw] items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-lg backdrop-blur-md max-[360px]:px-2.5 max-[360px]:py-1 sm:gap-3 sm:px-4 sm:py-2">
            <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-white/90 max-[360px]:text-[9px] sm:text-sm">
                Live now: <span className="text-white font-bold">active KandyDrops</span> are ready to unwrap
            </span>
        </div>
    );
}
