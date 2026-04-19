"use client";

import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIContext";
import { useAuthIdentity } from "@/context/AuthContext";
import { Lock, Eye, Heart } from "lucide-react";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { HomeActiveDropsCarousel } from "@/components/Landing/HomeActiveDropsCarousel";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

interface HowItWorksProps {
    activeDrops: Drop[];
}

export function HowItWorks({ activeDrops }: HowItWorksProps) {
    const router = useRouter();
    const { openAuthModal } = useUI();
    const { user } = useAuthIdentity();

    const handleLandingCta = (source: string) => {
        if (user) {
            trackEvent("navigation_click", { destination: "/drops", source });
            router.push("/drops");
            return;
        }

        openAuthModal("signup");
    };

    const features = [
        {
            icon: <Lock className="w-8 h-8 text-brand-purple" />,
            title: "Join Free",
            description: "Create a free profile so your stash and library stay synced."
        },
        {
            icon: <Eye className="w-8 h-8 text-brand-purple" />,
            title: "Unwrap",
            description: "Check the timer and file count, then unwrap before the window ends."
        },
        {
            icon: <Heart className="w-8 h-8 text-brand-purple" />,
            title: "Keep Access",
            description: "Unwrap while it is live and keep it in your library after expiry."
        }
    ];

    return (
        <section className="relative border-t border-white/5 bg-black py-14 sm:py-24">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#b28cff05_1px,transparent_1px),linear-gradient(to_bottom,#b28cff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-12">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-3">How It Works</p>
                    <h2 className="mb-4 text-3xl font-extrabold text-white sm:mb-5 sm:text-4xl md:text-5xl">Keep what you unwrap forever</h2>
                </div>

                <div className="-mx-4 px-4 flex overflow-x-auto snap-x snap-mandatory gap-3 pb-6 sm:mx-0 sm:px-0 sm:mb-8 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {features.map((feature, index) => (
                        <div key={index} className="shrink-0 w-[75vw] max-w-[280px] snap-center sm:w-auto sm:max-w-none group rounded-[1.7rem] border border-white/5 bg-zinc-950 p-6 transition-colors hover:bg-zinc-900 sm:aspect-square sm:rounded-3xl sm:p-6 lg:p-8 flex flex-col justify-center">
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-purple/20 bg-brand-purple/10 transition-transform group-hover:scale-110 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                                    {feature.icon}
                                </div>
                                <h3 className="mb-2 text-base font-bold text-white sm:text-lg lg:text-xl">{feature.title}</h3>
                                <p className="text-[13px] leading-5 text-gray-400 sm:text-sm sm:leading-6">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-14 flex justify-center sm:mb-20">
                    <button
                        onClick={() => handleLandingCta("landing_how_it_works")}
                        className="w-full rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-3.5 font-extrabold text-white shadow-[0_0_20px_rgba(164,118,255,0.25)] transition-all hover:opacity-95 hover:shadow-[0_0_30px_rgba(164,118,255,0.4)] sm:w-auto sm:px-8 sm:py-4"
                    >
                        Unwrap your Kandy Drops
                    </button>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-brand-purple/10 bg-zinc-900 p-4 sm:rounded-[2.6rem] sm:p-6 md:p-8">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-purple/5 blur-[100px] rounded-full" />

                    <div className="relative z-10 space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple">Daily experiences</p>
                                <h3 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Experiences for you</h3>
                            </div>
                            <button
                                onClick={() => handleLandingCta("landing_showcase")}
                                className="w-full rounded-full bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-3 font-extrabold text-white shadow-[0_0_20px_rgba(164,118,255,0.25)] transition-all hover:opacity-95 hover:shadow-[0_0_30px_rgba(164,118,255,0.4)] sm:w-auto sm:px-7"
                            >
                                {SECONDARY_UNWRAP_CTA}
                            </button>
                        </div>

                        <HomeActiveDropsCarousel
                            drops={activeDrops}
                            autoPlayMs={5_000}
                            emptyLabel="No daily experiences are live yet."
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
