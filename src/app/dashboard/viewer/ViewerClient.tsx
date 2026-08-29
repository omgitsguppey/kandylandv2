"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Drop } from "@/types/db";
import { ReportBugButton } from "@/components/Feedback/ReportBugButton";
import { recordClientBreadcrumb, recordClientDiagnostic } from "@/lib/client-diagnostics";
import { useViewerTelemetry } from "./adapters/ViewerTelemetryAdapter";
import { useViewerState } from "./hooks/useViewerState";
import { useViewerSecurity } from "./hooks/useViewerSecurity";
import { useViewerFeedback } from "./hooks/useViewerFeedback";
import { USER_LIBRARY_ROUTE } from "@/lib/creator-profile-routing";
import {
    isDropViewAccessLoading,
    resolveDropViewAccess,
    telemetryEventForDropViewAccess,
} from "@/lib/drop-view-access";
import { trackEvent } from "@/lib/telemetry";

import { ViewerSkeleton } from "./components/ViewerSkeleton";
import { MediaViewer } from "./components/MediaViewer";
import { ThumbnailsSlider } from "./components/ThumbnailsSlider";
import { DropInfoOverlay } from "./components/DropInfoOverlay";
import { ViewerFrame } from "./components/ViewerFrame";
import { ContentSatisfactionPrompt } from "@/components/Feedback/ContentSatisfactionPrompt";
import { ViewerAccessState } from "@/components/creative-tim/kandydrops/viewer/ViewerAccessState";

interface ViewerClientProps {
    drop: Drop | null;
    requestedDropId?: string | null;
    initialCreatorProfile?: {
        uid: string;
        displayName: string;
        username: string;
        photoURL: string | null;
        isVerified: boolean;
    } | null;
}

const ENTITLEMENT_LOADING_TIMEOUT_MS = 10_000;

