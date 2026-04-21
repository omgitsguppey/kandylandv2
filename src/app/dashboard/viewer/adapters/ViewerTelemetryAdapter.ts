import { useCallback, useEffect, useRef } from "react";
import { Drop } from "@/types/db";
import { trackEvent } from "@/lib/telemetry";
import { useViewerWatchSession } from "@/hooks/useViewerWatchSession";
import { ContentKind, ResolvedContent , sumNumbers, roundSeconds, buildWatchTelemetryMetrics } from "../ViewerHelpers";
import { resolveViewerWatchSeconds } from "@/lib/viewer-watch-session";

interface ViewerTelemetryAdapterProps {
    drop: Drop | null;
    isAuthorized: boolean;
    assetCount: number;
    activeIndex: number;
    resolvedContent: ResolvedContent;
    contentLoading: boolean;
    contentBlobUrl: string | null;
}

const WATCH_CHECKPOINT_SECONDS = [15, 30, 60, 120, 300, 600];

export function useViewerTelemetry({
    drop,
    isAuthorized,
    assetCount,
    activeIndex,
    resolvedContent,
    contentLoading,
    contentBlobUrl,
}: ViewerTelemetryAdapterProps) {
    const previousDropIdRef = useRef<string | null>(null);
    const hasTrackedViewerOpenRef = useRef<string | null>(null);
    const lastTrackedAssetRef = useRef<string | null>(null);
    const consumedAssetKeysRef = useRef<Set<string>>(new Set());
    const watchCheckpointKeysRef = useRef<Set<string>>(new Set());
    
    // Session state
    const sessionStartedAtRef = useRef<number | null>(null);
    const sessionWatchSecondsByAssetRef = useRef<Map<string, number>>(new Map());
    const sessionViewedAssetsRef = useRef<Set<string>>(new Set());
    const sessionCompletedAssetsRef = useRef<Set<string>>(new Set());
    const sessionLoadSamplesRef = useRef<number[]>([]);
    const sessionAssetSwitchCountRef = useRef(0);
    const sessionDownloadCountRef = useRef(0);
    const sessionRelatedClickCountRef = useRef(0);
    const sessionAssetWatchStartedAtRef = useRef<Map<string, number>>(new Map());
    const startedAssetKeysRef = useRef<Set<string>>(new Set());
    const completedAssetKeysRef = useRef<Set<string>>(new Set());

    const isMediaContent = (kind: ContentKind) => kind === "video" || kind === "audio";

    const dropId = drop?.id ?? null;
    const dropTitle = drop?.title ?? "";
    const dropType = drop?.type ?? "";

    const {
        watchSessionId,
        flushSession: flushWatchSession,
        recordDownload: recordWatchDownload,
        recordRelatedClick: recordWatchRelatedClick,
        reportAssetCompleted: reportWatchAssetCompleted,
        reportAssetConsumed: reportWatchAssetConsumed,
        reportAssetLoaded: reportWatchAssetLoaded,
        reportAssetProgress: reportWatchAssetProgress,
        reportAssetStarted: reportWatchAssetStarted,
        reportMediaEnded: reportWatchMediaEnded,
        reportMediaPause: reportWatchMediaPause,
        reportMediaPlay: reportWatchMediaPlay,
        reportMediaSeeking: reportWatchMediaSeeking,
        reportMediaWaiting: reportWatchMediaWaiting,
        reportPlaybackState: reportWatchPlaybackState,
    } = useViewerWatchSession({
        enabled: isAuthorized && Boolean(dropId),
        dropId,
        dropTitle,
        dropCategory: dropType,
        contentCount: assetCount,
        activeAssetIndex: activeIndex,
        activeContentKind: resolvedContent.kind,
    });

    const withWatchSessionParams = useCallback(<T extends Record<string, string | number | boolean>>(params: T) => (
        watchSessionId ? { ...params, watch_session_id: watchSessionId } : params
    ), [watchSessionId]);

    const resetViewerSessionMetrics = useCallback(() => {
        sessionWatchSecondsByAssetRef.current.clear();
        sessionViewedAssetsRef.current.clear();
        sessionCompletedAssetsRef.current.clear();
        sessionLoadSamplesRef.current = [];
        sessionAssetSwitchCountRef.current = 0;
        sessionDownloadCountRef.current = 0;
        sessionRelatedClickCountRef.current = 0;
        sessionAssetWatchStartedAtRef.current.clear();
        consumedAssetKeysRef.current.clear();
        watchCheckpointKeysRef.current.clear();
        startedAssetKeysRef.current.clear();
        completedAssetKeysRef.current.clear();
    }, []);

    const updateSessionWatchTime = useCallback((watchSeconds: number, assetIndex = activeIndex, mode: "max" | "add" = "max") => {
        if (!drop || !Number.isFinite(watchSeconds) || watchSeconds <= 0) return;
        const assetKey = `${drop.id}:${assetIndex}`;
        const normalizedWatchSeconds = roundSeconds(watchSeconds);
        if (normalizedWatchSeconds <= 0) return;

        const current = sessionWatchSecondsByAssetRef.current.get(assetKey) ?? 0;
        sessionWatchSecondsByAssetRef.current.set(
            assetKey,
            mode === "add" ? roundSeconds(current + normalizedWatchSeconds) : Math.max(current, normalizedWatchSeconds),
        );
        sessionViewedAssetsRef.current.add(assetKey);
    }, [activeIndex, drop]);

    const markAssetWatchStarted = useCallback((assetIndex = activeIndex, timestampMs = Date.now()) => {
        if (!drop || isMediaContent(resolvedContent.kind)) return;
        sessionAssetWatchStartedAtRef.current.set(`${drop.id}:${assetIndex}`, timestampMs);
    }, [activeIndex, drop, resolvedContent.kind]);

    const commitAssetWatchTime = useCallback((assetIndex = activeIndex) => {
        if (!drop || isMediaContent(resolvedContent.kind)) return;
        const assetKey = `${drop.id}:${assetIndex}`;
        const startedAtMs = sessionAssetWatchStartedAtRef.current.get(assetKey);
        if (!Number.isFinite(startedAtMs!)) return;

        const elapsedWatchSeconds = resolveViewerWatchSeconds({
            contentKind: resolvedContent.kind,
            watchSeconds: 0,
            assetStartedAtMs: startedAtMs!,
            nowMs: Date.now(),
        });

        if (elapsedWatchSeconds > 0) updateSessionWatchTime(elapsedWatchSeconds, assetIndex, "add");
        sessionAssetWatchStartedAtRef.current.delete(assetKey);
    }, [activeIndex, drop, resolvedContent.kind, updateSessionWatchTime]);

    const finalizeViewerSession = useCallback((reason: string) => {
        if (!drop || !sessionStartedAtRef.current) {
            sessionStartedAtRef.current = null;
            return;
        }
        commitAssetWatchTime();
        void flushWatchSession(reason, { close: true, keepalive: reason === "page_exit" || reason === "viewer_unmounted" });

        const sessionDurationMs = Math.max(0, Date.now() - sessionStartedAtRef.current);
        const watchValues = Array.from(sessionWatchSecondsByAssetRef.current.values());
        const totalWatchSeconds = sumNumbers(watchValues);
        const averageLoadMs = sessionLoadSamplesRef.current.length > 0
            ? Math.round(sumNumbers(sessionLoadSamplesRef.current) / sessionLoadSamplesRef.current.length)
            : 0;

        trackEvent("viewer_session_completed", withWatchSessionParams({
            drop_id: drop.id,
            drop_title: drop.title,
            drop_category: dropType,
            content_count: assetCount,
            session_end_reason: reason,
            duration_ms: sessionDurationMs,
            duration_seconds: Math.round(sessionDurationMs / 1000),
            session_watch_seconds: totalWatchSeconds,
            max_asset_watch_seconds: watchValues.length > 0 ? Math.max(...watchValues) : 0,
            viewed_asset_count: sessionViewedAssetsRef.current.size,
            completed_asset_count: sessionCompletedAssetsRef.current.size,
            asset_start_count: startedAssetKeysRef.current.size,
            asset_completion_count: completedAssetKeysRef.current.size,
            asset_switch_count: sessionAssetSwitchCountRef.current,
            download_count: sessionDownloadCountRef.current,
            related_click_count: sessionRelatedClickCountRef.current,
            average_load_ms: averageLoadMs,
            load_sample_count: sessionLoadSamplesRef.current.length,
        }));

        sessionStartedAtRef.current = null;
        resetViewerSessionMetrics();
    }, [assetCount, commitAssetWatchTime, drop, dropType, flushWatchSession, resetViewerSessionMetrics, withWatchSessionParams]);

    const finalizeViewerSessionRef = useRef(finalizeViewerSession);
    useEffect(() => { finalizeViewerSessionRef.current = finalizeViewerSession; }, [finalizeViewerSession]);

    const trackAssetStarted = useCallback(() => {
        if (!drop) return;
        const assetKey = `${drop.id}:${activeIndex}`;
        markAssetWatchStarted(activeIndex);
        if (startedAssetKeysRef.current.has(assetKey)) return;
        reportWatchAssetStarted();
        startedAssetKeysRef.current.add(assetKey);
        sessionViewedAssetsRef.current.add(assetKey);
        trackEvent("viewer_asset_started", withWatchSessionParams({
            drop_id: drop.id,
            drop_title: drop.title,
            drop_category: dropType,
            asset_index: activeIndex + 1,
            asset_total: assetCount,
            asset_key: assetKey,
            content_kind: resolvedContent.kind,
        }));
    }, [activeIndex, assetCount, drop, dropType, markAssetWatchStarted, reportWatchAssetStarted, resolvedContent.kind, withWatchSessionParams]);

    const trackAssetConsumed = useCallback((watchSeconds: number, assetDurationSeconds?: number) => {
        if (!drop) return;
        const assetKey = `${drop.id}:${activeIndex}`;
        if (consumedAssetKeysRef.current.has(assetKey)) return;

        consumedAssetKeysRef.current.add(assetKey);
        reportWatchAssetConsumed(watchSeconds, assetDurationSeconds);
        trackEvent("viewer_asset_consumed", withWatchSessionParams({
            drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
            asset_index: activeIndex + 1, asset_key: assetKey, content_kind: resolvedContent.kind,
            ...buildWatchTelemetryMetrics(watchSeconds, assetDurationSeconds),
        }));
    }, [activeIndex, drop, dropType, reportWatchAssetConsumed, resolvedContent.kind, withWatchSessionParams]);

    const trackAssetCompleted = useCallback((watchSeconds: number, assetDurationSeconds?: number) => {
        if (!drop) return;
        const assetKey = `${drop.id}:${activeIndex}`;
        if (completedAssetKeysRef.current.has(assetKey)) return;

        if (isMediaContent(resolvedContent.kind)) {
            const committedWatchSeconds = resolveViewerWatchSeconds({
                contentKind: resolvedContent.kind, watchSeconds,
                assetStartedAtMs: sessionAssetWatchStartedAtRef.current.get(assetKey)!, nowMs: Date.now(),
            });
            updateSessionWatchTime(committedWatchSeconds, activeIndex);
        }

        reportWatchAssetCompleted(watchSeconds, assetDurationSeconds);
        if (!consumedAssetKeysRef.current.has(assetKey)) {
            consumedAssetKeysRef.current.add(assetKey);
            reportWatchAssetConsumed(watchSeconds, assetDurationSeconds);
            trackEvent("viewer_asset_consumed", withWatchSessionParams({
                drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
                asset_index: activeIndex + 1, asset_key: assetKey, content_kind: resolvedContent.kind,
                ...buildWatchTelemetryMetrics(watchSeconds, assetDurationSeconds),
            }));
        }
        completedAssetKeysRef.current.add(assetKey);
        sessionCompletedAssetsRef.current.add(assetKey);
        trackEvent("viewer_asset_completed", withWatchSessionParams({
            drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
            asset_index: activeIndex + 1, asset_total: assetCount, asset_key: assetKey,
            content_kind: resolvedContent.kind, ...buildWatchTelemetryMetrics(watchSeconds, assetDurationSeconds),
        }));
    }, [activeIndex, assetCount, drop, dropType, reportWatchAssetCompleted, reportWatchAssetConsumed, resolvedContent.kind, updateSessionWatchTime, withWatchSessionParams]);

    const trackContentLoaded = useCallback((loadMs: number, fromCache: boolean, contentKind: ContentKind) => {
        if (!drop) return;
        const normalizedLoadMs = Math.max(1, Math.round(loadMs));
        sessionLoadSamplesRef.current.push(normalizedLoadMs);
        reportWatchAssetLoaded(normalizedLoadMs);
        trackEvent("viewer_content_loaded", withWatchSessionParams({
            drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
            asset_index: activeIndex + 1, asset_total: assetCount, asset_key: `${drop.id}:${activeIndex}`,
            content_kind: contentKind, load_ms: normalizedLoadMs, from_cache: fromCache,
        }));
    }, [activeIndex, assetCount, drop, dropType, reportWatchAssetLoaded, withWatchSessionParams]);

    const handleRelatedDropClick = useCallback((destination: string, destinationType: string) => {
        if (!drop) return;
        sessionRelatedClickCountRef.current += 1;
        recordWatchRelatedClick();
        trackEvent("viewer_related_drop_clicked", withWatchSessionParams({
            drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
            destination, destination_type: destinationType, asset_index: activeIndex + 1,
        }));
    }, [activeIndex, drop, dropType, recordWatchRelatedClick, withWatchSessionParams]);

    const trackWatchCheckpoint = useCallback((watchSeconds: number, assetDurationSeconds?: number) => {
        if (!drop) return;
        const assetKey = `${drop.id}:${activeIndex}`;
        const checkpointKey = `${assetKey}:${watchSeconds}`;
        if (watchCheckpointKeysRef.current.has(checkpointKey)) return;

        watchCheckpointKeysRef.current.add(checkpointKey);
        trackEvent("viewer_watch_checkpoint", withWatchSessionParams({
            drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
            asset_index: activeIndex + 1, asset_key: assetKey, content_kind: resolvedContent.kind,
            checkpoint_seconds: watchSeconds, ...buildWatchTelemetryMetrics(watchSeconds, assetDurationSeconds),
        }));
    }, [activeIndex, drop, dropType, resolvedContent.kind, withWatchSessionParams]);


    useEffect(() => {
        return () => { finalizeViewerSessionRef.current("viewer_unmounted"); };
    }, []);

    useEffect(() => {
        if (!drop || !isAuthorized) return;
        const handlePageExit = () => finalizeViewerSessionRef.current("page_exit");
        window.addEventListener("pagehide", handlePageExit);
        window.addEventListener("beforeunload", handlePageExit);
        return () => {
            window.removeEventListener("pagehide", handlePageExit);
            window.removeEventListener("beforeunload", handlePageExit);
        };
    }, [drop, isAuthorized]);

    useEffect(() => {
        if (!drop || !isAuthorized || !watchSessionId) return;
        const handleVisibilityChange = () => {
            if (document.visibilityState !== "hidden") return;
            trackEvent("viewer_backgrounded", withWatchSessionParams({
                drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
                asset_index: activeIndex + 1, asset_key: `${drop.id}:${activeIndex}`, content_kind: resolvedContent.kind,
            }));
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [activeIndex, drop, dropType, isAuthorized, resolvedContent.kind, watchSessionId, withWatchSessionParams]);

    useEffect(() => {
        if (!drop || !isAuthorized || !watchSessionId) {
            hasTrackedViewerOpenRef.current = null;
            return;
        }
        if (hasTrackedViewerOpenRef.current === watchSessionId) return;
        hasTrackedViewerOpenRef.current = watchSessionId;
        trackEvent("viewer_opened", withWatchSessionParams({
            drop_id: drop.id, drop_title: drop.title, drop_category: dropType, content_count: assetCount,
        }));
    }, [assetCount, drop, dropType, isAuthorized, watchSessionId, withWatchSessionParams]);

    useEffect(() => {
        if (!dropId || !isAuthorized || !watchSessionId) return;
        sessionStartedAtRef.current = Date.now();
        resetViewerSessionMetrics();
        trackEvent("viewer_session_started", withWatchSessionParams({
            drop_id: dropId, drop_title: dropTitle, drop_category: dropType, content_count: assetCount,
        }));
        return () => finalizeViewerSession("drop_changed");
    }, [assetCount, dropId, dropTitle, dropType, finalizeViewerSession, isAuthorized, resetViewerSessionMetrics, watchSessionId, withWatchSessionParams]);

    useEffect(() => {
        if (!drop || !isAuthorized || assetCount <= 1) {
            lastTrackedAssetRef.current = null;
            return;
        }
        const assetKey = `${drop.id}:${activeIndex}`;
        if (lastTrackedAssetRef.current === assetKey) return;
        if (lastTrackedAssetRef.current !== null) {
            sessionAssetSwitchCountRef.current += 1;
            trackEvent("viewer_asset_changed", withWatchSessionParams({
                drop_id: drop.id, drop_title: drop.title, drop_category: dropType,
                asset_index: activeIndex + 1, asset_total: assetCount, asset_key: assetKey,
            }));
        }
        lastTrackedAssetRef.current = assetKey;
    }, [activeIndex, assetCount, drop, dropType, isAuthorized, withWatchSessionParams]);

    useEffect(() => {
        if (!drop || !isAuthorized || contentLoading || !contentBlobUrl || isMediaContent(resolvedContent.kind)) return;
        markAssetWatchStarted(activeIndex);
        return () => commitAssetWatchTime(activeIndex);
    }, [activeIndex, commitAssetWatchTime, contentBlobUrl, contentLoading, drop, isAuthorized, markAssetWatchStarted, resolvedContent.kind]);

    useEffect(() => {
        if (!drop || !isAuthorized || contentLoading || !contentBlobUrl) return;
        if (resolvedContent.kind === "video" || resolvedContent.kind === "audio") return;
        const currentAssetIndex = activeIndex;
        const timerId = window.setTimeout(() => {
            const elapsedWatchSeconds = resolveViewerWatchSeconds({
                contentKind: resolvedContent.kind, watchSeconds: 6,
                assetStartedAtMs: sessionAssetWatchStartedAtRef.current.get(`${drop.id}:${currentAssetIndex}`)!,
                nowMs: Date.now(),
            });
            trackAssetConsumed(elapsedWatchSeconds, elapsedWatchSeconds);
            trackAssetCompleted(elapsedWatchSeconds, elapsedWatchSeconds);
        }, 6000);
        return () => window.clearTimeout(timerId);
    }, [activeIndex, contentBlobUrl, contentLoading, drop, isAuthorized, resolvedContent.kind, trackAssetCompleted, trackAssetConsumed]);

    useEffect(() => {
        if (!drop || !isAuthorized || contentLoading || !contentBlobUrl) return;
        trackAssetStarted();
    }, [contentBlobUrl, contentLoading, drop, isAuthorized, trackAssetStarted]);

    const handleMediaTimeUpdate = useCallback((currentTime: number, assetDurationSeconds?: number) => {
        if (!Number.isFinite(currentTime) || currentTime <= 0) return;
        reportWatchAssetProgress(currentTime, assetDurationSeconds);
        updateSessionWatchTime(currentTime);

        WATCH_CHECKPOINT_SECONDS.forEach((checkpointSeconds) => {
            if (currentTime >= checkpointSeconds) {
                if (checkpointSeconds === 15) trackAssetConsumed(checkpointSeconds, assetDurationSeconds);
                trackWatchCheckpoint(checkpointSeconds, assetDurationSeconds);
            }
        });
    }, [reportWatchAssetProgress, trackAssetConsumed, trackWatchCheckpoint, updateSessionWatchTime]);

    const handleAssetSwitch = useCallback((newActiveIndex: number, newContentKind: ContentKind) => {
        if (!drop) return;
        trackAssetStarted();
    }, [drop, trackAssetStarted]);

    return {
        handleMediaTimeUpdate,
        handleRelatedDropClick,
        trackAssetCompleted,
        trackContentLoaded,
        reportWatchMediaPlay,
        reportWatchMediaPause,
        reportWatchMediaSeeking,
        reportWatchMediaWaiting,
        reportWatchMediaEnded,
        reportWatchPlaybackState,
        flushSessionTelemetry: () => finalizeViewerSession("page_exit"),
        recordDownload: (index: number) => {
            sessionDownloadCountRef.current += 1;
            recordWatchDownload();
            trackEvent("viewer_source_downloaded", withWatchSessionParams({
                drop_id: drop?.id ?? "",
                drop_title: drop?.title ?? "",
                drop_category: drop?.type ?? "",
                asset_index: index + 1,
            }));
        },
        handleAssetSwitch,
    };
}
