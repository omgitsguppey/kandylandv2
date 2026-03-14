"use client";

import { useUI } from "@/context/UIContext";
import { Lock, Eye, Heart } from "lucide-react";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { HomeActiveDropsCarousel } from "@/components/Landing/HomeActiveDropsCarousel";

export function HowItWorks() {
    const { openAuthModal } = useUI();

    const features = [
        {
            icon: <Lock className="w-8 h-8 text-brand-purple" />,
            title: "Join Free",
            description: "Create a free profile so your stash and library stay synced."
        },
        {
            icon: <Eye className="w-8 h-8 text-brand-purple" />,
            title: "Unwrap Live",
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
                <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-16">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-3">How It Works</p>
                    <h2 className="mb-4 text-3xl font-extrabold text-white sm:mb-5 sm:text-4xl md:text-5xl">Keep what you unwrap forever</h2>
                    <p className="text-sm text-gray-400 sm:text-lg">Join for free, get Gum Drops, and Unwrap KandyDrops before time runs out!</p>
                </div>

                <div className="mb-6 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-5">
                    {features.map((feature, index) => (
                        <div key={index} className="group aspect-square rounded-[1.2rem] border border-white/5 bg-zinc-950 p-3 transition-colors hover:bg-zinc-900 sm:rounded-3xl sm:p-6 lg:p-8">
                            <div className="flex h-full flex-col justify-between text-left">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-purple/20 bg-brand-purple/10 transition-transform group-hover:scale-110 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                                    {feature.icon}
                                </div>
                                <div>
                                    <h3 className="mb-1 text-sm font-bold text-white sm:mb-2 sm:text-lg lg:text-xl">{feature.title}</h3>
                                    <p className="text-[11px] leading-4 text-gray-400 sm:text-sm sm:leading-6">{feature.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-10 flex justify-center sm:mb-16">
                    <button
                        onClick={() => openAuthModal("signup")}
                        className="w-full rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-3.5 font-extrabold text-white shadow-lg shadow-brand-purple/20 transition-colors hover:opacity-95 sm:w-auto sm:px-8 sm:py-4"
                    >
                        Unwrap your Kandy Drops
                    </button>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-brand-purple/10 bg-zinc-900 p-4 sm:rounded-[3rem] sm:p-8 md:p-12">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-purple/5 blur-[100px] rounded-full" />

                    <div className="relative z-10 grid items-center gap-6 md:grid-cols-2 sm:gap-12">
                        <div className="space-y-4 sm:space-y-6">
                            <h3 className="text-2xl font-extrabold text-white sm:text-3xl md:text-4xl">Get a taste before you Unwrap</h3>
                            <p className="text-sm leading-6 text-gray-400 sm:text-lg sm:leading-relaxed">
                                New drops are added daily, but they also disappear daily! Keep them safe by unwrapping every drop before it&apos;s too late.
                            </p>
                            <div className="space-y-3 md:hidden">
                                <HomeActiveDropsCarousel />
                            </div>
                            <button onClick={() => openAuthModal("signup")} className="mt-2 sm:mt-4 w-full sm:w-auto rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-3.5 font-extrabold text-white shadow-lg shadow-brand-purple/20 transition-colors hover:opacity-95 sm:px-8 sm:py-4">
                                {SECONDARY_UNWRAP_CTA}
                            </button>
                        </div>

                        <div className="hidden space-y-3 md:block">
                            <HomeActiveDropsCarousel />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
