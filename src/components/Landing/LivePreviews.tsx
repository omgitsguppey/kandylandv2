"use client";

import { useUI } from "@/context/UIContext";
import { ArrowRight, Clock3, Lock, ShieldCheck } from "lucide-react";
import { EditableImage } from "@/components/Admin/EditableImage";
import { useDrops } from "@/hooks/useDrops";
import { GUMDROPS_SUPPORT_COPY, SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

export function LivePreviews() {
    const { openAuthModal } = useUI();
    const { drops } = useDrops();
    const fallbackMedia = "/candy-3d-glass.png";
    const previewImages = Array.from({ length: 4 }, (_, index) => drops[index]?.imageUrl || fallbackMedia);

    return (
        <section className="py-16 sm:py-24 bg-zinc-950 relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-purple mb-3">Library Preview</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 sm:mb-6">Your Kandy Library</h2>
                <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10 sm:mb-16">
                    Unwrap live KandyDrops on mobile, then come back to your library anytime to watch what you already unlocked.
                </p>

                <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Keep access after unwrap</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Watch on mobile</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Limited-time drops</span>
                </div>

                <div
                    className="relative max-w-5xl mx-auto bg-black rounded-[1.5rem] sm:rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group cursor-pointer"
                    onClick={() => openAuthModal("signup")}
                >
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/35 transition-colors z-20 flex items-center justify-center backdrop-blur-[4px]">
                        <div className="rounded-[1.75rem] border border-white/10 bg-black/75 px-5 py-5 shadow-[0_0_30px_rgba(178,140,255,0.18)]">
                            <button className="bg-brand-purple text-black font-extrabold px-5 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center gap-2 text-sm sm:text-base transform group-hover:scale-105 transition-all shadow-[0_0_30px_rgba(178,140,255,0.4)]">
                                <Lock className="w-5 h-5" /> {SECONDARY_UNWRAP_CTA}
                            </button>
                            <p className="mt-3 max-w-[220px] text-xs leading-6 text-gray-300 text-center">
                                Unwrap while the drop is live, then keep it in your library after expiry.
                            </p>
                        </div>
                    </div>

                    <div className="absolute left-4 top-4 z-30 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-bold text-white">
                            <Clock3 className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                            Ends in 5 days
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-bold text-white">
                            +4 Files
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-bold text-white">
                            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
                            Library access
                        </span>
                    </div>

                    <div className="p-4 sm:p-8 pb-0 blur-[6px] opacity-70 pointer-events-none">
                        <div className="flex justify-between items-center mb-5 sm:mb-8 border-b border-white/10 pb-3 sm:pb-4">
                            <div className="h-7 sm:h-8 w-28 sm:w-40 bg-zinc-800 rounded-lg" />
                            <div className="flex gap-4">
                                <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                                <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pb-6 sm:pb-8">
                            {[1, 2, 3, 4].map((index) => (
                                <div key={index} className="space-y-3">
                                    <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/5">
                                        <EditableImage
                                            id={`landing-mockup-${index}`}
                                            defaultSrc={previewImages[index - 1]}
                                            alt="Mockup element"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                                    <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-14 sm:mt-24 space-y-4 sm:space-y-6">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white">Ready to keep your Kandy?</h3>
                    <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">{GUMDROPS_SUPPORT_COPY}</p>
                    <button onClick={() => openAuthModal("signup")} className="mt-2 sm:mt-4 px-6 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-brand-purple to-purple-500 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-[0_0_40px_rgba(178,140,255,0.5)] transition-all flex justify-center items-center gap-2 w-full sm:w-auto mx-auto active:scale-[0.98]">
                        {SECONDARY_UNWRAP_CTA} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>
    );
}
