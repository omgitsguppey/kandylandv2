"use client";

import { useEffect } from "react";
import { Sparkles, Gift, ArrowRight } from "lucide-react";

import Link from "next/link";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { DailyTasksModule } from "@/components/Dashboard/DailyTasksModule";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";
import { trackEvent } from "@/lib/telemetry";
import { GUMDROPS_PRIMARY_CTA, GUMDROPS_SUPPORT_COPY, SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";

export default function ExperiencesPage() {
    const { user } = useAuth();
    const { openPurchaseModal, openAuthModal } = useUI();

    useEffect(() => {
        trackEvent("experience_hub_viewed");
    }, []);

    return (
        <div className="min-h-[calc(100dvh-11rem)] md:min-h-[calc(100dvh-5rem)] w-full bg-black text-center overflow-hidden px-4 py-10 md:py-14" data-onboarding-page="experiences">
            <div className="max-w-3xl mx-auto space-y-10">
                <div>
                    <div className="mb-5 relative">
                        <div className="absolute inset-0 bg-brand-purple/20 blur-3xl rounded-full" />
                        <div className="w-24 h-24 bg-brand-purple/10 border border-brand-purple/30 rounded-3xl flex items-center justify-center relative z-10 mx-auto shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                            <Sparkles className="w-12 h-12 text-brand-purple" />
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tighter">
                        Exclusive <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-purple">Experiences</span>
                    </h1>

                    <p className="text-gray-400 max-w-md mx-auto text-sm md:text-base leading-snug">
                        Return daily to stack Gum Drops,
                        <br className="hidden sm:block" />
                        then stay ready to unwrap the next live KandyDrop.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Day 1 starts free</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Daily streaks</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">Extra Gum Drops</span>
                    </div>
                </div>

                <div className="text-left">
                    <GuestComponentBlur
                        actionText={SECONDARY_UNWRAP_CTA}
                        supportText="Create a free profile to start Day 1 and stack Gum Drops daily."
                    >
                        <div className="space-y-6">
                            <DailyCheckIn />
                            <DailyTasksModule />
                        </div>
                    </GuestComponentBlur>
                </div>

                <div className="pt-4">
                    <button
                        onClick={() => {
                            if (!user) {
                                openAuthModal("signup");
                                return;
                            }
                            openPurchaseModal();
                        }}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors shadow-lg shadow-white/10"
                    >
                        {GUMDROPS_PRIMARY_CTA}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="mt-3 max-w-md mx-auto text-xs leading-6 text-gray-500">{GUMDROPS_SUPPORT_COPY}</p>
                </div>
            </div>
        </div>
    );
}
