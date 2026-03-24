export const VIEWER_WATCH_CONTENT_KINDS = ["video", "audio", "image", "pdf", "unknown"] as const;

export type ViewerWatchContentKind = (typeof VIEWER_WATCH_CONTENT_KINDS)[number];

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
