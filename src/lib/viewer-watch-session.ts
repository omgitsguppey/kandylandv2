import {
    computeLiteralValidWatchMs,
    IMAGE_WATCH_THRESHOLDS_MS,
    inferLiteralWatchMediaType,
    isImageManualAdvanceCompletionEligible,
} from "@/lib/behavioral/watch-time-truth";
import { computeWatchScore, type WatchScoreTier } from "@/lib/watch-time-scoring";

export const VIEWER_WATCH_CONTENT_KINDS = ["video", "audio", "image", "pdf", "unknown"] as const;

export type ViewerWatchContentKind = (typeof VIEWER_WATCH_CONTENT_KINDS)[number];

export const VIEWER_WATCH_SESSION_OUTCOMES = ["bounce", "abandoned", "engaged", "converted", "completed"] as const;
export const VIEWER_WATCH_DROP_OFF_STAGES = ["opened_only", "started_only", "meaningful_watch", "converted", "completed"] as const;
export const VIEWER_WATCH_CAPTURE_QUALITIES = [
    "full",
    "replayed",
    "gap_detected",
    "flush_degraded",
    "close_missing",
] as const;
export const VIEWER_WATCH_CAPTURE_TRANSPORTS = [
    "fetch",
    "keepalive_fetch",
    "replay_fetch",
    "unknown",
] as const;

export type ViewerWatchSessionOutcome = (typeof VIEWER_WATCH_SESSION_OUTCOMES)[number];
export type ViewerWatchDropOffStage = (typeof VIEWER_WATCH_DROP_OFF_STAGES)[number];
export type ViewerWatchCaptureQuality = (typeof VIEWER_WATCH_CAPTURE_QUALITIES)[number];
export type ViewerWatchCaptureTransport = (typeof VIEWER_WATCH_CAPTURE_TRANSPORTS)[number];

export const VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS = 30_000;

export interface ViewerFileTelemetryContext {
    dropId: string;
    fileId: string;
    assetKey: string;
    mediaIndex: number;
    mediaType: ViewerWatchContentKind;
    viewerSessionId: string;
}

interface ViewerFileTelemetryInput {
    dropId: string | null;
    contentFileNames?: string[] | null;
    activeAssetIndex: number;
    activeContentKind: ViewerWatchContentKind;
    viewerSessionId: string | null;
}

export interface ViewerWatchDerivedState {
    meaningfulWatch: boolean;
    deepWatch: boolean;
    bounced: boolean;
    abandoned: boolean;
    stalled: boolean;
    converted: boolean;
    completedSession: boolean;
    openedWithoutDepth: boolean;
    idleVisibleSeconds: number;
    outcome: ViewerWatchSessionOutcome;
    dropOffStage: ViewerWatchDropOffStage;
}

export interface ViewerWatchCaptureState {
    captureQuality: ViewerWatchCaptureQuality;
    degraded: boolean;
    replayRecovered: boolean;
    closeMissing: boolean;
    gapDetected: boolean;
    flushDegraded: boolean;
}

interface ViewerWatchDerivationInput {
    totalWatchSeconds?: number | null;
    totalVisibleSeconds?: number | null;
    totalActiveSeconds?: number | null;
    totalPlayingSeconds?: number | null;
    hiddenDurationSeconds?: number | null;
    idleDurationSeconds?: number | null;
    maxProgressSeconds?: number | null;
    maxProgressPercent?: number | null;
    maxAssetWatchSeconds?: number | null;
    viewedAssetCount?: number | null;
    completedAssetCount?: number | null;
    consumedAssetCount?: number | null;
    assetSwitchCount?: number | null;
    downloadCount?: number | null;
    relatedClickCount?: number | null;
    loadSampleCount?: number | null;
}

const VIEWER_WATCH_BOUNCE_SECONDS = 5;
const VIEWER_WATCH_VISIBLE_BOUNCE_SECONDS = 8;
const VIEWER_WATCH_MEANINGFUL_SECONDS = 10;
const VIEWER_WATCH_MEANINGFUL_VISIBLE_SECONDS = 15;
const VIEWER_WATCH_DEEP_SECONDS = 30;
const VIEWER_WATCH_STALL_VISIBLE_SECONDS = 20;
const VIEWER_WATCH_STALL_PROGRESS_SECONDS = 3;

function asFiniteNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function roundSeconds(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Number(value.toFixed(2));
}

function readViewerFileName(contentFileNames: string[] | null | undefined, activeAssetIndex: number) {
    if (!Array.isArray(contentFileNames)) {
        return "";
    }

    const candidate = contentFileNames[activeAssetIndex];
    return typeof candidate === "string" ? candidate.trim() : "";
}

