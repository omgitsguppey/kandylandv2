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
            description: "Create a free profile so your stash and library stay synced."
        },
        {
            icon: <Zap className="w-8 h-8 text-brand-purple" />,
            title: "Get Gum Drops",
            description: "Buy bundles or build your balance in Experiences."
        },
        {
            icon: <Eye className="w-8 h-8 text-brand-purple" />,
            title: "Unwrap Live KandyDrops",
            description: "Check the timer and file count, then unwrap before the live window ends."
        },
        {
            icon: <Heart className="w-8 h-8 text-brand-purple" />,
            title: "Keep It in Your Library",
            description: "Unwrap while it is live and keep it in your library after expiry."
        }
    ];

    return (
        <section className="relative border-t border-white/5 bg-black py-14 sm:py-24">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#b28cff05_1px,transparent_1px),linear-gradient(to_bottom,#b28cff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="mx-auto mb-9 max-w-3xl text-center sm:mb-16">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-3">How It Works</p>
                    <h2 className="mb-4 text-3xl font-extrabold text-white sm:mb-5 sm:text-4xl md:text-5xl">How to unwrap on mobile</h2>
                    <p className="text-sm text-gray-400 sm:text-lg">Join free, get Gum Drops, unwrap live, and keep what you unlock.</p>
                </div>

                <div className="mb-10 grid grid-cols-2 gap-3 sm:mb-20 sm:gap-5 lg:grid-cols-4 lg:gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group rounded-[1.5rem] border border-white/5 bg-zinc-950 p-4 transition-colors hover:bg-zinc-900 sm:rounded-3xl sm:p-6 lg:p-8">
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-purple/20 bg-brand-purple/10 transition-transform group-hover:scale-110 sm:mb-5 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                                {feature.icon}
                            </div>
                            <h3 className="mb-2 text-sm font-bold text-white sm:text-lg lg:text-xl">{feature.title}</h3>
                            <p className="text-xs leading-5 text-gray-400 sm:text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>

                <div className="relative overflow-hidden rounded-[2rem] border border-brand-purple/10 bg-zinc-900 p-4 sm:rounded-[3rem] sm:p-8 md:p-12">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/10 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-purple/5 blur-[100px] rounded-full" />

                    <div className="relative z-10 grid items-center gap-6 md:grid-cols-2 sm:gap-12">
                        <div className="space-y-4 sm:space-y-6">
                            <h3 className="text-2xl font-extrabold text-white sm:text-3xl md:text-4xl">See what you&apos;re about to unwrap.</h3>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Live timers</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Keep access after unwrap</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Watch on mobile</span>
                            </div>
                            <p className="text-sm leading-6 text-gray-400 sm:text-lg sm:leading-relaxed">
                                Browse live drops, unwrap while they&apos;re active, and keep the ones you unlock in your library.
                            </p>
                            <details className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] text-sm text-gray-300">
                                <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-white">
                                    What happens after a drop expires?
                                </summary>
                                <div className="border-t border-white/10 px-4 py-3 leading-6">
                                    Expired drops leave the public page. If you already unwrapped one, it stays in your dashboard library so you can come back to it later.
                                </div>
                            </details>
                            <button onClick={() => openAuthModal("signup")} className="mt-2 sm:mt-4 w-full sm:w-auto rounded-xl bg-gradient-to-r from-brand-purple to-purple-500 px-6 py-3.5 font-extrabold text-white shadow-lg shadow-brand-purple/20 transition-colors hover:opacity-95 sm:px-8 sm:py-4">
                                {SECONDARY_UNWRAP_CTA}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                            <div className="space-y-2.5 sm:space-y-4">
                                <EditableImage
                                    id="landing-hero-1"
                                    defaultSrc={curatedImages[0]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-900 sm:rounded-3xl"
                                />
                                <EditableImage
                                    id="landing-hero-2"
                                    defaultSrc={curatedImages[1]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-square overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-900 sm:rounded-3xl"
                                />
                            </div>
                            <div className="mt-4 space-y-2.5 sm:mt-8 sm:space-y-4">
                                <EditableImage
                                    id="landing-hero-3"
                                    defaultSrc={curatedImages[2]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-square overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-900 sm:rounded-3xl"
                                />
                                <EditableImage
                                    id="landing-hero-4"
                                    defaultSrc={curatedImages[3]}
                                    alt="Creator content"
                                    fill
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                    className="relative w-full aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-white/10 bg-zinc-900 sm:rounded-3xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
