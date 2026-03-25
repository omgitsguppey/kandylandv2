export const VIEWER_WATCH_CONTENT_KINDS = ["video", "audio", "image", "pdf", "unknown"] as const;

export type ViewerWatchContentKind = (typeof VIEWER_WATCH_CONTENT_KINDS)[number];

export const VIEWER_WATCH_SESSION_OUTCOMES = ["bounce", "abandoned", "engaged", "converted", "completed"] as const;
export const VIEWER_WATCH_DROP_OFF_STAGES = ["opened_only", "started_only", "meaningful_watch", "converted", "completed"] as const;

export type ViewerWatchSessionOutcome = (typeof VIEWER_WATCH_SESSION_OUTCOMES)[number];
export type ViewerWatchDropOffStage = (typeof VIEWER_WATCH_DROP_OFF_STAGES)[number];

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

interface ViewerWatchDerivationInput {
    totalWatchSeconds?: number | null;
    totalVisibleSeconds?: number | null;
    maxProgressSeconds?: number | null;
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

export interface ViewerWatchAssetSnapshot {
    assetKey: string;
    assetIndex: number;
    contentKind: ViewerWatchContentKind;
    firstSeenAtMs: number;
    lastSeenAtMs: number;
    startedAtMs: number;
    totalWatchSeconds: number;
    totalVisibleSeconds: number;
    maxProgressSeconds: number;
    checkpointMaxSeconds: number;
    durationSeconds?: number | null;
    consumedAtMs?: number | null;
    completedAtMs?: number | null;
    isConsumed: boolean;
    isCompleted: boolean;
    heartbeatCount: number;
    loadMsTotal: number;
    loadSampleCount: number;
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
    totalWatchSeconds: number;
    totalVisibleSeconds: number;
    maxAssetWatchSeconds: number;
    viewedAssetCount: number;
    completedAssetCount: number;
    consumedAssetCount: number;
    assetSwitchCount: number;
    downloadCount: number;
    relatedClickCount: number;
    loadMsTotal: number;
    loadSampleCount: number;
    averageLoadMs: number;
    assets: ViewerWatchAssetSnapshot[];
}
