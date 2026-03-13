"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { HomeDropTicker } from "@/components/HomeDropTicker";
import { getSimulatedPlatformUnwrapsToday } from "@/lib/unwrap-simulator";
import { HERO_PRIMARY_CTA, SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

const INITIAL_PLATFORM_COUNT = getSimulatedPlatformUnwrapsToday();

export default function Hero() {
    const { user } = useAuthIdentity();
    const { openAuthModal } = useUI();
    const ref = useRef(null);

    return (
        <section ref={ref} className="relative flex min-h-[74vh] w-full flex-col justify-center overflow-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[4.25rem] max-[360px]:min-h-[68vh] max-[360px]:pb-[calc(7.5rem+env(safe-area-inset-bottom))] max-[360px]:pt-16 sm:min-h-[90vh] sm:pb-12 sm:pt-24">
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-purple/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: "4s" }} />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-purple/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: "7s" }} />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
                <div className="flex min-w-0 max-w-2xl w-full flex-col items-center space-y-4 max-[360px]:space-y-3 sm:space-y-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1.5 text-[10px] font-bold tracking-wide text-brand-purple max-[360px]:px-2.5 max-[360px]:py-1 max-[360px]:text-[9px] sm:text-sm">
                        <Sparkles className="w-4 h-4" />
                        PREMIUM DIGITAL EXPERIENCES
                    </div>

                    <h1 className="text-[clamp(2.15rem,10vw,4.5rem)] lg:text-7xl font-extrabold tracking-tighter text-white leading-[1.02] sm:leading-[1.1]">
                        Unwrap
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-purple-400">
                            Exclusive
                        </span>{" "}
                        Content.
                    </h1>

                    <p className="max-w-xl text-[15px] font-medium leading-7 text-gray-400 max-[360px]:text-[14px] max-[360px]:leading-6 sm:text-xl sm:leading-relaxed">
                        Connect intimately with your favorite creators like Jessi Ray and Bloomytrip. Unlock private collections, exclusive media, and unique experiences you won&apos;t find anywhere else.
                    </p>

                    <div className="flex w-full flex-col justify-center gap-2.5 pt-1 max-[360px]:gap-2 sm:w-auto sm:flex-row sm:gap-4 sm:pt-4">
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
                        <Button
                            onClick={() => openAuthModal("signup")}
                            size="lg"
                            variant="brand"
                            className="w-full rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-[0_0_24px_rgba(178,140,255,0.28)] transition-all hover:shadow-[0_0_34px_rgba(178,140,255,0.45)] max-[360px]:py-3 sm:w-auto md:px-8 md:py-6 md:text-lg"
                        >
                            {SECONDARY_UNWRAP_CTA}
                        </Button>
                    </div>

                    <div className="pt-1.5">
                        <Link href="/faq" className="text-sm font-semibold text-gray-400 transition-colors hover:text-white">
                            See how it works
                        </Link>
                    </div>

                    <div className="pb-1 pt-1.5 max-[360px]:pt-1">
                        <ActivityTicker />
                    </div>

                    <div className="w-full border-t border-white/10 pt-5 max-[360px]:hidden sm:pt-8 lg:w-4/5">
                        <p className="text-sm text-gray-400 font-medium mb-4">Latest Unwraps</p>
                        <HomeDropTicker />
                    </div>
                </div>
            </div>
        </section>
    );
}

function ActivityTicker() {
    const [platformCount, setPlatformCount] = useState(INITIAL_PLATFORM_COUNT);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlatformCount(getSimulatedPlatformUnwrapsToday());
        }, 300000);

        return () => clearInterval(interval);
    }, []);

    if (!platformCount) return null;

    return (
        <div className="inline-flex max-w-[95vw] items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-lg backdrop-blur-md max-[360px]:px-2.5 max-[360px]:py-1 sm:gap-3 sm:px-4 sm:py-2">
            <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold text-white/90 max-[360px]:text-[9px] sm:text-sm">
                Live now: <span className="text-white font-bold">{platformCount.toLocaleString()}</span> users are unwrapping drops
            </span>
        </div>
    );
}