export function buildViewerFileTelemetryContext(input: ViewerFileTelemetryInput): ViewerFileTelemetryContext | null {
    if (!input.dropId || !input.viewerSessionId) {
        return null;
    }

    const normalizedAssetIndex = Math.max(0, Math.trunc(input.activeAssetIndex));
    const fileName = readViewerFileName(input.contentFileNames, normalizedAssetIndex);

    return {
        dropId: input.dropId,
        fileId: fileName || `${input.dropId}:file:${normalizedAssetIndex + 1}`,
        assetKey: `${input.dropId}:${normalizedAssetIndex}`,
        mediaIndex: normalizedAssetIndex + 1,
        mediaType: input.activeContentKind,
        viewerSessionId: input.viewerSessionId,
    };
}

export function buildViewerFileTelemetryParams(context: ViewerFileTelemetryContext) {
    return {
        drop_id: context.dropId,
        file_id: context.fileId,
        asset_key: context.assetKey,
        media_index: context.mediaIndex,
        media_type: context.mediaType,
        viewer_session_id: context.viewerSessionId,
        watch_session_id: context.viewerSessionId,
    };
}

export function shouldEmitViewerFileView(input: {
    lastEmittedAtMs?: number | null;
    nextEmittedAtMs: number;
    dedupeWindowMs?: number;
}) {
    const lastEmittedAtMs = typeof input.lastEmittedAtMs === "number" ? input.lastEmittedAtMs : 0;
    const dedupeWindowMs = input.dedupeWindowMs ?? VIEWER_FILE_VIEW_DEDUPE_WINDOW_MS;

    if (!lastEmittedAtMs || lastEmittedAtMs <= 0) {
        return true;
    }

    return Math.max(0, input.nextEmittedAtMs - lastEmittedAtMs) >= dedupeWindowMs;
}

export function resolveViewerWatchSeconds(input: {
    contentKind: ViewerWatchContentKind;
    watchSeconds?: number | null;
    assetStartedAtMs?: number | null;
    nowMs?: number | null;
}) {
    const watchSeconds = Math.max(0, asFiniteNumber(input.watchSeconds));
    return roundSeconds(watchSeconds);
}

function asFiniteInteger(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    return Math.max(0, Math.trunc(numeric));
}

function deriveWatchState(input: ViewerWatchDerivationInput): ViewerWatchDerivedState {
    const totalWatchSeconds = Math.max(0, asFiniteNumber(input.totalWatchSeconds));
    const totalVisibleSeconds = Math.max(0, asFiniteNumber(input.totalVisibleSeconds));
    const maxProgressSeconds = Math.max(
        totalWatchSeconds,
        asFiniteNumber(input.maxProgressSeconds),
        asFiniteNumber(input.maxAssetWatchSeconds),
    );
    const viewedAssetCount = Math.max(0, Math.trunc(asFiniteNumber(input.viewedAssetCount)));
    const completedAssetCount = Math.max(0, Math.trunc(asFiniteNumber(input.completedAssetCount)));
    const consumedAssetCount = Math.max(0, Math.trunc(asFiniteNumber(input.consumedAssetCount)));
    const assetSwitchCount = Math.max(0, Math.trunc(asFiniteNumber(input.assetSwitchCount)));
    const downloadCount = Math.max(0, Math.trunc(asFiniteNumber(input.downloadCount)));
    const relatedClickCount = Math.max(0, Math.trunc(asFiniteNumber(input.relatedClickCount)));
    const loadSampleCount = Math.max(0, Math.trunc(asFiniteNumber(input.loadSampleCount)));

    const openedSomething = viewedAssetCount > 0
        || loadSampleCount > 0
        || totalWatchSeconds > 0
        || totalVisibleSeconds > 0
        || maxProgressSeconds > 0;
    const richInteraction = assetSwitchCount > 0 || downloadCount > 0 || relatedClickCount > 0;
    const completedSession = completedAssetCount > 0;
    const converted = completedSession || consumedAssetCount > 0;
    const meaningfulWatch = converted
        || maxProgressSeconds >= VIEWER_WATCH_MEANINGFUL_SECONDS
        || totalVisibleSeconds >= VIEWER_WATCH_MEANINGFUL_VISIBLE_SECONDS;
    const deepWatch = completedSession
        || maxProgressSeconds >= VIEWER_WATCH_DEEP_SECONDS
        || totalWatchSeconds >= (VIEWER_WATCH_DEEP_SECONDS * 1.5);
    const bounced = !meaningfulWatch
        && !converted
        && totalVisibleSeconds <= VIEWER_WATCH_VISIBLE_BOUNCE_SECONDS
        && maxProgressSeconds < VIEWER_WATCH_BOUNCE_SECONDS
        && !richInteraction;
    const stalled = !converted
        && openedSomething
        && totalVisibleSeconds >= VIEWER_WATCH_STALL_VISIBLE_SECONDS
        && maxProgressSeconds < VIEWER_WATCH_STALL_PROGRESS_SECONDS;
    const openedWithoutDepth = !meaningfulWatch && !converted;
    const abandoned = !converted
        && !bounced
        && openedSomething
        && (meaningfulWatch || richInteraction || stalled || totalVisibleSeconds >= VIEWER_WATCH_BOUNCE_SECONDS || maxProgressSeconds >= VIEWER_WATCH_BOUNCE_SECONDS);
    const idleVisibleSeconds = roundSeconds(Math.max(0, totalVisibleSeconds - totalWatchSeconds));

    let outcome: ViewerWatchSessionOutcome = "bounce";
    if (completedSession) {
        outcome = "completed";
    } else if (converted) {
        outcome = "converted";
    } else if (meaningfulWatch) {
        outcome = "engaged";
    } else if (abandoned || stalled) {
        outcome = "abandoned";
    }

    let dropOffStage: ViewerWatchDropOffStage = "opened_only";
    if (completedSession) {
        dropOffStage = "completed";
    } else if (converted) {
        dropOffStage = "converted";
    } else if (meaningfulWatch) {
        dropOffStage = "meaningful_watch";
    } else if (openedSomething) {
        dropOffStage = "started_only";
    }

    return {
        meaningfulWatch,
        deepWatch,
        bounced,
        abandoned,
        stalled,
        converted,
        completedSession,
        openedWithoutDepth,
        idleVisibleSeconds,
        outcome,
        dropOffStage,
    };
}

