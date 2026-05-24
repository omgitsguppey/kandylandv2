"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { authFetch } from "@/lib/authFetch";
import { getClientSessionId } from "@/lib/client-session";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { auth } from "@/lib/firebase";
import { createAnalyticsWatchSessionId } from "@/lib/analytics-identifiers";
import { canUseIdentifiedAnalytics, readPrivacySettingsSnapshot, subscribeToPrivacySettings } from "@/lib/privacy-consent";
import { trackEvent } from "@/lib/telemetry";
import type {
    ViewerFileTelemetryContext,
    ViewerWatchCaptureQuality,
    ViewerWatchCaptureTransport,
    ViewerWatchAssetSnapshot,
    ViewerWatchContentKind,
    ViewerWatchSessionSnapshot,
} from "@/lib/viewer-watch-session";
import {
    buildViewerFileTelemetryContext,
    buildViewerFileTelemetryParams,
    scoreViewerWatchSession,
    shouldCompleteImageOnManualAdvance,
    shouldConsumeImageAsset,
    shouldRetryViewerWatchCloseFlush,
} from "@/lib/viewer-watch-session";

const WATCH_VISIBLE_TICK_INTERVAL_MS = 5_000;
const HEARTBEAT_FLUSH_WINDOW_MS = 10_000;
const CLOSE_RETRY_DELAY_MS = 1_000;
const MAX_TICK_DELTA_MS = 5_000;
const MINIMUM_VIEWPORT_VISIBLE_PERCENT = 50;
const ACTIVE_IDLE_THRESHOLD_MS = 30_000;
const IDLE_TIMEOUT_MS = 120_000;
const VIEWER_WATCH_PENDING_STORAGE_KEY = "kd_viewer_watch_pending_v1";
const VIEWER_WATCH_PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const VIEWER_WATCH_PENDING_MAX_ENTRIES = 12;

interface UseViewerWatchSessionOptions {
    enabled: boolean;
    dropId: string | null;
    dropContentFileNames?: string[] | null;
    dropTitle: string;
    dropCategory: string;
    contentCount: number;
    activeAssetIndex: number;
    activeContentKind: ViewerWatchContentKind;
    contentElementRef?: RefObject<Element | null>;
    contentLoaded?: boolean;
    overlayBlocked?: boolean;
}

interface AssetWatchState extends ViewerWatchAssetSnapshot {
    revision: number;
}

interface FlushOptions {
    close?: boolean;
    keepalive?: boolean;
    transport?: ViewerWatchCaptureTransport;
}

interface SessionContext {
    enabled: boolean;
    dropId: string | null;
    dropContentFileNames?: string[] | null;
    dropTitle: string;
    dropCategory: string;
    contentCount: number;
    activeAssetIndex: number;
    activeContentKind: ViewerWatchContentKind;
    contentLoaded?: boolean;
    overlayBlocked?: boolean;
}

interface StoredViewerWatchSessionEntry {
    payload: ViewerWatchSessionSnapshot;
    storedAt: number;
    ownerUid: string;
}

function currentTimestamp() {
    return Date.now();
}

function getCurrentWatchOwnerUid() {
    return auth?.currentUser?.uid ?? null;
}

function roundSeconds(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Math.max(0, Number(value.toFixed(2)));
}

function clampDeltaMs(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }

    return Math.min(value, MAX_TICK_DELTA_MS);
}

function inferCaptureQuality(input: {
    replayRecoveredCount: number;
    gapCount: number;
    flushFailureCount: number;
    close: boolean;
    reason: string;
}) {
    if (input.close && input.flushFailureCount > 0) {
        return "close_missing" satisfies ViewerWatchCaptureQuality;
    }

    if (input.flushFailureCount > 0) {
        return "flush_degraded" satisfies ViewerWatchCaptureQuality;
    }

    if (input.gapCount > 0) {
        return "gap_detected" satisfies ViewerWatchCaptureQuality;
    }

    if (input.replayRecoveredCount > 0 || input.reason.startsWith("replay")) {
        return "replayed" satisfies ViewerWatchCaptureQuality;
    }

    return "full" satisfies ViewerWatchCaptureQuality;
}

function isMediaContent(kind: ViewerWatchContentKind) {
    return kind === "video" || kind === "audio";
}

function readDocumentVisibilityState() {
    if (typeof document === "undefined") {
        return "unknown" as const;
    }

    if (document.visibilityState === "visible" || document.visibilityState === "hidden" || document.visibilityState === "prerender") {
        return document.visibilityState;
    }

    return "unknown" as const;
}

function readHasFocus() {
    if (typeof document === "undefined" || typeof document.hasFocus !== "function") {
        return true;
    }

    return document.hasFocus();
}

function readReducedMotion() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readDisplayMode() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return "unknown" as const;
    }

    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: fullscreen)").matches) {
        return "fullscreen" as const;
    }
    if (window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true) {
        return "standalone" as const;
    }

    return "browser" as const;
}

function readPendingWatchSessionEntries() {
    if (typeof window === "undefined") {
        return new Map<string, StoredViewerWatchSessionEntry>();
    }

    try {
        const raw = window.sessionStorage.getItem(VIEWER_WATCH_PENDING_STORAGE_KEY);
        if (!raw) {
            return new Map<string, StoredViewerWatchSessionEntry>();
        }

        const parsed = JSON.parse(raw) as Record<string, StoredViewerWatchSessionEntry>;
        const now = currentTimestamp();
        const currentOwnerUid = getCurrentWatchOwnerUid();
        const entries = Object.entries(parsed)
            .filter(([, entry]) => {
                if (
                    !entry
                    || typeof entry !== "object"
                    || !entry.payload
                    || typeof entry.storedAt !== "number"
                    || typeof entry.ownerUid !== "string"
                    || entry.ownerUid.length === 0
                ) {
                    return false;
                }

                if (currentOwnerUid && entry.ownerUid !== currentOwnerUid) {
                    return false;
                }

                return now - entry.storedAt <= VIEWER_WATCH_PENDING_MAX_AGE_MS;
            })
            .sort((left, right) => left[1].storedAt - right[1].storedAt)
            .slice(-VIEWER_WATCH_PENDING_MAX_ENTRIES);

        const cleanedEntries = new Map(entries);
        if (cleanedEntries.size !== Object.keys(parsed).length) {
            writePendingWatchSessionEntries(cleanedEntries);
        }
        return cleanedEntries;
    } catch {
        return new Map<string, StoredViewerWatchSessionEntry>();
    }
}

function writePendingWatchSessionEntries(entries: Map<string, StoredViewerWatchSessionEntry>) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        if (entries.size === 0) {
            window.sessionStorage.removeItem(VIEWER_WATCH_PENDING_STORAGE_KEY);
            return;
        }

        const serialized = Object.fromEntries(
            Array.from(entries.entries())
                .sort((left, right) => left[1].storedAt - right[1].storedAt)
                .slice(-VIEWER_WATCH_PENDING_MAX_ENTRIES),
        );
        window.sessionStorage.setItem(VIEWER_WATCH_PENDING_STORAGE_KEY, JSON.stringify(serialized));
    } catch {
        // Ignore storage write failures in restricted contexts.
    }
}

function persistPendingWatchSession(payload: ViewerWatchSessionSnapshot) {
    const ownerUid = getCurrentWatchOwnerUid();
    if (!ownerUid) {
        return;
    }

    const entries = readPendingWatchSessionEntries();
    entries.set(payload.watchSessionId, {
        payload,
        storedAt: currentTimestamp(),
        ownerUid,
    });
    writePendingWatchSessionEntries(entries);
}

function clearPendingWatchSession(watchSessionId: string) {
    const entries = readPendingWatchSessionEntries();
    if (!entries.delete(watchSessionId)) {
        return;
    }
    writePendingWatchSessionEntries(entries);
}

