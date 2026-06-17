"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { useAuth } from "@/context/AuthContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { useDrops } from "@/hooks/useDrops";
import { mergeResolvedDropsById } from "@/lib/drop-dashboard";
import { isDropActiveNow } from "@/lib/drop-status";
import { CREATOR_DASHBOARD_ROUTE } from "@/lib/creator-profile-routing";
import { getMobileModuleClassNames } from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import { getMobileSkeletonClass } from "@/lib/frontend-hardening/ui/loading-state-contract";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

const userOverviewModuleClassName = getMobileModuleClassNames("user", "overview");
const userOverviewSkeletonClassName = getMobileSkeletonClass("user", "overview");
const userListSkeletonClassName = getMobileSkeletonClass("user", "list");

const RecentActivityFeed = dynamic(
    () => import("@/components/Dashboard/RecentActivityFeed").then((mod) => mod.RecentActivityFeed),
    {
        loading: () => (
            <div
                className={`${userOverviewModuleClassName} mt-3 lg:mt-8`}
                data-mobile-density="compact"
                data-mobile-sprawl-guard="true"
            >
                <div className="h-5 w-40 rounded-lg bg-white/10" />
                <div className="mt-3 h-20 rounded-2xl bg-white/5" />
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
    const router = useRouter();
    const initialActiveDrops = useMemo(() => drops.filter((drop) => isDropActiveNow(drop)), [drops]);
    const { drops: liveActiveDrops, nowMs } = useDrops(["active"], initialActiveDrops);
    const visibleDrops = useMemo(
        () => mergeResolvedDropsById(drops, liveActiveDrops, nowMs),
        [drops, liveActiveDrops, nowMs],
    );
    const isCreatorPrimaryDashboard = userProfile?.role === "creator";

    useEffect(() => {
        if (!userProfile) {
            return;
        }

        trackEvent("dashboard_viewed");
    }, [userProfile]);

    useEffect(() => {
        if (!isCreatorPrimaryDashboard) {
            return;
        }

        router.replace(CREATOR_DASHBOARD_ROUTE);
    }, [isCreatorPrimaryDashboard, router]);

    if (loading || !userProfile) {
        return (
            <div
                className="mx-auto w-full max-w-7xl px-3 sm:px-4"
                data-mobile-density="compact"
                data-mobile-sprawl-guard="true"
                data-mobile-organization="summary-first"
                data-mobile-drilldown="true"
                data-desktop-flow-collapsed="true"
                data-user-dashboard-loading-staged="true"
            >

                <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-3">
                    <div className="space-y-3 md:space-y-5">
                        <div className={userOverviewSkeletonClassName} data-mobile-skeleton="user-dashboard-overview" />
                        <div className={userListSkeletonClassName} data-mobile-skeleton="user-dashboard-list" />
                    </div>
                    <div className="lg:col-span-2">
                        <div
                            className={`${userListSkeletonClassName} min-h-[13rem]`}
                            data-mobile-skeleton="user-dashboard-collection"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (isCreatorPrimaryDashboard) {
        return (
            <div
                className="mx-auto w-full max-w-5xl px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+9rem)] sm:px-4 sm:pt-4"
                data-dashboard-surface="creator_redirect"
                data-creator-dashboard-route-boundary="redirect_to_creator_dashboard"
                data-user-dashboard-modules-rendered="false"
            >
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white">
                    Opening Creator Dashboard...
                </div>
            </div>
        );
    }



    return (
        <div
            id="dashboard-home"
            tabIndex={-1}
            className="scroll-mt-24 mx-auto w-full max-w-7xl px-3 sm:px-4 outline-none"
            data-onboarding-page="dashboard"
            data-dashboard-surface="user_dashboard"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-desktop-flow-collapsed="true"
            data-user-dashboard-loading-staged="true"
        >
            <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-3">
                <div className="space-y-3 md:space-y-5">
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
