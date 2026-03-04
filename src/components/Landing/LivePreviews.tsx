"use client";

import { useUI } from "@/context/UIContext";
import { ArrowRight, Lock } from "lucide-react";
import { EditableImage } from "@/components/Admin/EditableImage";

export function LivePreviews() {
    const { openAuthModal } = useUI();

    return (
        <section className="py-24 bg-zinc-950 relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">A Premium Library</h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-16">
                    Whether it's raw backstage footage, exclusive galleries, or intimate vlogs, our library interface makes unwrapping and organizing your stash a beautiful experience.
                </p>

                {/* Simulated UI Mockup mapped with Admin images */}
                <div className="relative max-w-5xl mx-auto bg-black rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden group cursor-pointer" onClick={openAuthModal}>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-20 flex items-center justify-center backdrop-blur-[2px] group-hover:backdrop-blur-0">
                        <button className="bg-brand-purple text-black font-extrabold px-8 py-4 rounded-xl flex items-center gap-2 transform group-hover:scale-105 transition-all shadow-[0_0_30px_rgba(178,140,255,0.4)]">
                            <Lock className="w-5 h-5" /> Tap To Unlock
                        </button>
                    </div>

                    <div className="p-8 pb-0 blur-[4px] opacity-60 pointer-events-none">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <div className="h-8 w-40 bg-zinc-800 rounded-lg" />
                            <div className="flex gap-4">
                                <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                                <div className="h-6 w-16 bg-zinc-800 rounded-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-3">
                                    <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative border border-white/5">
                                        <EditableImage
                                            id={`landing-mockup-${i}`}
                                            defaultSrc={`/placeholder-drop-${(i % 3) + 1}.jpg`}
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

                <div className="mt-24 space-y-6">
                    <h3 className="text-3xl font-bold text-white">Ready for a taste?</h3>
                    <p className="text-gray-400">Join thousands of others currently unwrapping KandyDrops right now.</p>
                    <button onClick={openAuthModal} className="mt-4 px-10 py-5 bg-gradient-to-r from-brand-purple to-purple-500 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-[0_0_40px_rgba(178,140,255,0.5)] transition-all flex justify-center items-center gap-2 w-full sm:w-auto mx-auto active:scale-[0.98]">
                        Create Your Free Profile <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </section>
    );
}
