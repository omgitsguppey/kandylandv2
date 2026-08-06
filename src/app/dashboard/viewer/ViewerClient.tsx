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
            <div className="max-w-4xl mx-auto pt-20 px-4 text-center">
                <Lock className="w-12 h-12 text-white/50 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Sign in Required</h1>
                <p className="text-gray-400 mb-6">You must be signed in to view this content.</p>
                <Link href="/auth" className="px-6 py-3 bg-white text-black font-bold rounded-full">Sign In</Link>
            </div>
        );
    }

    if (accessState.status === "denied_drop_missing" || !drop) {
        return (
            <div className="max-w-4xl mx-auto pt-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Drop unavailable</h1>
                <p className="text-gray-400 mb-6">This drop could not be found.</p>
                <button onClick={() => router.push(USER_LIBRARY_ROUTE)} className="px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20">Back to Library</button>
            </div>
        );
    }

    if (accessState.status === "error" || contentError) {
        return (
            <div className="max-w-4xl mx-auto pt-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Drop access is still loading</h1>
                <p className="text-gray-400 mb-6">We could not confirm access for this drop. Refresh the page or report the issue so we can inspect the access state.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button onClick={() => router.refresh()} className="px-6 py-3 bg-white text-black font-bold rounded-full">Refresh</button>
                    <ReportBugButton context={`drop-view-access:${accessState.status}`} variant="pill" label="Report access issue" />
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="max-w-4xl mx-auto pt-20 px-4 text-center">
                <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Not Authorized</h1>
                <p className="text-gray-400 mb-6">You do not have access to this drop.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button onClick={() => router.push("/drops")} className="px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20">Go Back</button>
                    <button onClick={() => router.push("/dashboard/library")} className="px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20">Open Library</button>
                    <ReportBugButton context={`drop-view-access:${accessState.status}`} variant="pill" label="Report access issue" />
                </div>
            </div>
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
                    className="flex items-center gap-2 py-2 text-sm text-gray-400 transition-colors group hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 transition-all group-hover:border-white/20 group-hover:bg-white/10">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span className="hidden font-medium sm:inline">Back to Library</span>
                    <span className="font-medium sm:hidden">Back</span>
                </Link>
            )}
            securityOverlay={isSecurityTriggered && securityWarning ? (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-8 text-center backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 animate-pulse">
                        <ShieldCheck className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="mb-3 text-2xl font-black uppercase tracking-wider text-white">{securityWarning.label}</h2>
                    <p className="mb-8 max-w-sm text-sm leading-relaxed text-gray-400 md:text-base">{securityWarning.message}</p>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-mono text-xs text-gray-500">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        Monitoring active session
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
