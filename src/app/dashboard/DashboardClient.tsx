"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { Star } from "lucide-react";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { useAuth } from "@/context/AuthContext";
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



export default function DashboardClient({ drops, creatorRailProfiles }: DashboardClientProps) {
    const { userProfile, loading } = useAuth();
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

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="space-y-6 md:space-y-8">
                        <div className="min-h-[20rem] rounded-3xl bg-white/5" />
                        <div className="h-40 rounded-3xl bg-white/5" />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="h-[400px] rounded-3xl bg-white/5" />
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div id="dashboard-home" tabIndex={-1} className="scroll-mt-24 mx-auto w-full max-w-7xl px-3 sm:px-4 outline-none" data-onboarding-page="dashboard">

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
