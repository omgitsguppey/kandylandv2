"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { Star } from "lucide-react";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { useAuth } from "@/context/AuthContext";
import { useRolloutVariant } from "@/context/RolloutContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { CreatorWorkspacePanel } from "@/components/Dashboard/CreatorWorkspacePanel";
import { useDrops } from "@/hooks/useDrops";
import { mergeResolvedDropsById } from "@/lib/drop-dashboard";
import { isDropActiveNow } from "@/lib/drop-status";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

const RecentActivityFeed = dynamic(
    () => import("@/components/Dashboard/RecentActivityFeed").then((mod) => mod.RecentActivityFeed),
    {
        loading: () => (
            <div className="glass-panel mt-6 rounded-3xl p-6 lg:mt-8">
                <div className="h-5 w-40 rounded-lg bg-white/10" />
                <div className="mt-4 h-24 rounded-2xl bg-white/5" />
            </div>
        ),
    },
);

interface DashboardClientProps {
    drops: Drop[];
    creatorRailProfiles: CreatorDiscoveryProfile[];
}

const DASHBOARD_GREETING_VARIANTS: Record<string, string> = {
    taste: "Back for another taste, {name}?",
    missed: "We missed you, {name}!",
    shop: "Welcome back to the Kandy Shop, {name}",
};

export default function DashboardClient({ drops, creatorRailProfiles }: DashboardClientProps) {
    const { userProfile, loading } = useAuth();
    const greetingVariant = useRolloutVariant("dashboard_greeting_experiment", "taste");
    const greetingTemplate = DASHBOARD_GREETING_VARIANTS[greetingVariant] || DASHBOARD_GREETING_VARIANTS.taste;
    const initialActiveDrops = useMemo(() => drops.filter((drop) => isDropActiveNow(drop)), [drops]);
    const { drops: liveActiveDrops, nowMs } = useDrops(["active"], initialActiveDrops);
    const visibleDrops = useMemo(
        () => mergeResolvedDropsById(drops, liveActiveDrops, nowMs),
        [drops, liveActiveDrops, nowMs],
    );

    useEffect(() => {
        if (!userProfile) {
            return;
        }

        trackEvent("dashboard_viewed");
    }, [userProfile]);

    if (loading || !userProfile) {
        return (
            <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
                <header className="mb-8 md:mb-12">
                    <div className="mb-4 h-10 w-3/4 rounded-xl bg-white/10 md:w-1/2" />
                    <div className="h-5 w-1/3 rounded-lg bg-white/5" />
                </header>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="space-y-6 md:space-y-8">
                        <div className="h-64 rounded-3xl bg-white/5" />
                        <div className="h-40 rounded-3xl bg-white/5" />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="h-[400px] rounded-3xl bg-white/5" />
                    </div>
                </div>
            </div>
        );
    }

    const firstName = userProfile.displayName?.split(" ")[0] || "Collector";
    const greeting = greetingTemplate.replace("{name}", firstName);
    const greetingSizeClass = greeting.length > 34
        ? "text-[clamp(1.25rem,4vw,2.5rem)]"
        : "text-[clamp(1.5rem,4.6vw,3rem)]";

    return (
        <div id="dashboard-home" tabIndex={-1} className="mx-auto w-full max-w-7xl px-3 sm:px-4 outline-none" data-onboarding-page="dashboard">
            <header className="mb-4 md:mb-5">
                <h1 className="text-lg md:text-xl font-bold leading-tight tracking-tight text-white/90">
                    {greeting}
                </h1>
                <p className="mt-1 text-sm text-gray-400">Claim your streak and stay ready to unwrap</p>
            </header>

            {(userProfile.role === "creator" || Boolean(userProfile.creatorApplication)) ? (
                <CreatorWorkspacePanel userProfile={userProfile} />
            ) : null}

            <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-3">
                <div className="space-y-6 md:space-y-8">
                    <DailyCheckIn />
                    <CreatorDiscoveryRail surface="dashboard" compact initialCreators={creatorRailProfiles} />

                    <RecentActivityFeed />
                </div>

                <div className="lg:col-span-2">
                    <CollectionList drops={visibleDrops} userProfile={userProfile} currentTimeMs={nowMs} />
                </div>
            </div>
        </div>
    );
}
