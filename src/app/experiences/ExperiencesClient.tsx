"use client";

import { useEffect } from "react";
import { ArrowRight, Sparkles, Wallet } from "lucide-react";

import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";
import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { DailyTasksModule } from "@/components/Dashboard/DailyTasksModule";
import { LiveDropsForYouCarousel } from "@/components/Dashboard/LiveDropsForYouCarousel";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";
import { GUMDROPS_PRIMARY_CTA, GUMDROPS_SUPPORT_COPY, SECONDARY_UNWRAP_CTA } from "@/lib/marketing-copy";
import { trackEvent } from "@/lib/telemetry";

import type { Drop } from "@/types/db";

interface ExperiencesClientProps {
    initialActiveDrops: Drop[];
    creatorRailProfiles: CreatorDiscoveryProfile[];
}

export default function ExperiencesClient({ initialActiveDrops, creatorRailProfiles }: ExperiencesClientProps) {
    const { user } = useAuth();
    const { openPurchaseModal, openAuthModal } = useUI();

    useEffect(() => {
        trackEvent("experience_hub_viewed");
    }, []);

    return (
        <div
            className="min-h-[calc(100dvh-11rem)] w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(178,140,255,0.2),transparent_34%),linear-gradient(180deg,#17121f_0%,#09080d_42%,#050506_100%)] px-4 py-4 pb-4 text-left md:min-h-[calc(100dvh-5rem)] md:py-8 md:pb-10"
            data-onboarding-page="experiences"
            data-experiences-layout="public-beta-compact"
            style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
        >
            <div className="mx-auto max-w-5xl space-y-4">
                <section
                    className="relative overflow-hidden rounded-[2rem] border border-purple-200/15 bg-[linear-gradient(135deg,rgba(178,140,255,0.2),rgba(18,18,24,0.9)_52%,rgba(255,110,199,0.12))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6"
                    data-experiences-hero-explainer-cards="removed"
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                <Sparkles className="h-3.5 w-3.5" />
                                Daily Experiences
                            </div>
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl md:text-4xl">
                                Stay ready to unwrap.
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-5 text-gray-400 sm:text-base sm:leading-6">
                                Check in, finish three missions, and come back when the timer resets.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="text-left">
                    <GuestComponentBlur
                        actionText={SECONDARY_UNWRAP_CTA}
                        supportText="Create a free profile to start Day 1 and stack Gum Drops daily."
                    >
                        <div className="space-y-5">
                            <CreatorDiscoveryRail surface="experiences" compact initialCreators={creatorRailProfiles} />
                            <DailyCheckIn variant="experiences" />
                            <DailyTasksModule />
                            <LiveDropsForYouCarousel initialDrops={initialActiveDrops} />
                        </div>
                    </GuestComponentBlur>
                </div>

                <section id="gumdrops-wallet" className="relative overflow-hidden rounded-[2rem] border border-purple-200/15 bg-[linear-gradient(145deg,rgba(178,140,255,0.18),rgba(18,18,24,0.92)_52%,rgba(255,110,199,0.1))] p-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-6">
                    <div className="mx-auto max-w-2xl">
                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/15 text-white">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white sm:text-2xl">Need more Gum Drops before the next unwrap?</h2>
                        <p className="mt-1.5 text-sm leading-6 text-gray-400">{GUMDROPS_SUPPORT_COPY}</p>
                    </div>

                    <button
                        onClick={() => {
                            if (!user) {
                                openAuthModal("signup");
                                return;
                            }
                            openPurchaseModal();
                        }}
                            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-purple bg-brand-purple px-7 py-3 text-sm font-bold text-white shadow-[0_12px_32px_rgba(178,140,255,0.3)] transition-opacity hover:opacity-90"
                    >
                        Get Gum Drops
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="mt-2 text-xs leading-5 text-gray-500">{GUMDROPS_PRIMARY_CTA}</p>
                </section>
            </div>
        </div>
    );
}
