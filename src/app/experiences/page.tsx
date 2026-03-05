"use client";

import { Sparkles, Gift, ArrowRight } from "lucide-react";

import Link from "next/link";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { useUI } from "@/context/UIContext";
import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";

export default function ExperiencesPage() {
    const { openPurchaseModal } = useUI();

    return (
        <div className="min-h-[calc(100dvh-11rem)] md:min-h-[calc(100dvh-5rem)] w-full bg-black text-center overflow-hidden px-4 py-10 md:py-14">
            <div className="max-w-3xl mx-auto">
                <div className="mb-5 relative">
                    <div className="absolute inset-0 bg-brand-purple/20 blur-3xl rounded-full" />
                    <div className="w-24 h-24 bg-brand-purple/10 border border-brand-purple/30 rounded-3xl flex items-center justify-center relative z-10 mx-auto shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                        <Sparkles className="w-12 h-12 text-brand-purple" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tighter">
                    Exclusive <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-purple">Experiences</span>
                </h1>

                <p className="text-gray-400 max-w-md mx-auto mb-6 text-sm md:text-base leading-snug">
                    Earn free Gum Drops just for showing up.
                    <br className="hidden sm:block" />
                    New ways to stack rewards are on the way.
                </p>

                <div className="text-left mb-6">
                    <GuestComponentBlur actionText="Sign In To Play">
                        <DailyCheckIn />
                    </GuestComponentBlur>
                </div>

                <div className="glass-panel rounded-3xl p-6 md:p-8 text-left relative overflow-hidden mb-8">
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-brand-purple/10 blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-brand-purple uppercase tracking-wider">
                            <Gift className="w-3.5 h-3.5" /> Coming Soon
                        </div>
                        <p className="text-white text-lg md:text-xl font-semibold leading-relaxed mb-5">
                            more ways to earn gumdrops for free coming soon! In the meantime, checkout our packages
                        </p>
                        <button
                            onClick={openPurchaseModal}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black font-bold text-sm"
                        >
                            Get More Gumdrops
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <Link
                    href="/"
                    className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold transition-colors inline-flex items-center gap-2"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
