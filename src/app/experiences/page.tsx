"use client";

import { useEffect } from "react";
import { ArrowRight, Clock3, Gift, Sparkles, Wallet } from "lucide-react";
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
        <div className="min-h-[calc(100dvh-11rem)] w-full overflow-hidden bg-black px-4 py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-left md:min-h-[calc(100dvh-5rem)] md:py-12 md:pb-12" data-onboarding-page="experiences">
            <div className="mx-auto max-w-4xl space-y-6">
                <section className="glass-panel rounded-[2rem] border border-white/10 p-5 sm:p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                <Sparkles className="h-3.5 w-3.5" />
                                Daily Experiences
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                                Stack Gum Drops and stay ready to unwrap.
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-400 sm:text-base">
                                This is the mobile-first habit loop: check in, finish three missions, then come back when the timer resets for the next batch.
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-white">Day 1 starts free</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">50-1000 GD missions</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-bold text-gray-200">7-day task cooldown</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:min-w-[16rem]">
                            <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                                <Clock3 className="h-5 w-5 text-brand-purple" />
                                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Daily reset</p>
                                <p className="mt-1 text-sm font-semibold text-white">Syncs with your check-in timer</p>
                            </div>
                            <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                                <Gift className="h-5 w-5 text-brand-purple" />
                                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">Reward loop</p>
                                <p className="mt-1 text-sm font-semibold text-white">Earn Gum Drops for habits that stick</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="text-left">
                    <GuestComponentBlur
                        actionText={SECONDARY_UNWRAP_CTA}
                        supportText="Create a free profile to start Day 1 and stack Gum Drops daily."
                    >
                        <div className="space-y-5">
                            <DailyCheckIn />
                            <DailyTasksModule />
                        </div>
                    </GuestComponentBlur>
                </div>

                <section className="glass-panel rounded-[2rem] border border-white/10 p-5 text-center sm:p-6">
                    <div className="mx-auto max-w-2xl">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-white">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Need more Gum Drops before the next unwrap?</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">{GUMDROPS_SUPPORT_COPY}</p>
                    </div>

                    <button
                        onClick={() => {
                            if (!user) {
                                openAuthModal("signup");
                                return;
                            }
                            openPurchaseModal();
                        }}
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-purple bg-brand-purple px-8 py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    >
                        Get Gum Drops
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="mt-3 text-xs leading-6 text-gray-500">{GUMDROPS_PRIMARY_CTA}</p>
                </section>
            </div>
        </div>
    );
}