export function deriveViewerWatchSessionState(input: ViewerWatchDerivationInput) {
    return deriveWatchState(input);
}

export function deriveViewerWatchAssetState(input: ViewerWatchDerivationInput) {
    return deriveWatchState(input);
}

export function scoreViewerWatchSession(input: ViewerWatchDerivationInput & {
    contentKind?: ViewerWatchContentKind | null;
    completed?: boolean | null;
    manualAdvanceAfterMs?: number | null;
}) {
    const contentKind = input.contentKind || "unknown";
    const mediaType = inferLiteralWatchMediaType(contentKind);
    const visibleMs = Math.round(asFiniteNumber(input.totalVisibleSeconds) * 1000);
    const activeSeconds = asFiniteNumber(input.totalActiveSeconds);
    const playingSeconds = asFiniteNumber(input.totalPlayingSeconds);

    return computeWatchScore({
        mediaType,
        visibleMs,
        activeMs: Math.round(activeSeconds * 1000),
        playingMs: Math.round(playingSeconds * 1000),
        hiddenMs: Math.round(asFiniteNumber(input.hiddenDurationSeconds) * 1000),
        idleMs: Math.round(asFiniteNumber(input.idleDurationSeconds) * 1000),
        maxProgressPercent: asFiniteNumber(input.maxProgressPercent),
        completed: input.completed === true,
        manualAdvanceAfterMs: input.manualAdvanceAfterMs,
    });
}

export function getViewerAssetLiteralWatchMs(input: {
    contentKind: ViewerWatchContentKind;
    totalVisibleSeconds?: number | null;
    totalActiveSeconds?: number | null;
    totalPlayingSeconds?: number | null;
}) {
    return computeLiteralValidWatchMs({
        mediaType: inferLiteralWatchMediaType(input.contentKind),
        visibleMs: Math.round(asFiniteNumber(input.totalVisibleSeconds) * 1000),
        activeMs: Math.round(asFiniteNumber(input.totalActiveSeconds) * 1000),
        playingMs: Math.round(asFiniteNumber(input.totalPlayingSeconds) * 1000),
    });
}

export function shouldCompleteImageOnManualAdvance(input: {
    contentKind: ViewerWatchContentKind;
    totalVisibleSeconds?: number | null;
    totalActiveSeconds?: number | null;
    totalPlayingSeconds?: number | null;
}) {
    if (inferLiteralWatchMediaType(input.contentKind) !== "image") {
        return false;
    }

    return isImageManualAdvanceCompletionEligible(getViewerAssetLiteralWatchMs(input));
}

export function shouldConsumeImageAsset(input: {
    contentKind: ViewerWatchContentKind;
    totalVisibleSeconds?: number | null;
    totalActiveSeconds?: number | null;
    totalPlayingSeconds?: number | null;
}) {
    if (inferLiteralWatchMediaType(input.contentKind) !== "image") {
        return false;
    }

    return getViewerAssetLiteralWatchMs(input) >= IMAGE_WATCH_THRESHOLDS_MS.viewed;
}

