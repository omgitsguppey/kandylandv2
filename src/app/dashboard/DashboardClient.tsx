"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { usePageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Card } from "@/components/creative-tim/ui/card";
import { SignedInDashboardHeader } from "@/components/creative-tim/kandydrops/signed-in/SignedInDashboardHeader";
import { SignedInDashboardJourney } from "@/components/creative-tim/kandydrops/signed-in/SignedInDashboardJourney";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { DailyCheckIn } from "@/components/Dashboard/DailyCheckIn";
import { CollectionList } from "@/components/Dashboard/CollectionList";
import { useDrops } from "@/hooks/useDrops";
import { mergeResolvedDropsById } from "@/lib/drop-dashboard";
import { isDropActiveNow } from "@/lib/drop-status";
import { CREATOR_DASHBOARD_ROUTE } from "@/lib/creator-profile-routing";
import { getMobileModuleClassNames } from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import { getMobileSkeletonClass } from "@/lib/frontend-hardening/ui/loading-state-contract";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";
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
        <div className="h-5 w-40 rounded-lg bg-muted" />
        <div className="mt-3 h-20 rounded-2xl bg-muted" />
      </div>
    ),
  },
);

interface DashboardClientProps {
  drops: Drop[];
  creatorRailProfiles: CreatorDiscoveryProfile[];
}

export default function DashboardClient({ drops, creatorRailProfiles }: DashboardClientProps) {
  const { user, userProfile, loading } = useAuth();
  const { openPurchaseModal } = useUI();
  const router = useRouter();
  const initialActiveDrops = useMemo(() => drops.filter((drop) => isDropActiveNow(drop)), [drops]);
  const { drops: liveActiveDrops, nowMs } = useDrops(["active"], initialActiveDrops);
  const visibleDrops = useMemo(
    () => mergeResolvedDropsById(drops, liveActiveDrops, nowMs),
    [drops, liveActiveDrops, nowMs],
  );
  const profileReady = !loading && Boolean(user && userProfile?.uid === user.uid);
  const isCreatorPrimaryDashboard = profileReady && userProfile?.role === "creator";
  const profileBalance = Number(userProfile?.gumDropsBalance ?? 0);
  const gumDropsBalance = Number.isFinite(profileBalance) ? Math.max(0, profileBalance) : 0;

  usePageViewEvent({
    eventName: "dashboard_viewed",
    actor: { id: user?.uid ?? null, loading },
    ready: profileReady,
  });

  useEffect(() => {
    if (!isCreatorPrimaryDashboard) {
      return;
    }

    router.replace(CREATOR_DASHBOARD_ROUTE);
  }, [isCreatorPrimaryDashboard, router]);

  if (!profileReady || !userProfile) {
    return (
      <div
        className="mx-auto w-full min-w-0 max-w-7xl px-4"
        data-mobile-density="compact"
        data-mobile-sprawl-guard="true"
        data-mobile-organization="summary-first"
        data-mobile-drilldown="true"
        data-desktop-flow-collapsed="true"
        data-user-dashboard-loading-staged="true"
      >
        <div className="space-y-4 sm:space-y-5">
          <div className={userOverviewSkeletonClassName} data-mobile-skeleton="user-dashboard-overview" />
          <div className={userListSkeletonClassName} data-mobile-skeleton="user-dashboard-now" />
          <div
            className={`${userListSkeletonClassName} min-h-[13rem]`}
            data-mobile-skeleton="user-dashboard-collection"
          />
        </div>
      </div>
    );
  }

  if (isCreatorPrimaryDashboard) {
    return (
      <div
        className="mx-auto w-full max-w-5xl px-3 pb-[calc(env(safe-area-inset-bottom)+9rem)] pt-3 sm:px-4 sm:pt-4"
        data-dashboard-surface="creator_redirect"
        data-creator-dashboard-route-boundary="redirect_to_creator_dashboard"
        data-user-dashboard-modules-rendered="false"
      >
        <Card className="min-w-0 gap-0 p-4 text-sm" role="status">
          <p>Opening Creator Dashboard...</p>
        </Card>
      </div>
    );
  }

  return (
    <div
      id="dashboard-home"
      tabIndex={-1}
      className="mx-auto w-full min-w-0 max-w-7xl scroll-mt-24 px-4 pb-8 outline-none"
      data-onboarding-page="dashboard"
      data-dashboard-surface="user_dashboard"
      data-mobile-density="compact"
      data-mobile-sprawl-guard="true"
      data-mobile-organization="summary-first"
      data-mobile-drilldown="true"
      data-desktop-flow-collapsed="true"
      data-user-dashboard-loading-staged="true"
    >
      <SignedInDashboardJourney
        header={(
          <SignedInDashboardHeader
            gumDropsBalance={gumDropsBalance}
            onWalletPress={() => openPurchaseModal()}
          />
        )}
        now={<DailyCheckIn />}
        yourKandy={(
          <main>
            <CollectionList drops={visibleDrops} userProfile={userProfile} currentTimeMs={nowMs} />
          </main>
        )}
        keepExploring={(
          <>
            <CreatorDiscoveryRail surface="dashboard" compact initialCreators={creatorRailProfiles} />
            <RecentActivityFeed />
          </>
        )}
      />
    </div>
  );
}
