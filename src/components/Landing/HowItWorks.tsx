"use client";

import { useUI } from "@/context/UIContext";
import { Lock, Eye, Heart, Zap } from "lucide-react";
import { EditableImage } from "@/components/Admin/EditableImage";
import { useDrops } from "@/hooks/useDrops";
import { SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

export function HowItWorks() {
    const { openAuthModal } = useUI();
    const { drops } = useDrops();
    const fallbackMedia = "/candy-3d-glass.png";

    const curatedImages = [
        drops[0]?.imageUrl || fallbackMedia,
        drops[1]?.imageUrl || fallbackMedia,
        drops[2]?.imageUrl || fallbackMedia,
        drops[3]?.imageUrl || fallbackMedia,
    ];

    const features = [
        {
            icon: <Lock className="w-8 h-8 text-brand-purple" />,
            title: "Join Free",
            description: "Create your free mobile profile so your stash, rewards, and library stay synced."
        },
        {
            icon: <Zap className="w-8 h-8 text-brand-purple" />,
            title: "Get Gum Drops",
            description: "Load up in Wallet and return daily in Experiences to keep your balance ready."
        },
        {
            icon: <Eye className="w-8 h-8 text-brand-purple" />,
            title: "Unwrap Live KandyDrops",
            description: "Watch the timer, check the file count, then unwrap before the live window ends."
        },
        {
            icon: <Heart className="w-8 h-8 text-brand-purple" />,
            title: "Keep It in Your Library",
            description: "If you unwrap while it is live, it stays in your dashboard library after expiry."
        }
    ];

    return (
        <section className="py-16 sm:py-24 bg-black relative border-t border-white/5">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#b28cff05_1px,transparent_1px),linear-gradient(to_bottom,#b28cff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-3">How It Works</p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 sm:mb-6">How to Unwrap KandyDrops</h2>
                    <p className="text-base sm:text-lg text-gray-400">A mobile-first flow built around live drops, library access, and daily reward momentum.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-12 sm:mb-20">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-zinc-950 border border-white/5 rounded-3xl p-5 sm:p-8 hover:bg-zinc-900 transition-colors group">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center mb-4 sm:mb-6 border border-brand-purple/20 group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-zinc-900 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-12 border border-brand-purple/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-purple/5 blur-[100px] rounded-full" />

                    <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center relative z-10">
                        <div className="space-y-5 sm:space-y-6">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Live timers</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Keep access after unwrap</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Watch on mobile</span>
                            </div>
                            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">See what you&apos;re about to unwrap.</h3>
                            <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
                                KandyDrops stays simple on mobile: browse live drops, unwrap while they&apos;re active, and keep your favorites in your library even after the public window ends.
                            </p>
                            <button onClick={() => openAuthModal("signup")} className="mt-2 sm:mt-4 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white hover:bg-gray-200 text-black font-extrabold rounded-xl transition-colors">
                                {SECONDARY_UNWRAP_CTA}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-3 sm:space-y-4">
                                <EditableImage
                                    id="landing-hero-1"
                                    defaultSrc={curatedImages[0]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                                <EditableImage
                                    id="landing-hero-2"
                                    defaultSrc={curatedImages[1]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                            </div>
                            <div className="space-y-3 sm:space-y-4 mt-5 sm:mt-8">
                                <EditableImage
                                    id="landing-hero-3"
                                    defaultSrc={curatedImages[2]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                                <EditableImage
                                    id="landing-hero-4"
                                    defaultSrc={curatedImages[3]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
