"use client";

import { useEffect } from "react";

import { GuestComponentBlur } from "@/components/Auth/GuestComponentBlur";
import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { DailyTasksModule } from "@/components/Dashboard/DailyTasksModule";
import { LiveDropsForYouCarousel } from "@/components/Dashboard/LiveDropsForYouCarousel";
import {
    KandyExperiencesHero,
    KandyExperiencesProgram,
    KandyGumDropRefillCard,
} from "@/components/creative-tim/kandydrops/experiences/KandyExperiencesExperience";
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
            className="min-h-[calc(100dvh-11rem)] w-full overflow-hidden bg-[radial-gradient(circle_at_8%_8%,rgba(236,72,153,0.16),transparent_25%),radial-gradient(circle_at_88%_4%,rgba(168,85,247,0.2),transparent_28%),linear-gradient(180deg,#170721_0%,#0b0413_45%,#050208_100%)] px-4 py-5 pb-6 text-left md:min-h-[calc(100dvh-5rem)] md:py-9 md:pb-12"
            data-onboarding-page="experiences"
            data-experiences-layout="public-beta-compact"
            style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
        >
            <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
                <KandyExperiencesHero liveDropCount={initialActiveDrops.length} />

                <GuestComponentBlur
                    actionText={SECONDARY_UNWRAP_CTA}
                    supportText="Create a free profile to start Day 1 and stack Gum Drops daily."
                >
                    <KandyExperiencesProgram
                        creatorRail={<CreatorDiscoveryRail surface="experiences" compact initialCreators={creatorRailProfiles} />}
                        dailyCheckIn={<DailyCheckIn variant="experiences" />}
                        dailyTasks={<DailyTasksModule />}
                        liveDrops={<LiveDropsForYouCarousel initialDrops={initialActiveDrops} />}
                    />
                </GuestComponentBlur>

                <KandyGumDropRefillCard
                    supportCopy={GUMDROPS_SUPPORT_COPY}
                    primaryCta={GUMDROPS_PRIMARY_CTA}
                    onAction={() => {
                        if (!user) {
                            openAuthModal("signup");
                            return;
                        }
                        openPurchaseModal();
                    }}
                />
            </div>
        </div>
    );
}