export function ViewerClient({ drop, requestedDropId, initialCreatorProfile }: ViewerClientProps) {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const viewerContentRef = useRef<HTMLDivElement>(null);
    const [entitlementTimedOut, setEntitlementTimedOut] = useState(false);
    const trackedAccessStatusRef = useRef<string | null>(null);
    const [satisfactionPrompt, setSatisfactionPrompt] = useState<{
        key: string;
        watchSeconds: number;
        durationSeconds?: number;
        mediaIndex: number;
        mediaType: string;
        assetKey: string;
    } | null>(null);

    useEffect(() => {
        if (!user || userProfile || authLoading) {
            return;
        }

        const timer = window.setTimeout(() => setEntitlementTimedOut(true), ENTITLEMENT_LOADING_TIMEOUT_MS);
        return () => window.clearTimeout(timer);
    }, [authLoading, user, userProfile]);
    const effectiveEntitlementTimedOut = !user || userProfile || authLoading ? false : entitlementTimedOut;

    const accessState = useMemo(() => resolveDropViewAccess({
        drop,
        requestedDropId: requestedDropId ?? drop?.id ?? null,
        authLoading,
        userId: user?.uid ?? null,
        userProfile,
        entitlementTimedOut: effectiveEntitlementTimedOut,
    }), [authLoading, drop, effectiveEntitlementTimedOut, requestedDropId, user?.uid, userProfile]);
    const isAuthorized = accessState.allowed;

    // 2. Telemetry mounting happens internally within useViewerTelemetry

    // 3. State Hooks
    const {
        activeIndex,
        setActiveIndex,
        assetCount,
        contentBlobUrl,
        resolvedContent,
        contentLoading,
        contentError,
        thumbnailItems,
    } = useViewerState({
        drop,
        isAuthorized,
        trackContentLoaded: (ms, cached, kind) => telemetry.trackContentLoaded(ms, cached, kind)
    });

    useEffect(() => {
        const trackingKey = `${drop?.id ?? "missing"}:${accessState.status}:${accessState.reason}`;
        if (trackedAccessStatusRef.current === trackingKey) return;
        trackedAccessStatusRef.current = trackingKey;

        recordClientBreadcrumb("state", "drop_view_access_state", {
            dropId: drop?.id ?? requestedDropId ?? "missing",
            accessStatus: accessState.status,
            accessReason: accessState.reason,
            route: "/dashboard/viewer",
        });
        if (!accessState.loading) {
            recordClientDiagnostic("ui", "Drop viewer access resolved", {
                dropId: drop?.id ?? requestedDropId ?? "missing",
                accessStatus: accessState.status,
                accessReason: accessState.reason,
                route: "/dashboard/viewer",
            }, accessState.allowed ? "info" : accessState.status === "error" ? "error" : "warn");
        }

        const eventName = telemetryEventForDropViewAccess(accessState);
        if (!eventName) return;
        trackEvent(eventName, {
            drop_id: drop?.id ?? requestedDropId ?? "",
            access_status: accessState.status,
            access_reason: accessState.reason,
            route: "/dashboard/viewer",
            source_component: "ViewerClient",
        });
    }, [accessState, drop?.id, requestedDropId]);

    // 2. Telemetry mounting
    const telemetry = useViewerTelemetry({
        drop,
        isAuthorized,
        assetCount,
        activeIndex,
        resolvedContent,
        contentLoading,
        contentBlobUrl,
        contentElementRef: viewerContentRef,
    });

    // 4. Security Hook
    const {
        isSecurityTriggered,
        securityWarning,
        preventContextMenu,
    } = useViewerSecurity({
        drop,
        isAuthorized,
        activeIndex,
        contentKind: resolvedContent.kind,
    });

    // 5. Feedback Hook
    const {
        following,
        submittingFollow,
        feedbackComplete,
        submittingFeedback,
        feedbackValue,
        retentionDrops,
        handleFollow,
        handleFeedback,
    } = useViewerFeedback({
        drop,
        isAuthorized,
        initialCreatorProfile,
    });

    // Asset switching side-effects
    useEffect(() => {
        if (!isAuthorized || !drop) return;
        telemetry.handleAssetSwitch(activeIndex, resolvedContent.kind);
    }, [activeIndex, isAuthorized, drop, telemetry, resolvedContent.kind]);

    useEffect(() => {
        if (!drop || !isAuthorized || contentLoading || !contentBlobUrl) return;
        if (resolvedContent.kind !== "image" && resolvedContent.kind !== "pdf") return;

        const timer = window.setTimeout(() => {
            const assetKey = `${drop.id}:${activeIndex}`;
            setSatisfactionPrompt({
                key: `${assetKey}:${resolvedContent.kind}:visible`,
                watchSeconds: resolvedContent.kind === "pdf" ? 12 : 8,
                mediaIndex: activeIndex,
                mediaType: resolvedContent.kind,
                assetKey,
            });
        }, resolvedContent.kind === "pdf" ? 12_000 : 8_000);

        return () => window.clearTimeout(timer);
    }, [activeIndex, contentBlobUrl, contentLoading, drop, isAuthorized, resolvedContent.kind]);

    // Early Returns
    const shouldShowStableSkeleton = isDropViewAccessLoading(accessState)
        || (isAuthorized && !contentError && !contentBlobUrl && assetCount > 0)
        || (contentLoading && !contentBlobUrl);

    if (shouldShowStableSkeleton) {
        return <ViewerSkeleton />;
    }

    if (accessState.status === "denied_not_logged_in") {
        return (
            <ViewerAccessState
                eyebrow="Private Drop"
                icon={<Lock className="h-7 w-7" />}
                title="Sign in to continue"
                message="Sign in to view this Drop in your collection."
            >
                <Link href="/auth" className="inline-flex min-h-11 items-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600">
                    Sign in
                </Link>
            </ViewerAccessState>
        );
    }

    if (accessState.status === "denied_drop_missing" || !drop) {
        return (
            <ViewerAccessState
                eyebrow="Viewing room"
                icon={<ShieldCheck className="h-7 w-7" />}
                title="This Drop is unavailable"
                message="This Drop could not be found in your collection."
            >
                <button type="button" onClick={() => router.push(USER_LIBRARY_ROUTE)} className="inline-flex min-h-11 items-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600">
                    Back to library
                </button>
            </ViewerAccessState>
        );
    }

    if (accessState.status === "error" || contentError) {
        return (
            <ViewerAccessState
                eyebrow="Viewing room"
                icon={<ShieldCheck className="h-7 w-7" />}
                title="Drop access needs attention"
                message="We could not confirm access for this Drop. Refresh the page or report the issue."
            >
                    <button type="button" onClick={() => router.refresh()} className="inline-flex min-h-11 items-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600">Refresh</button>
                    <ReportBugButton context={`drop-view-access:${accessState.status}`} variant="pill" label="Report access issue" />
            </ViewerAccessState>
        );
    }

    if (!isAuthorized) {
        return (
            <ViewerAccessState
                eyebrow="Private Drop"
                icon={<Lock className="h-7 w-7" />}
                title="This Drop is not in your collection"
                message="Return to your library or browse Drops to find something new to unwrap."
            >
                    <button type="button" onClick={() => router.push("/drops")} className="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Browse Drops</button>
                    <button type="button" onClick={() => router.push("/dashboard/library")} className="inline-flex min-h-11 items-center rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-purple/25 transition hover:bg-fuchsia-600">Open library</button>
                    <ReportBugButton context={`drop-view-access:${accessState.status}`} variant="pill" label="Report access issue" />
            </ViewerAccessState>
        );
    }

    const viewerStageHeight = resolvedContent.kind === "audio" ? "h-[300px] md:h-[400px]" : "h-[65vh] md:h-[75vh]";
    const hasThumbnailRail = assetCount > 1;

    return (
        <ViewerFrame
            viewerStageHeight={viewerStageHeight}
            backBar={(
                <Link
                    href={USER_LIBRARY_ROUTE}
                    onClick={() => telemetry.flushSessionTelemetry()}
                    className="group flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition group-hover:border-brand-purple/40 group-hover:bg-brand-purple/10">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span className="hidden font-medium sm:inline">Back to Library</span>
                    <span className="font-medium sm:hidden">Back</span>
                </Link>
            )}
            securityOverlay={isSecurityTriggered && securityWarning ? (
                <div className="absolute inset-0 z-50 grid place-items-center bg-black/90 p-6 text-center backdrop-blur-xl">
                    <div className="max-w-md rounded-3xl border border-red-400/25 bg-slate-950/90 p-7 shadow-2xl shadow-black/40">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
                        <ShieldCheck className="h-8 w-8 text-red-300" />
                    </div>
                    <p className="text-sm font-semibold text-red-200">Viewing paused</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{securityWarning.label}</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{securityWarning.message}</p>
                    </div>
                </div>
            ) : null}
            mediaStage={(
                <div
                    ref={viewerContentRef}
                    data-watch-session-visibility-owner="intersection-observer"
                    className={`absolute inset-0 z-10 transition-opacity duration-300 ${isSecurityTriggered ? "opacity-0 pointer-events-none select-none blur-xl" : "opacity-100"}`}
                >
                    <MediaViewer
                        drop={drop}
                        contentBlobUrl={contentBlobUrl}
                        resolvedContent={resolvedContent}
                        activeIndex={activeIndex}
                        contentLoading={contentLoading}
                        preventContextMenu={preventContextMenu}
                        reportWatchMediaPlay={() => telemetry.reportWatchMediaPlay()}
                        reportWatchMediaPause={(t, d) => telemetry.reportWatchMediaPause(t, d)}
                        reportWatchMediaSeeking={(s, e, d) => telemetry.reportWatchMediaSeeking(s, e, d)}
                        reportWatchMediaWaiting={(s) => telemetry.reportWatchMediaWaiting(s)}
                        reportWatchPlaybackState={(r, m) => telemetry.reportWatchPlaybackState(r, m)}
                        handleMediaTimeUpdate={(c, d) => telemetry.handleMediaTimeUpdate(c, d)}
                        trackAssetCompleted={(c, d) => {
                            telemetry.trackAssetCompleted(c, d);
                            const assetKey = `${drop.id}:${activeIndex}`;
                            setSatisfactionPrompt({
                                key: `${assetKey}:completed:${Math.round(c)}`,
                                watchSeconds: c,
                                durationSeconds: d,
                                mediaIndex: activeIndex,
                                mediaType: resolvedContent.kind,
                                assetKey,
                            });
                        }}
                        reportWatchMediaEnded={(t, d) => telemetry.reportWatchMediaEnded(t, d)}
                    />
                </div>
            )}
            thumbnailRail={hasThumbnailRail ? (
                <ThumbnailsSlider
                    assetCount={assetCount}
                    activeIndex={activeIndex}
                    thumbnailItems={thumbnailItems}
                    setActiveIndex={setActiveIndex}
                />
            ) : null}
            details={(
                <DropInfoOverlay
                    drop={drop}
                    user={user}
                    userProfile={userProfile}
                    contentBlobUrl={contentBlobUrl}
                    activeIndex={activeIndex}
                    initialCreatorProfile={initialCreatorProfile}
                    following={following}
                    submittingFollow={submittingFollow}
                    handleFollow={handleFollow}
                    feedbackComplete={feedbackComplete}
                    submittingFeedback={submittingFeedback}
                    feedbackValue={feedbackValue}
                    handleFeedback={handleFeedback}
                    retentionDrops={retentionDrops}
                    handleRelatedDropClick={(d, t) => telemetry.handleRelatedDropClick(d, t)}
                    recordDownload={() => telemetry.recordDownload(activeIndex)}
                />
            )}
            satisfaction={(
                <ContentSatisfactionPrompt
                    dropId={drop.id}
                    creatorId={drop.creatorId}
                    category={drop.type}
                    assetKey={satisfactionPrompt?.assetKey || `${drop.id}:${activeIndex}`}
                    mediaIndex={(satisfactionPrompt?.mediaIndex ?? activeIndex) + 1}
                    mediaType={satisfactionPrompt?.mediaType || resolvedContent.kind}
                    viewerSessionId={telemetry.watchSessionId ?? undefined}
                    meaningfulConsumptionKey={satisfactionPrompt?.key}
                    completionQuality={satisfactionPrompt?.durationSeconds
                        ? Math.min(1, satisfactionPrompt.watchSeconds / Math.max(1, satisfactionPrompt.durationSeconds))
                        : satisfactionPrompt
                            ? 0.7
                            : 0}
                    repeatCreatorInterest={following ? 1 : 0}
                    lowRefundRisk={1}
                />
            )}
        />
    );
}