function clearPendingWatchSessions(watchSessionIds: string[]) {
    if (watchSessionIds.length === 0) {
        return;
    }

    const entries = readPendingWatchSessionEntries();
    let changed = false;
    for (const id of watchSessionIds) {
        if (entries.delete(id)) {
            changed = true;
        }
    }

    if (changed) {
        writePendingWatchSessionEntries(entries);
    }
}

export function useViewerWatchSession(options: UseViewerWatchSessionOptions) {
    const [watchSessionId, setWatchSessionId] = useState<string | null>(null);
    const [contentVisibilityPercent, setContentVisibilityPercent] = useState(0);
    const [documentVisible, setDocumentVisible] = useState(() => readDocumentVisibilityState() === "visible");
    const [analyticsAllowed, setAnalyticsAllowed] = useState(() => canUseIdentifiedAnalytics(readPrivacySettingsSnapshot()));

    const contextRef = useRef<SessionContext>(options);
    const watchSessionIdRef = useRef<string | null>(null);
    const activeDropIdRef = useRef<string | null>(null);
    const clientSessionIdRef = useRef<string>("");
    const sessionStartedAtRef = useRef<number | null>(null);
    const sessionSequenceRef = useRef(0);
    const sessionRevisionRef = useRef(0);
    const sessionDirtyRef = useRef(false);
    const lastHeartbeatFlushAtRef = useRef(0);
    const lastTickAtRef = useRef<number | null>(null);
    const mediaPlayingRef = useRef(false);
    const lastUserActivityAtRef = useRef(currentTimestamp());
    const lastProgressTelemetryAtRef = useRef(0);
    const contentVisiblePercentRef = useRef(0);
    const contentVisibleRef = useRef(false);
    const flushInFlightRef = useRef<Promise<void> | null>(null);
    const flushQueuedRef = useRef<{ reason: string; options?: FlushOptions } | null>(null);
    const closeRetryTimeoutRef = useRef<number | null>(null);
    const pendingReplayAttemptedRef = useRef(false);
    const assetsRef = useRef<Map<string, AssetWatchState>>(new Map());
    const dirtyAssetKeysRef = useRef<Set<string>>(new Set());
    const previousAssetKeyRef = useRef<string | null>(null);
    const pagePathRef = useRef<string>("/dashboard/viewer");
    const sessionMetadataRef = useRef({
        assetSwitchCount: 0,
        downloadCount: 0,
        relatedClickCount: 0,
        visibilityHiddenCount: 0,
        hiddenDurationMs: 0,
        hiddenSinceMs: null as number | null,
        idleDurationMs: 0,
        idleSinceMs: null as number | null,
        totalActiveMs: 0,
        totalPlayingMs: 0,
        gapCount: 0,
        maxGapMs: 0,
        flushAttemptCount: 0,
        flushSuccessCount: 0,
        flushFailureCount: 0,
        replayRecoveredCount: 0,
    });
    const flushSessionRef = useRef<(reason: string, options?: FlushOptions) => Promise<void>>(async () => {});

    contextRef.current = options;
    if (typeof window !== "undefined") {
        pagePathRef.current = window.location.pathname || "/dashboard/viewer";
    }

    const clearCloseRetryTimeout = useCallback(() => {
        if (typeof window === "undefined" || closeRetryTimeoutRef.current === null) {
            return;
        }

        window.clearTimeout(closeRetryTimeoutRef.current);
        closeRetryTimeoutRef.current = null;
    }, []);

    const scheduleCloseRetry = useCallback((reason: string, options?: FlushOptions) => {
        if (typeof window === "undefined" || options?.close !== true) {
            return;
        }

        clearCloseRetryTimeout();
        closeRetryTimeoutRef.current = window.setTimeout(() => {
            closeRetryTimeoutRef.current = null;
            if (!watchSessionIdRef.current || !sessionStartedAtRef.current) {
                return;
            }

            flushQueuedRef.current = { reason, options };
            void flushSessionRef.current(reason, options);
        }, CLOSE_RETRY_DELAY_MS);
    }, [clearCloseRetryTimeout]);

    const resetSessionState = useCallback(() => {
        clearCloseRetryTimeout();
        watchSessionIdRef.current = null;
        activeDropIdRef.current = null;
        clientSessionIdRef.current = "";
        sessionStartedAtRef.current = null;
        sessionSequenceRef.current = 0;
        sessionRevisionRef.current = 0;
        sessionDirtyRef.current = false;
        lastHeartbeatFlushAtRef.current = 0;
        lastTickAtRef.current = null;
        mediaPlayingRef.current = false;
        lastUserActivityAtRef.current = currentTimestamp();
        lastProgressTelemetryAtRef.current = 0;
        flushInFlightRef.current = null;
        flushQueuedRef.current = null;
        pendingReplayAttemptedRef.current = false;
        assetsRef.current.clear();
        dirtyAssetKeysRef.current.clear();
        previousAssetKeyRef.current = null;
        sessionMetadataRef.current = {
            assetSwitchCount: 0,
            downloadCount: 0,
            relatedClickCount: 0,
            visibilityHiddenCount: 0,
            hiddenDurationMs: 0,
            hiddenSinceMs: null,
            idleDurationMs: 0,
            idleSinceMs: null,
            totalActiveMs: 0,
            totalPlayingMs: 0,
            gapCount: 0,
            maxGapMs: 0,
            flushAttemptCount: 0,
            flushSuccessCount: 0,
            flushFailureCount: 0,
            replayRecoveredCount: 0,
        };
        setWatchSessionId(null);
    }, [clearCloseRetryTimeout]);

    const markSessionDirty = useCallback(() => {
        sessionRevisionRef.current += 1;
        sessionDirtyRef.current = true;
    }, []);

    const getCurrentAssetIdentity = useCallback(() => {
        const { dropId, activeAssetIndex } = contextRef.current;
        if (!dropId) {
            return null;
        }

        return {
            assetKey: `${dropId}:${activeAssetIndex}`,
            assetIndex: activeAssetIndex + 1,
        };
    }, []);

    const getCurrentFileTelemetryContext = useCallback((viewerSessionIdOverride?: string | null): ViewerFileTelemetryContext | null => (
        buildViewerFileTelemetryContext({
            dropId: contextRef.current.dropId,
            contentFileNames: contextRef.current.dropContentFileNames ?? null,
            activeAssetIndex: contextRef.current.activeAssetIndex,
            activeContentKind: contextRef.current.activeContentKind,
            viewerSessionId: viewerSessionIdOverride ?? watchSessionIdRef.current,
        })
    ), []);

    const ensureAssetState = useCallback((override?: {
        assetKey?: string;
        assetIndex?: number;
        contentKind?: ViewerWatchContentKind;
    }) => {
        const { dropId, activeAssetIndex, activeContentKind } = contextRef.current;
        if (!dropId) {
            return null;
        }

        const assetKey = override?.assetKey ?? `${dropId}:${activeAssetIndex}`;
        const assetIndex = override?.assetIndex ?? (activeAssetIndex + 1);
        const contentKind = override?.contentKind ?? activeContentKind;
        const existing = assetsRef.current.get(assetKey);
        if (existing) {
            if (existing.contentKind !== contentKind) {
                existing.contentKind = contentKind;
                existing.revision += 1;
                dirtyAssetKeysRef.current.add(assetKey);
                markSessionDirty();
            }
            return existing;
        }

        const timestamp = currentTimestamp();
        const created: AssetWatchState = {
            assetKey,
            assetIndex,
            contentKind,
            firstSeenAtMs: timestamp,
            lastSeenAtMs: timestamp,
            startedAtMs: timestamp,
            totalWatchSeconds: 0,
            totalVisibleSeconds: 0,
            totalActiveSeconds: 0,
            totalPlayingSeconds: 0,
            maxProgressSeconds: 0,
            maxProgressPercent: 0,
            checkpointMaxSeconds: 0,
            durationSeconds: null,
            consumedAtMs: null,
            completedAtMs: null,
            isConsumed: false,
            isCompleted: false,
            heartbeatCount: 0,
            loadMsTotal: 0,
            loadSampleCount: 0,
            seekCount: 0,
            seekForwardSeconds: 0,
            seekBackwardSeconds: 0,
            waitingCount: 0,
            waitingDurationSeconds: 0,
            playbackRateAverage: 0,
            mutedSampleCount: 0,
            viewportVisiblePercent: contentVisiblePercentRef.current,
            documentVisibilityState: readDocumentVisibilityState(),
            hasFocus: readHasFocus(),
            revision: 1,
        };
        assetsRef.current.set(assetKey, created);
        dirtyAssetKeysRef.current.add(assetKey);
        markSessionDirty();
        return created;
    }, [markSessionDirty]);

    const updateAssetState = useCallback((asset: AssetWatchState, updater: () => void) => {
        const previousRevision = asset.revision;
        updater();
        if (asset.revision === previousRevision) {
            asset.revision += 1;
        }
        dirtyAssetKeysRef.current.add(asset.assetKey);
        markSessionDirty();
    }, [markSessionDirty]);

    const markUserActivity = useCallback(() => {
        const timestamp = currentTimestamp();
        if (sessionMetadataRef.current.idleSinceMs !== null) {
            sessionMetadataRef.current.idleDurationMs += Math.max(0, timestamp - sessionMetadataRef.current.idleSinceMs);
            sessionMetadataRef.current.idleSinceMs = null;
            markSessionDirty();
        }
        lastUserActivityAtRef.current = timestamp;
    }, [markSessionDirty]);

    const applyActiveDelta = useCallback((timestampMs = currentTimestamp()) => {
        const lastTickAt = lastTickAtRef.current;
        if (!sessionStartedAtRef.current || !lastTickAt) {
            lastTickAtRef.current = timestampMs;
            return;
        }

        const assetIdentity = getCurrentAssetIdentity();
        if (!assetIdentity) {
            lastTickAtRef.current = timestampMs;
            return;
        }

        const asset = ensureAssetState({
            assetKey: assetIdentity.assetKey,
            assetIndex: assetIdentity.assetIndex,
        });
        if (!asset) {
            lastTickAtRef.current = timestampMs;
            return;
        }

        const rawDeltaMs = timestampMs - lastTickAt;
        const deltaMs = clampDeltaMs(rawDeltaMs);
        lastTickAtRef.current = timestampMs;
        if (deltaMs <= 0) {
            return;
        }

        if (rawDeltaMs > WATCH_VISIBLE_TICK_INTERVAL_MS * 2) {
            sessionMetadataRef.current.gapCount += 1;
            sessionMetadataRef.current.maxGapMs = Math.max(sessionMetadataRef.current.maxGapMs, Math.round(rawDeltaMs));
            markSessionDirty();
        }

        const deltaSeconds = roundSeconds(deltaMs / 1000);
        const currentDocumentVisibility = readDocumentVisibilityState();
        const documentIsVisible = currentDocumentVisibility === "visible";
        const contentIsVisible = contentVisibleRef.current && contentVisiblePercentRef.current >= MINIMUM_VIEWPORT_VISIBLE_PERCENT;
        const routeOwnsViewer = typeof window === "undefined" || (window.location.pathname || "").startsWith("/dashboard/viewer");
        const idleMs = Math.max(0, timestampMs - lastUserActivityAtRef.current);
        const activeEligible = idleMs < ACTIVE_IDLE_THRESHOLD_MS;
        const canObserveContent = documentIsVisible
            && contentIsVisible
            && routeOwnsViewer
            && contextRef.current.overlayBlocked !== true
            && contextRef.current.contentLoaded === true;
        const mediaContent = isMediaContent(contextRef.current.activeContentKind);
        const shouldCountVisible = canObserveContent;
        const shouldCountActive = canObserveContent && activeEligible;
        const shouldCountPlaying = shouldCountActive && mediaContent && mediaPlayingRef.current;
        const shouldCountWatch = mediaContent
            ? shouldCountPlaying
            : shouldCountActive;

        if (idleMs >= ACTIVE_IDLE_THRESHOLD_MS && sessionMetadataRef.current.idleSinceMs === null) {
            sessionMetadataRef.current.idleSinceMs = Math.max(lastUserActivityAtRef.current + ACTIVE_IDLE_THRESHOLD_MS, timestampMs - deltaMs);
            markSessionDirty();
        }

        if (!shouldCountVisible && !shouldCountWatch) {
            return;
        }

        updateAssetState(asset, () => {
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, timestampMs);
            if (shouldCountWatch) {
                asset.totalWatchSeconds = roundSeconds(asset.totalWatchSeconds + deltaSeconds);
            }
            if (shouldCountVisible) {
                asset.totalVisibleSeconds = roundSeconds(asset.totalVisibleSeconds + deltaSeconds);
            }
            if (shouldCountActive) {
                asset.totalActiveSeconds = roundSeconds((asset.totalActiveSeconds ?? 0) + deltaSeconds);
                sessionMetadataRef.current.totalActiveMs += deltaMs;
            }
            if (shouldCountPlaying) {
                asset.totalPlayingSeconds = roundSeconds((asset.totalPlayingSeconds ?? 0) + deltaSeconds);
                sessionMetadataRef.current.totalPlayingMs += deltaMs;
            }
            asset.viewportVisiblePercent = contentVisiblePercentRef.current;
            asset.documentVisibilityState = currentDocumentVisibility;
            asset.hasFocus = readHasFocus();
            asset.heartbeatCount += 1;
        });
    }, [ensureAssetState, getCurrentAssetIdentity, markSessionDirty, updateAssetState]);

    const buildSessionPayload = useCallback((reason: string, close: boolean, options?: FlushOptions) => {
        const activeWatchSessionId = watchSessionIdRef.current;
        if (!activeWatchSessionId || !contextRef.current.dropId || !sessionStartedAtRef.current) {
            return null;
        }

        applyActiveDelta();

        const allAssets = Array.from(assetsRef.current.values());
        const dirtyAssets = close
            ? allAssets
            : allAssets.filter((asset) => dirtyAssetKeysRef.current.has(asset.assetKey));
        if (!close && !sessionDirtyRef.current && dirtyAssets.length === 0) {
            return null;
        }

        const lastSeenAtMs = Math.max(
            currentTimestamp(),
            sessionStartedAtRef.current,
            ...allAssets.map((asset) => asset.lastSeenAtMs),
        );
        const totalWatchSeconds = roundSeconds(allAssets.reduce((sum, asset) => sum + asset.totalWatchSeconds, 0));
        const totalVisibleSeconds = roundSeconds(allAssets.reduce((sum, asset) => sum + asset.totalVisibleSeconds, 0));
        const totalActiveSeconds = roundSeconds(allAssets.reduce((sum, asset) => sum + (asset.totalActiveSeconds ?? 0), 0));
        const totalPlayingSeconds = roundSeconds(allAssets.reduce((sum, asset) => sum + (asset.totalPlayingSeconds ?? 0), 0));
        const maxAssetWatchSeconds = roundSeconds(allAssets.reduce((max, asset) => Math.max(max, asset.totalWatchSeconds), 0));
        const maxProgressPercent = roundSeconds(allAssets.reduce((max, asset) => Math.max(max, asset.maxProgressPercent ?? 0), 0));
        const loadMsTotal = Math.round(allAssets.reduce((sum, asset) => sum + asset.loadMsTotal, 0));
        const loadSampleCount = allAssets.reduce((sum, asset) => sum + asset.loadSampleCount, 0);
        const openIdleDurationMs = sessionMetadataRef.current.idleSinceMs === null
            ? 0
            : Math.max(0, currentTimestamp() - sessionMetadataRef.current.idleSinceMs);
        const assetRevisionMap = new Map<string, number>(dirtyAssets.map((asset) => [asset.assetKey, asset.revision]));
        const captureTransport = (
            options?.transport
            ?? (options?.keepalive ? "keepalive_fetch" : "fetch")
        ) satisfies ViewerWatchCaptureTransport;
        const captureQuality = inferCaptureQuality({
            replayRecoveredCount: sessionMetadataRef.current.replayRecoveredCount,
            gapCount: sessionMetadataRef.current.gapCount,
            flushFailureCount: sessionMetadataRef.current.flushFailureCount,
            close,
            reason,
        });

        const scoredAssets = dirtyAssets.map((asset) => {
            const assetFileContext = buildViewerFileTelemetryContext({
                dropId: contextRef.current.dropId,
                contentFileNames: contextRef.current.dropContentFileNames ?? null,
                activeAssetIndex: Math.max(0, asset.assetIndex - 1),
                activeContentKind: asset.contentKind,
                viewerSessionId: activeWatchSessionId,
            });
            const consumedByTruth = asset.isConsumed || shouldConsumeImageAsset({
                contentKind: asset.contentKind,
                totalVisibleSeconds: asset.totalVisibleSeconds,
                totalActiveSeconds: asset.totalActiveSeconds ?? 0,
                totalPlayingSeconds: asset.totalPlayingSeconds ?? 0,
            });
            const completedByTruth = asset.isCompleted || scoreViewerWatchSession({
                contentKind: asset.contentKind,
                totalVisibleSeconds: asset.totalVisibleSeconds,
                totalActiveSeconds: asset.totalActiveSeconds ?? 0,
                totalPlayingSeconds: asset.totalPlayingSeconds ?? 0,
                maxProgressPercent: asset.maxProgressPercent ?? 0,
                completed: asset.isCompleted,
                manualAdvanceAfterMs: asset.isCompleted
                    ? Math.round((asset.totalActiveSeconds ?? 0) * 1000)
                    : 0,
            }).completionCredit;

            return {
                assetKey: asset.assetKey,
                assetIndex: asset.assetIndex,
                fileId: assetFileContext?.fileId ?? null,
                mediaType: asset.contentKind,
                contentKind: asset.contentKind,
                firstSeenAtMs: asset.firstSeenAtMs,
                lastSeenAtMs: asset.lastSeenAtMs,
                startedAtMs: asset.startedAtMs,
                totalWatchSeconds: asset.totalWatchSeconds,
                totalVisibleSeconds: asset.totalVisibleSeconds,
                totalActiveSeconds: asset.totalActiveSeconds ?? 0,
                totalPlayingSeconds: asset.totalPlayingSeconds ?? 0,
                maxProgressSeconds: asset.maxProgressSeconds,
                maxProgressPercent: asset.maxProgressPercent ?? 0,
                checkpointMaxSeconds: asset.checkpointMaxSeconds,
                durationSeconds: asset.durationSeconds ?? null,
                consumedAtMs: consumedByTruth ? (asset.consumedAtMs ?? asset.lastSeenAtMs) : null,
                completedAtMs: completedByTruth ? (asset.completedAtMs ?? asset.lastSeenAtMs) : null,
                isConsumed: consumedByTruth,
                isCompleted: completedByTruth,
                heartbeatCount: asset.heartbeatCount,
                loadMsTotal: asset.loadMsTotal,
                loadSampleCount: asset.loadSampleCount,
                seekCount: asset.seekCount ?? 0,
                seekForwardSeconds: asset.seekForwardSeconds ?? 0,
                seekBackwardSeconds: asset.seekBackwardSeconds ?? 0,
                waitingCount: asset.waitingCount ?? 0,
                waitingDurationSeconds: asset.waitingDurationSeconds ?? 0,
                playbackRateAverage: asset.playbackRateAverage ?? 0,
                mutedSampleCount: asset.mutedSampleCount ?? 0,
                viewportVisiblePercent: asset.viewportVisiblePercent ?? contentVisiblePercentRef.current,
                documentVisibilityState: asset.documentVisibilityState ?? readDocumentVisibilityState(),
                hasFocus: asset.hasFocus ?? readHasFocus(),
            };
        });
        const activeFileContext = getCurrentFileTelemetryContext(activeWatchSessionId);

        const payload: ViewerWatchSessionSnapshot = {
            watchSessionId: activeWatchSessionId,
            sessionSequence: sessionSequenceRef.current + 1,
            clientSessionId: clientSessionIdRef.current,
            dropId: contextRef.current.dropId,
            dropTitle: contextRef.current.dropTitle,
            dropCategory: contextRef.current.dropCategory,
            pagePath: pagePathRef.current,
            sessionStartedAtMs: sessionStartedAtRef.current,
            firstSeenAtMs: sessionStartedAtRef.current,
            lastSeenAtMs,
            closedAtMs: close ? lastSeenAtMs : null,
            isClosed: close,
            closeReason: close ? reason : null,
            contentCount: contextRef.current.contentCount,
            activeAssetKey: close ? null : (getCurrentAssetIdentity()?.assetKey ?? null),
            activeAssetIndex: close ? null : (getCurrentAssetIdentity()?.assetIndex ?? null),
            fileId: activeFileContext?.fileId ?? null,
            mediaIndex: activeFileContext?.mediaIndex ?? null,
            mediaType: activeFileContext?.mediaType ?? null,
            totalWatchSeconds,
            totalVisibleSeconds,
            totalActiveSeconds,
            totalPlayingSeconds,
            maxAssetWatchSeconds,
            maxProgressPercent,
            viewedAssetCount: allAssets.filter((asset) => asset.totalWatchSeconds > 0 || asset.totalVisibleSeconds > 0 || asset.loadSampleCount > 0).length,
            completedAssetCount: scoredAssets.filter((asset) => asset.isCompleted).length,
            consumedAssetCount: scoredAssets.filter((asset) => asset.isConsumed).length,
            assetSwitchCount: sessionMetadataRef.current.assetSwitchCount,
            downloadCount: sessionMetadataRef.current.downloadCount,
            relatedClickCount: sessionMetadataRef.current.relatedClickCount,
            loadMsTotal,
            loadSampleCount,
            averageLoadMs: loadSampleCount > 0 ? Math.round(loadMsTotal / loadSampleCount) : 0,
            captureQuality,
            captureTransport,
            replayRecovered: sessionMetadataRef.current.replayRecoveredCount > 0,
            replayRecoveredCount: sessionMetadataRef.current.replayRecoveredCount,
            flushAttemptCount: sessionMetadataRef.current.flushAttemptCount,
            flushSuccessCount: sessionMetadataRef.current.flushSuccessCount,
            flushFailureCount: sessionMetadataRef.current.flushFailureCount,
            visibilityHiddenCount: sessionMetadataRef.current.visibilityHiddenCount,
            hiddenDurationSeconds: roundSeconds(sessionMetadataRef.current.hiddenDurationMs / 1000),
            idleDurationSeconds: roundSeconds((sessionMetadataRef.current.idleDurationMs + openIdleDurationMs) / 1000),
            gapCount: sessionMetadataRef.current.gapCount,
            maxGapMs: sessionMetadataRef.current.maxGapMs,
            viewportVisiblePercent: contentVisiblePercentRef.current,
            documentVisibilityState: readDocumentVisibilityState(),
            hasFocus: readHasFocus(),
            reducedMotion: readReducedMotion(),
            displayMode: readDisplayMode(),
            assets: scoredAssets,
        };

        return {
            payload,
            sessionRevision: sessionRevisionRef.current,
            assetRevisionMap,
        };
    }, [applyActiveDelta, getCurrentAssetIdentity, getCurrentFileTelemetryContext]);

    const flushSession = useCallback(async (reason: string, options?: FlushOptions) => {
        const payloadBundle = buildSessionPayload(reason, options?.close === true, options);
        if (!payloadBundle) {
            return;
        }

        if (flushInFlightRef.current) {
            const queuedFlush = flushQueuedRef.current;
            if (!queuedFlush || options?.close) {
                flushQueuedRef.current = { reason, options };
            }
            return;
        }

        const { payload, sessionRevision, assetRevisionMap } = payloadBundle;
        sessionSequenceRef.current = payload.sessionSequence;
        const activeWatchSessionId = payload.watchSessionId;
        if (options?.close === true) {
            const activeFileParams = buildViewerFileTelemetryParams(getCurrentFileTelemetryContext(activeWatchSessionId) ?? {
                dropId: payload.dropId,
                fileId: payload.fileId ?? `${payload.dropId}:file:${Math.max(1, payload.mediaIndex ?? 1)}`,
                assetKey: payload.activeAssetKey ?? `${payload.dropId}:${Math.max(0, (payload.mediaIndex ?? 1) - 1)}`,
                mediaIndex: payload.mediaIndex ?? Math.max(1, payload.activeAssetIndex ?? 1),
                mediaType: payload.mediaType ?? "unknown",
                viewerSessionId: activeWatchSessionId,
            });
            const watchScore = scoreViewerWatchSession({
                contentKind: contextRef.current.activeContentKind,
                totalWatchSeconds: payload.totalWatchSeconds,
                totalVisibleSeconds: payload.totalVisibleSeconds,
                totalActiveSeconds: payload.totalActiveSeconds,
                totalPlayingSeconds: payload.totalPlayingSeconds,
                hiddenDurationSeconds: payload.hiddenDurationSeconds,
                idleDurationSeconds: payload.idleDurationSeconds,
                maxProgressPercent: payload.maxProgressPercent,
                completed: payload.completedAssetCount > 0,
                manualAdvanceAfterMs: payload.completedAssetCount > 0 && contextRef.current.activeContentKind !== "video" && contextRef.current.activeContentKind !== "audio"
                    ? Math.round((payload.totalActiveSeconds ?? 0) * 1000)
                    : 0,
            });
            trackEvent("watch_session_ended", {
                source_component: "viewer_watch_session",
                route: payload.pagePath,
                started_at_ms: payload.sessionStartedAtMs,
                ended_at_ms: payload.closedAtMs ?? payload.lastSeenAtMs,
                visible_ms: Math.round(payload.totalVisibleSeconds * 1000),
                active_ms: Math.round((payload.totalActiveSeconds ?? 0) * 1000),
                playing_ms: Math.round((payload.totalPlayingSeconds ?? 0) * 1000),
                hidden_ms: Math.round((payload.hiddenDurationSeconds ?? 0) * 1000),
                idle_ms: Math.round((payload.idleDurationSeconds ?? 0) * 1000),
                valid_watch_ms: watchScore.validWatchMs,
                score: watchScore.score,
                tier: watchScore.tier,
                completion_reason: payload.closeReason ?? "closed",
                reason_codes: watchScore.reasonCodes.join("|"),
                visibility_state: payload.documentVisibilityState ?? "unknown",
                idle_state: (payload.idleDurationSeconds ?? 0) > 0 ? "idle_excluded" : "active",
                ...activeFileParams,
            });
            trackEvent(payload.completedAssetCount > 0 ? "drop_watch_completed" : "drop_watch_abandoned", {
                source_component: "viewer_watch_session",
                route: payload.pagePath,
                active_watch_ms: watchScore.validWatchMs,
                passive_visible_ms: Math.max(0, Math.round((payload.totalVisibleSeconds - (payload.totalActiveSeconds ?? 0)) * 1000)),
                background_ms: Math.round((payload.hiddenDurationSeconds ?? 0) * 1000),
                normalized_watch_percent: Math.max(0, Math.min(100, payload.maxProgressPercent ?? 0)),
                watch_confidence: (payload.totalPlayingSeconds ?? 0) > 0 ? "exact_media_runtime" : "active_visibility_estimated",
                completion_reason: payload.closeReason ?? "closed",
                ...activeFileParams,
            });
            trackEvent("watch_score_computed", {
                source_component: "viewer_watch_session",
                route: payload.pagePath,
                valid_watch_ms: watchScore.validWatchMs,
                score: watchScore.score,
                tier: watchScore.tier,
                reason_codes: watchScore.reasonCodes.join("|"),
                visibility_state: payload.documentVisibilityState ?? "unknown",
                idle_state: (payload.idleDurationSeconds ?? 0) > 0 ? "idle_excluded" : "active",
                ...activeFileParams,
            });
        }
        sessionMetadataRef.current.flushAttemptCount += 1;
        persistPendingWatchSession(payload);
        flushInFlightRef.current = (async () => {
            let flushSucceeded = false;
            try {
                const response = await authFetch("/api/viewer/watch-session", {
                    method: "POST",
                    keepalive: options?.keepalive === true,
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const detail = await response.json().catch(() => null) as { error?: string } | null;
                    throw new Error(detail?.error || `Viewer watch session sync failed (${response.status})`);
                }

                flushSucceeded = true;
                sessionMetadataRef.current.flushSuccessCount += 1;
                clearPendingWatchSession(activeWatchSessionId);
                lastHeartbeatFlushAtRef.current = currentTimestamp();

                if (watchSessionIdRef.current !== activeWatchSessionId) {
                    return;
                }

                if (sessionRevisionRef.current === sessionRevision) {
                    sessionDirtyRef.current = false;
                }

                assetRevisionMap.forEach((revision, assetKey) => {
                    const current = assetsRef.current.get(assetKey);
                    if (current && current.revision === revision) {
                        dirtyAssetKeysRef.current.delete(assetKey);
                    }
                });
            } catch (error) {
                sessionMetadataRef.current.flushFailureCount += 1;
                recordClientDiagnostic("telemetry", "Viewer watch session sync failed", {
                    reason,
                    close: options?.close === true,
                    watchSessionId: activeWatchSessionId,
                    message: error instanceof Error ? error.message : String(error),
                }, "warn");
                sessionDirtyRef.current = true;
                payload.assets.forEach((asset) => dirtyAssetKeysRef.current.add(asset.assetKey));
            } finally {
                flushInFlightRef.current = null;
                const activeSessionMatches = watchSessionIdRef.current === activeWatchSessionId;
                if (shouldRetryViewerWatchCloseFlush({
                    close: options?.close === true,
                    flushSucceeded,
                    activeSessionMatches,
                })) {
                    scheduleCloseRetry(reason, options);
                    return;
                }

                if (options?.close && activeSessionMatches && flushSucceeded) {
                    clearCloseRetryTimeout();
                    resetSessionState();
                } else if (flushQueuedRef.current) {
                    const queuedFlush = flushQueuedRef.current;
                    flushQueuedRef.current = null;
                    void flushSessionRef.current(queuedFlush.reason, queuedFlush.options);
                } else if (sessionDirtyRef.current || dirtyAssetKeysRef.current.size > 0) {
                    void flushSessionRef.current("heartbeat");
                } else if (options?.close && watchSessionIdRef.current === activeWatchSessionId) {
                    resetSessionState();
                }
            }
        })();

        await flushInFlightRef.current;
    }, [buildSessionPayload, clearCloseRetryTimeout, resetSessionState, scheduleCloseRetry]);

    flushSessionRef.current = flushSession;

    const reportAssetStarted = useCallback(() => {
        markUserActivity();
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            const timestamp = currentTimestamp();
            asset.startedAtMs = asset.startedAtMs || timestamp;
            asset.firstSeenAtMs = Math.min(asset.firstSeenAtMs, timestamp);
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, timestamp);
        });
    }, [ensureAssetState, markUserActivity, updateAssetState]);

    const reportAssetLoaded = useCallback((loadMs: number) => {
        if (!Number.isFinite(loadMs) || loadMs <= 0) {
            return;
        }

        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            asset.loadMsTotal += Math.max(1, Math.round(loadMs));
            asset.loadSampleCount += 1;
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, updateAssetState]);

    const reportPlaybackState = useCallback((playbackRate?: number, muted?: boolean) => {
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            if (Number.isFinite(playbackRate) && playbackRate && playbackRate > 0) {
                const currentAverage = asset.playbackRateAverage ?? 0;
                asset.playbackRateAverage = currentAverage > 0
                    ? Number(((currentAverage + playbackRate) / 2).toFixed(2))
                    : Number(playbackRate.toFixed(2));
            }

            if (muted === true) {
                asset.mutedSampleCount = (asset.mutedSampleCount ?? 0) + 1;
            }
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, updateAssetState]);

    const reportAssetProgress = useCallback((progressSeconds: number, durationSeconds?: number) => {
        markUserActivity();
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            const normalizedProgress = Math.max(0, Math.round(progressSeconds));
            asset.maxProgressSeconds = Math.max(asset.maxProgressSeconds, normalizedProgress);
            asset.checkpointMaxSeconds = Math.max(asset.checkpointMaxSeconds, normalizedProgress);
            if (Number.isFinite(durationSeconds) && durationSeconds && durationSeconds > 0) {
                asset.durationSeconds = Math.max(1, Math.round(durationSeconds));
                asset.maxProgressPercent = Math.max(
                    asset.maxProgressPercent ?? 0,
                    Math.max(0, Math.min(100, (normalizedProgress / durationSeconds) * 100)),
                );
            }
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
        const timestamp = currentTimestamp();
        if (timestamp - lastProgressTelemetryAtRef.current >= WATCH_VISIBLE_TICK_INTERVAL_MS) {
            lastProgressTelemetryAtRef.current = timestamp;
            trackEvent("watch_session_progress", {
                source_component: "viewer_watch_session",
                route: pagePathRef.current,
                max_progress_percent: asset.maxProgressPercent ?? 0,
                viewport_visible_percent: contentVisiblePercentRef.current,
                document_visibility_state: readDocumentVisibilityState(),
                has_focus: readHasFocus(),
                ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                    dropId: contextRef.current.dropId ?? "",
                    fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                    assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                    mediaIndex: contextRef.current.activeAssetIndex + 1,
                    mediaType: contextRef.current.activeContentKind,
                    viewerSessionId: watchSessionIdRef.current ?? "",
                }),
            });
            trackEvent("drop_watch_progress", {
                source_component: "viewer_watch_session",
                route: pagePathRef.current,
                active_watch_ms: Math.round((asset.totalWatchSeconds ?? 0) * 1000),
                passive_visible_ms: Math.max(0, Math.round(((asset.totalVisibleSeconds ?? 0) - (asset.totalWatchSeconds ?? 0)) * 1000)),
                background_ms: 0,
                normalized_watch_percent: asset.maxProgressPercent ?? 0,
                content_duration_ms: asset.durationSeconds ? Math.round(asset.durationSeconds * 1000) : null,
                watch_confidence: asset.durationSeconds ? "exact_media_runtime" : "weak_visibility_only",
                ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                    dropId: contextRef.current.dropId ?? "",
                    fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                    assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                    mediaIndex: contextRef.current.activeAssetIndex + 1,
                    mediaType: contextRef.current.activeContentKind,
                    viewerSessionId: watchSessionIdRef.current ?? "",
                }),
            });
            if (!asset.durationSeconds) {
                trackEvent("drop_watch_duration_unavailable", {
                    source_component: "viewer_watch_session",
                    route: pagePathRef.current,
                    watch_confidence: "weak_visibility_only",
                    ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                        dropId: contextRef.current.dropId ?? "",
                        fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                        assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                        mediaIndex: contextRef.current.activeAssetIndex + 1,
                        mediaType: contextRef.current.activeContentKind,
                        viewerSessionId: watchSessionIdRef.current ?? "",
                    }),
                });
            }
        }
    }, [ensureAssetState, getCurrentFileTelemetryContext, markUserActivity, updateAssetState]);

    const reportMediaSeeking = useCallback((fromSeconds: number, toSeconds: number, durationSeconds?: number) => {
        markUserActivity();
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            const normalizedFrom = Math.max(0, Number.isFinite(fromSeconds) ? fromSeconds : 0);
            const normalizedTo = Math.max(0, Number.isFinite(toSeconds) ? toSeconds : 0);
            const delta = Math.abs(normalizedTo - normalizedFrom);
            asset.seekCount = (asset.seekCount ?? 0) + 1;
            if (normalizedTo >= normalizedFrom) {
                asset.seekForwardSeconds = roundSeconds((asset.seekForwardSeconds ?? 0) + delta);
            } else {
                asset.seekBackwardSeconds = roundSeconds((asset.seekBackwardSeconds ?? 0) + delta);
            }
            if (Number.isFinite(durationSeconds) && durationSeconds && durationSeconds > 0) {
                asset.durationSeconds = Math.max(1, Math.round(durationSeconds));
            }
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, markUserActivity, updateAssetState]);

    const reportMediaWaiting = useCallback((waitingSeconds: number) => {
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            asset.waitingCount = (asset.waitingCount ?? 0) + 1;
            asset.waitingDurationSeconds = roundSeconds((asset.waitingDurationSeconds ?? 0) + Math.max(0, waitingSeconds || 0));
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, updateAssetState]);

    const reportAssetConsumed = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        markUserActivity();
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            if (Number.isFinite(progressSeconds)) {
                asset.maxProgressSeconds = Math.max(asset.maxProgressSeconds, Math.round(progressSeconds || 0));
            }
            if (Number.isFinite(durationSeconds) && durationSeconds && durationSeconds > 0) {
                asset.durationSeconds = Math.max(1, Math.round(durationSeconds));
                asset.maxProgressPercent = Math.max(
                    asset.maxProgressPercent ?? 0,
                    Math.max(0, Math.min(100, ((progressSeconds || 0) / durationSeconds) * 100)),
                );
            }
            asset.isConsumed = true;
            asset.consumedAtMs = asset.consumedAtMs ?? currentTimestamp();
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, markUserActivity, updateAssetState]);

    const reportAssetCompleted = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        markUserActivity();
        const asset = ensureAssetState();
        if (!asset) {
            return;
        }

        updateAssetState(asset, () => {
            if (Number.isFinite(progressSeconds)) {
                asset.maxProgressSeconds = Math.max(asset.maxProgressSeconds, Math.round(progressSeconds || 0));
            }
            if (Number.isFinite(durationSeconds) && durationSeconds && durationSeconds > 0) {
                asset.durationSeconds = Math.max(1, Math.round(durationSeconds));
                asset.maxProgressPercent = Math.max(
                    asset.maxProgressPercent ?? 0,
                    Math.max(0, Math.min(100, ((progressSeconds || 0) / durationSeconds) * 100)),
                );
            }
            asset.isConsumed = true;
            asset.isCompleted = true;
            asset.consumedAtMs = asset.consumedAtMs ?? currentTimestamp();
            asset.completedAtMs = asset.completedAtMs ?? currentTimestamp();
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, markUserActivity, updateAssetState]);

    const reportMediaPlay = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        markUserActivity();
        reportAssetStarted();
        if (Number.isFinite(progressSeconds)) {
            reportAssetProgress(progressSeconds || 0, durationSeconds);
        }
        applyActiveDelta();
        mediaPlayingRef.current = true;
        lastTickAtRef.current = currentTimestamp();
        trackEvent("watch_session_resumed", {
            source_component: "viewer_watch_session",
            route: pagePathRef.current,
            ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                dropId: contextRef.current.dropId ?? "",
                fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                mediaIndex: contextRef.current.activeAssetIndex + 1,
                mediaType: contextRef.current.activeContentKind,
                viewerSessionId: watchSessionIdRef.current ?? "",
            }),
        });
    }, [applyActiveDelta, getCurrentFileTelemetryContext, markUserActivity, reportAssetProgress, reportAssetStarted]);

    const reportMediaPause = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        markUserActivity();
        if (Number.isFinite(progressSeconds)) {
            reportAssetProgress(progressSeconds || 0, durationSeconds);
        }
        applyActiveDelta();
        mediaPlayingRef.current = false;
        lastTickAtRef.current = currentTimestamp();
        trackEvent("watch_session_paused", {
            source_component: "viewer_watch_session",
            route: pagePathRef.current,
            ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                dropId: contextRef.current.dropId ?? "",
                fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                mediaIndex: contextRef.current.activeAssetIndex + 1,
                mediaType: contextRef.current.activeContentKind,
                viewerSessionId: watchSessionIdRef.current ?? "",
            }),
        });
    }, [applyActiveDelta, getCurrentFileTelemetryContext, markUserActivity, reportAssetProgress]);

    const reportMediaEnded = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        reportMediaPause(progressSeconds, durationSeconds);
        reportAssetCompleted(progressSeconds, durationSeconds);
    }, [reportAssetCompleted, reportMediaPause]);

    const recordDownload = useCallback(() => {
        sessionMetadataRef.current.downloadCount += 1;
        markSessionDirty();
    }, [markSessionDirty]);

    const recordRelatedClick = useCallback(() => {
        sessionMetadataRef.current.relatedClickCount += 1;
        markSessionDirty();
    }, [markSessionDirty]);

    const noteVisibility = useCallback((hidden: boolean) => {
        applyActiveDelta();
        const timestamp = currentTimestamp();
        lastTickAtRef.current = timestamp;
        if (hidden) {
            sessionMetadataRef.current.visibilityHiddenCount += 1;
            sessionMetadataRef.current.hiddenSinceMs = timestamp;
            markSessionDirty();
            trackEvent("watch_session_hidden", {
                source_component: "viewer_watch_session",
                route: pagePathRef.current,
                document_visibility_state: "hidden",
                ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                    dropId: contextRef.current.dropId ?? "",
                    fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                    assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                    mediaIndex: contextRef.current.activeAssetIndex + 1,
                    mediaType: contextRef.current.activeContentKind,
                    viewerSessionId: watchSessionIdRef.current ?? "",
                }),
            });
            trackEvent("drop_watch_hidden", {
                source_component: "viewer_watch_session",
                route: pagePathRef.current,
                document_visibility_state: "hidden",
                background_ms: 0,
                ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext() ?? {
                    dropId: contextRef.current.dropId ?? "",
                    fileId: `${contextRef.current.dropId ?? "drop"}:file:${contextRef.current.activeAssetIndex + 1}`,
                    assetKey: `${contextRef.current.dropId ?? "drop"}:${contextRef.current.activeAssetIndex}`,
                    mediaIndex: contextRef.current.activeAssetIndex + 1,
                    mediaType: contextRef.current.activeContentKind,
                    viewerSessionId: watchSessionIdRef.current ?? "",
                }),
            });
            void flushSessionRef.current("visibility_hidden", { keepalive: true });
        } else if (sessionMetadataRef.current.hiddenSinceMs) {
            sessionMetadataRef.current.hiddenDurationMs += Math.max(0, timestamp - sessionMetadataRef.current.hiddenSinceMs);
            sessionMetadataRef.current.hiddenSinceMs = null;
            markSessionDirty();
        }
    }, [applyActiveDelta, getCurrentFileTelemetryContext, markSessionDirty]);

    useEffect(() => {
        const syncPrivacy = () => setAnalyticsAllowed(canUseIdentifiedAnalytics(readPrivacySettingsSnapshot()));
        syncPrivacy();
        return subscribeToPrivacySettings(syncPrivacy);
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === "visible";
            setDocumentVisible(isVisible);
            if (watchSessionIdRef.current) {
                noteVisibility(!isVisible);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [noteVisibility]);

    useEffect(() => {
        const target = options.contentElementRef?.current ?? null;
        if (typeof window === "undefined" || !target || typeof IntersectionObserver === "undefined") {
            const fallbackPercent = target ? 100 : 0;
            contentVisiblePercentRef.current = fallbackPercent;
            contentVisibleRef.current = fallbackPercent >= MINIMUM_VIEWPORT_VISIBLE_PERCENT;
            setContentVisibilityPercent(fallbackPercent);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            const nextPercent = entry ? Math.round(Math.max(0, Math.min(1, entry.intersectionRatio)) * 100) : 0;
            contentVisiblePercentRef.current = nextPercent;
            contentVisibleRef.current = nextPercent >= MINIMUM_VIEWPORT_VISIBLE_PERCENT;
            setContentVisibilityPercent(nextPercent);
            if (watchSessionIdRef.current) {
                applyActiveDelta();
            }
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

        observer.observe(target);
        return () => observer.disconnect();
    }, [applyActiveDelta, options.contentElementRef, options.contentElementRef?.current]);

    useEffect(() => {
        if (typeof window === "undefined" || !options.enabled) {
            return;
        }

        const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, markUserActivity, { passive: true });
        });

        return () => {
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, markUserActivity);
            });
        };
    }, [markUserActivity, options.enabled]);

    const canStartSession = Boolean(
        options.enabled
        && options.dropId
        && options.contentLoaded
        && analyticsAllowed
        && documentVisible
        && contentVisibilityPercent >= MINIMUM_VIEWPORT_VISIBLE_PERCENT
        && options.overlayBlocked !== true,
    );

    useEffect(() => {
        if (!options.enabled || !options.dropId || !analyticsAllowed) {
            resetSessionState();
            return;
        }

        if (!canStartSession) {
            return;
        }

        if (watchSessionIdRef.current && activeDropIdRef.current === options.dropId) {
            return;
        }

        resetSessionState();
        const clientSessionId = getClientSessionId();
        const nextWatchSessionId = createAnalyticsWatchSessionId(clientSessionId);
        const startedAtMs = currentTimestamp();

        watchSessionIdRef.current = nextWatchSessionId;
        activeDropIdRef.current = options.dropId;
        clientSessionIdRef.current = clientSessionId;
        sessionStartedAtRef.current = startedAtMs;
        lastTickAtRef.current = startedAtMs;
        previousAssetKeyRef.current = null;
        sessionDirtyRef.current = true;
        setWatchSessionId(nextWatchSessionId);
        trackEvent("watch_session_started", {
            source_component: "viewer_watch_session",
            route: pagePathRef.current,
            started_at_ms: startedAtMs,
            viewport_visible_percent: contentVisiblePercentRef.current,
            document_visibility_state: readDocumentVisibilityState(),
            has_focus: readHasFocus(),
            reduced_motion: readReducedMotion(),
            display_mode: readDisplayMode(),
            ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext(nextWatchSessionId) ?? {
                dropId: options.dropId,
                fileId: `${options.dropId}:file:${options.activeAssetIndex + 1}`,
                assetKey: `${options.dropId}:${options.activeAssetIndex}`,
                mediaIndex: options.activeAssetIndex + 1,
                mediaType: options.activeContentKind,
                viewerSessionId: nextWatchSessionId,
            }),
        });
        trackEvent("drop_watch_started", {
            source_component: "viewer_watch_session",
            route: pagePathRef.current,
            visible_started_at_ms: startedAtMs,
            active_started_at_ms: startedAtMs,
            active_watch_ms: 0,
            passive_visible_ms: 0,
            background_ms: 0,
            ...buildViewerFileTelemetryParams(getCurrentFileTelemetryContext(nextWatchSessionId) ?? {
                dropId: options.dropId,
                fileId: `${options.dropId}:file:${options.activeAssetIndex + 1}`,
                assetKey: `${options.dropId}:${options.activeAssetIndex}`,
                mediaIndex: options.activeAssetIndex + 1,
                mediaType: options.activeContentKind,
                viewerSessionId: nextWatchSessionId,
            }),
        });

    }, [analyticsAllowed, canStartSession, getCurrentFileTelemetryContext, options.activeAssetIndex, options.activeContentKind, options.dropId, options.enabled, resetSessionState]);

    useEffect(() => {
        if (!watchSessionIdRef.current || !options.enabled || !options.dropId) {
            return;
        }

        void flushSessionRef.current("session_started");
    }, [options.dropId, options.enabled, watchSessionId]);

    useEffect(() => {
        if (!options.enabled || !options.dropId || pendingReplayAttemptedRef.current) {
            return;
        }

        pendingReplayAttemptedRef.current = true;

        void (async () => {
            const pendingEntries = Array.from(readPendingWatchSessionEntries().values())
                .sort((left, right) => left.storedAt - right.storedAt);

            if (pendingEntries.length === 0) {
                return;
            }

            const results = await Promise.allSettled(
                pendingEntries.map(async (entry) => {
                    try {
                        const replayPayload: ViewerWatchSessionSnapshot = {
                            ...entry.payload,
                            captureTransport: "replay_fetch",
                            replayRecovered: true,
                            replayRecoveredCount: (entry.payload.replayRecoveredCount ?? 0) + 1,
                            captureQuality: entry.payload.captureQuality === "full" ? "replayed" : entry.payload.captureQuality,
                        };
                        const response = await authFetch("/api/viewer/watch-session", {
                            method: "POST",
                            body: JSON.stringify(replayPayload),
                        });

                        if (
                            response.ok
                            || response.status === 400
                            || response.status === 401
                            || response.status === 403
                            || response.status === 404
                        ) {
                            return { success: true, watchSessionId: entry.payload.watchSessionId };
                        }

                        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
                        throw new Error(detail?.error || `Replay failed (${response.status})`);
                    } catch (error) {
                        recordClientDiagnostic(
                            "telemetry",
                            "Viewer watch session replay failed",
                            {
                                watchSessionId: entry.payload.watchSessionId,
                                dropId: entry.payload.dropId,
                                message: error instanceof Error ? error.message : String(error),
                            },
                            "warn",
                        );
                        return { success: false };
                    }
                }),
            );

            const successfulIds = results
                .filter((result): result is PromiseFulfilledResult<{ success: boolean; watchSessionId?: string }> => result.status === "fulfilled")
                .filter((result) => result.value.success && result.value.watchSessionId)
                .map((result) => result.value.watchSessionId as string);

            if (successfulIds.length > 0) {
                clearPendingWatchSessions(successfulIds);
                sessionMetadataRef.current.replayRecoveredCount += successfulIds.length;
                trackEvent("drop_watch_replayed", {
                    source_component: "viewer_watch_session",
                    route: pagePathRef.current,
                    replay_count: successfulIds.length,
                    drop_id: options.dropId,
                    watch_session_id: watchSessionIdRef.current ?? "",
                });
            }
        })();
    }, [options.dropId, options.enabled]);

    useEffect(() => {
        if (!watchSessionIdRef.current || !options.enabled || !options.dropId) {
            return;
        }

        const currentAssetKey = `${options.dropId}:${options.activeAssetIndex}`;
        const previousAssetKey = previousAssetKeyRef.current;
        if (previousAssetKey && previousAssetKey !== currentAssetKey) {
            applyActiveDelta();
            const previousAsset = assetsRef.current.get(previousAssetKey);
            if (previousAsset && shouldCompleteImageOnManualAdvance({
                contentKind: previousAsset.contentKind,
                totalVisibleSeconds: previousAsset.totalVisibleSeconds,
                totalActiveSeconds: previousAsset.totalActiveSeconds ?? 0,
                totalPlayingSeconds: previousAsset.totalPlayingSeconds ?? 0,
            })) {
                updateAssetState(previousAsset, () => {
                    previousAsset.isConsumed = true;
                    previousAsset.isCompleted = true;
                    previousAsset.consumedAtMs = previousAsset.consumedAtMs ?? currentTimestamp();
                    previousAsset.completedAtMs = previousAsset.completedAtMs ?? currentTimestamp();
                    previousAsset.lastSeenAtMs = Math.max(previousAsset.lastSeenAtMs, currentTimestamp());
                });
            }
            mediaPlayingRef.current = false;
            sessionMetadataRef.current.assetSwitchCount += 1;
            markSessionDirty();
            lastTickAtRef.current = currentTimestamp();
        }

        previousAssetKeyRef.current = currentAssetKey;
    }, [applyActiveDelta, markSessionDirty, options.activeAssetIndex, options.dropId, options.enabled, updateAssetState, watchSessionId]);

    useEffect(() => {
        if (!watchSessionIdRef.current || !options.enabled || !options.dropId) {
            return;
        }

        const intervalId = window.setInterval(() => {
            applyActiveDelta();
            const timestamp = currentTimestamp();
            const idleMs = Math.max(0, timestamp - lastUserActivityAtRef.current);
            if (idleMs >= IDLE_TIMEOUT_MS) {
                void flushSessionRef.current("idle_timeout", { close: true, keepalive: true });
                return;
            }

            if (!sessionDirtyRef.current && dirtyAssetKeysRef.current.size === 0) {
                return;
            }

            if (timestamp - lastHeartbeatFlushAtRef.current >= HEARTBEAT_FLUSH_WINDOW_MS) {
                trackEvent("watch_session_visible_tick", {
                    source_component: "viewer_watch_session",
                    route: pagePathRef.current,
                    drop_id: options.dropId,
                    watch_session_id: watchSessionIdRef.current,
                    viewport_visible_percent: contentVisiblePercentRef.current,
                    document_visibility_state: readDocumentVisibilityState(),
                    has_focus: readHasFocus(),
                    idle_state: idleMs >= ACTIVE_IDLE_THRESHOLD_MS ? "idle" : "active",
                });
                trackEvent("watch_session_tick", {
                    source_component: "viewer_watch_session",
                    route: pagePathRef.current,
                    drop_id: options.dropId,
                    watch_session_id: watchSessionIdRef.current,
                    viewport_visible_percent: contentVisiblePercentRef.current,
                    document_visibility_state: readDocumentVisibilityState(),
                    idle_state: idleMs >= ACTIVE_IDLE_THRESHOLD_MS ? "idle" : "active",
                });
                void flushSessionRef.current("heartbeat");
            }
        }, WATCH_VISIBLE_TICK_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [applyActiveDelta, options.dropId, options.enabled, watchSessionId]);

    return {
        watchSessionId,
        flushSession,
        noteVisibility,
        recordDownload,
        recordRelatedClick,
        reportAssetCompleted,
        reportAssetConsumed,
        reportAssetLoaded,
        reportAssetProgress,
        reportAssetStarted,
        reportMediaEnded,
        reportMediaPause,
        reportMediaPlay,
        reportMediaSeeking,
        reportMediaWaiting,
        reportPlaybackState,
    };
}