export function deriveViewerWatchCaptureState(input: {
    replayRecovered?: boolean | null;
    replayRecoveredCount?: number | null;
    gapCount?: number | null;
    flushFailureCount?: number | null;
    isClosed?: boolean | null;
    closeReason?: string | null;
}) {
    const replayRecovered = Boolean(input.replayRecovered) || asFiniteInteger(input.replayRecoveredCount) > 0;
    const gapDetected = asFiniteInteger(input.gapCount) > 0;
    const closeMissing = !Boolean(input.isClosed) && asFiniteInteger(input.flushFailureCount) > 0 && !input.closeReason;
    const flushDegraded = !Boolean(input.isClosed) && asFiniteInteger(input.flushFailureCount) > 0;

    let captureQuality: ViewerWatchCaptureQuality = "full";
    if (closeMissing) {
        captureQuality = "close_missing";
    } else if (flushDegraded) {
        captureQuality = "flush_degraded";
    } else if (gapDetected) {
        captureQuality = "gap_detected";
    } else if (replayRecovered) {
        captureQuality = "replayed";
    }

    return {
        captureQuality,
        degraded: closeMissing || flushDegraded || gapDetected,
        replayRecovered,
        closeMissing,
        gapDetected,
        flushDegraded,
    } satisfies ViewerWatchCaptureState;
}

export function shouldRetryViewerWatchCloseFlush(input: {
    close: boolean;
    flushSucceeded: boolean;
    activeSessionMatches: boolean;
}) {
    return input.close && input.activeSessionMatches && !input.flushSucceeded;
}

export interface ViewerWatchAssetSnapshot {
    assetKey: string;
    assetIndex: number;
    fileId?: string | null;
    mediaType?: ViewerWatchContentKind;
    contentKind: ViewerWatchContentKind;
    firstSeenAtMs: number;
    lastSeenAtMs: number;
    startedAtMs: number;
    totalWatchSeconds: number;
    totalVisibleSeconds: number;
    totalActiveSeconds?: number;
    totalPlayingSeconds?: number;
    maxProgressSeconds: number;
    maxProgressPercent?: number;
    checkpointMaxSeconds: number;
    durationSeconds?: number | null;
    consumedAtMs?: number | null;
    completedAtMs?: number | null;
    isConsumed: boolean;
    isCompleted: boolean;
    heartbeatCount: number;
    loadMsTotal: number;
    loadSampleCount: number;
    seekCount?: number;
    seekForwardSeconds?: number;
    seekBackwardSeconds?: number;
    waitingCount?: number;
    waitingDurationSeconds?: number;
    playbackRateAverage?: number;
    mutedSampleCount?: number;
    viewportVisiblePercent?: number;
    documentVisibilityState?: "visible" | "hidden" | "prerender" | "unloaded" | "unknown";
    hasFocus?: boolean;
    watchScore?: number;
    watchTier?: WatchScoreTier;
    validWatchMs?: number;
    reasonCodes?: string[];
}

export interface ViewerWatchSessionSnapshot {
    watchSessionId: string;
    sessionSequence: number;
    clientSessionId: string;
    dropId: string;
    dropTitle: string;
    dropCategory: string;
    pagePath: string;
    sessionStartedAtMs: number;
    firstSeenAtMs: number;
    lastSeenAtMs: number;
    closedAtMs?: number | null;
    isClosed: boolean;
    closeReason?: string | null;
    contentCount: number;
    activeAssetKey?: string | null;
    activeAssetIndex?: number | null;
    fileId?: string | null;
    mediaIndex?: number | null;
    mediaType?: ViewerWatchContentKind | null;
    totalWatchSeconds: number;
    totalVisibleSeconds: number;
    totalActiveSeconds?: number;
    totalPlayingSeconds?: number;
    maxAssetWatchSeconds: number;
    maxProgressPercent?: number;
    viewedAssetCount: number;
    completedAssetCount: number;
    consumedAssetCount: number;
    assetSwitchCount: number;
    downloadCount: number;
    relatedClickCount: number;
    loadMsTotal: number;
    loadSampleCount: number;
    averageLoadMs: number;
    captureQuality?: ViewerWatchCaptureQuality;
    captureTransport?: ViewerWatchCaptureTransport;
    replayRecovered?: boolean;
    replayRecoveredCount?: number;
    flushAttemptCount?: number;
    flushSuccessCount?: number;
    flushFailureCount?: number;
    visibilityHiddenCount?: number;
    hiddenDurationSeconds?: number;
    idleDurationSeconds?: number;
    gapCount?: number;
    maxGapMs?: number;
    viewportVisiblePercent?: number;
    documentVisibilityState?: "visible" | "hidden" | "prerender" | "unloaded" | "unknown";
    hasFocus?: boolean;
    reducedMotion?: boolean;
    displayMode?: "browser" | "standalone" | "fullscreen" | "unknown";
    watchScore?: number;
    watchTier?: WatchScoreTier;
    validWatchMs?: number;
    completionCredit?: boolean;
    reasonCodes?: string[];
    watchScoreSource?: "watch_session_rollup" | "legacy_page_duration";
    assets: ViewerWatchAssetSnapshot[];
}
