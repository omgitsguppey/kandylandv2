"use client";

import { ContentFrame } from "@/components/ui/content-layout";

import { Card } from "@/components/ui/card";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";

import { ArrowUpRight } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

import { CREATOR_DROP_ROUTE_STATE } from "@/lib/creator-profile-routing";

import type { UserProfile } from "@/types/db";
import { CreatorAccessStateSection } from "@/components/creative-tim/kandydrops/creator/CreatorAccessStateSection";
import { CreatorOperatingRunway } from "@/components/creative-tim/kandydrops/creator/CreatorOperatingRunway";
import { CreatorWorkspaceFrame } from "./CreatorWorkspaceFrame";
import { CreatorActionQueuePanel } from "./creator-workspace/CreatorActionQueuePanel";
import { CreatorBroadcastCard } from "./creator-workspace/CreatorBroadcastCard";
import { CreatorDashboardSourceNotice, CreatorWorkspaceStatusPill } from "./creator-workspace/CreatorDashboardSourceNotice";
import { CreatorFanPassCrmPanel } from "./creator-workspace/CreatorFanPassCrmPanel";

import { useCreatorWorkspace } from "./useCreatorWorkspace";

export function CreatorWorkspacePanel( { userProfile }: { userProfile: UserProfile }) {
const { creatorApplication, isCreatorOperator, isProjectionMode, projectionDisplayName, hasCreatorWorkspace, settingsSourceNotice, requests, bookings, subscriptions, moduleErrors, moduleState, busyAction, broadcastDraft, setBroadcastDraft, onboardingSummary, blockingReasons, moduleErrorEntries, settingsModuleError, handleRequestAction, handleBookingAction, handleBroadcastSend, actionNeededCount, broadcastCapabilitySource, broadcastSourceReady, overviewStatus, runwayFacts, submitSettingsBug } = useCreatorWorkspace({ userProfile });
if (!hasCreatorWorkspace) return null;

return (
        <CreatorWorkspaceFrame
            className="mb-4 pt-2 pb-8 sm:pt-0 md:mb-8 md:pb-0"
            data-creator-dashboard-content-boundary="creator_only"
            data-creator-dashboard-landing-density="mobile_compact"
            data-creator-landing-mobile-density="compact_v2"
            data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}
            data-creator-landing-error-language="human"
            data-user-dashboard-modules-rendered="false"
            data-bottom-nav-safe="true"
            data-report-issue-safe-offset="bottom-nav"
        >
            {isProjectionMode ? (
                <Card className="gap-0 py-0 mb-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 text-sm text-foreground">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Admin projection</p>
                            <p className="mt-1 font-semibold">Viewing {projectionDisplayName}&apos;s creator workspace</p>
                            <p className="mt-1 text-sm text-foreground">
                                Read-only creator dashboard preview for {projectionDisplayName}. Writes are blocked.
                            </p>
                        </div>
                        <CreatorWorkspaceStatusPill label="Read-only" tone="warn" />
                    </div>
                </Card>
            ) : null}

            {!isCreatorOperator ? (
                <CreatorAccessStateSection
                    eyebrow="Creator access"
                    heading={onboardingSummary.label}
                    summary={onboardingSummary.summary}
                    status={
                        <>
                            <CreatorWorkspaceStatusPill label={onboardingSummary.stage} tone={creatorApplication?.approvalStatus === "creator_approved" ? "good" : blockingReasons.length > 0 ? "warn" : "neutral"} />
                            {creatorApplication?.readyForApproval ? <CreatorWorkspaceStatusPill label="Ready" tone="good" /> : null}
                            {typeof creatorApplication?.queuePosition === "number" && creatorApplication.queuePosition > 0 ? (
                                <CreatorWorkspaceStatusPill label={"#" + creatorApplication.queuePosition + " in queue"} />
                            ) : null}
                        </>
                    }
                    action={
                        <Link href="/creators/waitlist" className={buttonVariants({ variant: "outline" })}>
                            View application <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    }
                />
            ) : (
                <CreatorOperatingRunway
                    actionNeededCount={actionNeededCount}
                    connection={
                        <CreatorBroadcastCard
                            broadcastDraft={broadcastDraft}
                            broadcastSourceReady={broadcastSourceReady}
                            broadcastCapabilitySource={broadcastCapabilitySource}
                            busy={busyAction === "broadcast:send"}
                            isProjectionMode={isProjectionMode}
                            onDraftChange={setBroadcastDraft}
                            onSend={handleBroadcastSend}
                        />
                    }
                    context={
                        <CreatorFanPassCrmPanel
                            subscriptions={subscriptions}
                            subscriptionsModuleError={moduleErrors.subscriptions}
                        />
                    }
                    facts={runwayFacts}
                    isProjectionMode={isProjectionMode}
                    nextAction={
                        <CreatorActionQueuePanel
                            requests={requests}
                            bookings={bookings}
                            bookingsModuleError={moduleErrors.bookings}
                            bookingsModuleState={moduleState.bookings}
                            busyAction={busyAction}
                            isProjectionMode={isProjectionMode}
                            onRequestAction={handleRequestAction}
                            onBookingAction={handleBookingAction}
                        />
                    }
                    overviewStatus={overviewStatus}
                    projectionDisplayName={projectionDisplayName}
                    sourceNotice={
                        <CreatorDashboardSourceNotice
                        settingsModuleError={settingsModuleError}
                        settingsSourceNotice={settingsSourceNotice}
                        moduleErrorEntries={moduleErrorEntries}
                        onSubmitSettingsBug={submitSettingsBug}
                        />
                    }
                />
            )}
        </CreatorWorkspaceFrame>
    );
}

export function CreatorDashboardLandingRoute() {
    const { userProfile, loading } = useAuth();

    if (loading || !userProfile) {
        return (
            <div className="mx-auto w-full max-w-5xl px-3 pt-3 pb-8 sm:px-4 sm:pt-4 sm:pb-8" data-creator-landing-mobile-density="compact_v2">
                <div className="h-32 rounded-2xl bg-secondary sm:h-40" />
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-28 rounded-2xl bg-secondary sm:h-32" />
                    ))}
                </div>
            </div>
        );
    }
    return (
        <main
            className="min-h-[calc(100dvh-var(--root-shell-top-spacing,5rem))] bg-background"
            data-dashboard-surface="creator_dashboard"
            data-creator-dashboard-route="landing"
            data-creator-dashboard-content-boundary="creator_only"
            data-creator-dashboard-landing-density="mobile_compact"
            data-creator-landing-mobile-density="compact_v2"
            data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}
            data-creator-landing-error-language="human"
            data-user-dashboard-modules-rendered="false"
            data-bottom-nav-safe="true"
            data-report-issue-safe-offset="bottom-nav"
        >
            <ContentFrame><CreatorWorkspacePanel userProfile={userProfile} /></ContentFrame>
        </main>
    );
}
