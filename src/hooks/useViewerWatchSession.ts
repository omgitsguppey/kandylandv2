"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
import { getClientSessionId } from "@/lib/client-session";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { auth } from "@/lib/firebase";
import { createAnalyticsWatchSessionId } from "@/lib/analytics-identifiers";
import type {
    ViewerWatchAssetSnapshot,
    ViewerWatchContentKind,
    ViewerWatchSessionSnapshot,
} from "@/lib/viewer-watch-session";

const HEARTBEAT_INTERVAL_MS = 1_000;
const HEARTBEAT_FLUSH_WINDOW_MS = 5_000;
const MAX_TICK_DELTA_MS = 5_000;
const VIEWER_WATCH_PENDING_STORAGE_KEY = "kd_viewer_watch_pending_v1";
const VIEWER_WATCH_PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const VIEWER_WATCH_PENDING_MAX_ENTRIES = 12;

interface UseViewerWatchSessionOptions {
    enabled: boolean;
    dropId: string | null;
    dropTitle: string;
    dropCategory: string;
    contentCount: number;
    activeAssetIndex: number;
    activeContentKind: ViewerWatchContentKind;
}

interface AssetWatchState extends ViewerWatchAssetSnapshot {
    revision: number;
}

interface FlushOptions {
    close?: boolean;
    keepalive?: boolean;
}

interface SessionContext {
    enabled: boolean;
    dropId: string | null;
    dropTitle: string;
    dropCategory: string;
    contentCount: number;
    activeAssetIndex: number;
    activeContentKind: ViewerWatchContentKind;
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

function isMediaContent(kind: ViewerWatchContentKind) {
    return kind === "video" || kind === "audio";
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

    const contextRef = useRef<SessionContext>(options);
    const watchSessionIdRef = useRef<string | null>(null);
    const clientSessionIdRef = useRef<string>("");
    const sessionStartedAtRef = useRef<number | null>(null);
    const sessionSequenceRef = useRef(0);
    const sessionRevisionRef = useRef(0);
    const sessionDirtyRef = useRef(false);
    const lastHeartbeatFlushAtRef = useRef(0);
    const lastTickAtRef = useRef<number | null>(null);
    const mediaPlayingRef = useRef(false);
    const flushInFlightRef = useRef<Promise<void> | null>(null);
    const flushQueuedRef = useRef<{ reason: string; options?: FlushOptions } | null>(null);
    const pendingReplayAttemptedRef = useRef(false);
    const assetsRef = useRef<Map<string, AssetWatchState>>(new Map());
    const dirtyAssetKeysRef = useRef<Set<string>>(new Set());
    const previousAssetKeyRef = useRef<string | null>(null);
    const pagePathRef = useRef<string>("/dashboard/viewer");
    const sessionMetadataRef = useRef({
        assetSwitchCount: 0,
        downloadCount: 0,
        relatedClickCount: 0,
    });
    const flushSessionRef = useRef<(reason: string, options?: FlushOptions) => Promise<void>>(async () => {});

    contextRef.current = options;
    if (typeof window !== "undefined") {
        pagePathRef.current = window.location.pathname || "/dashboard/viewer";
    }

    const resetSessionState = useCallback(() => {
        watchSessionIdRef.current = null;
        clientSessionIdRef.current = "";
        sessionStartedAtRef.current = null;
        sessionSequenceRef.current = 0;
        sessionRevisionRef.current = 0;
        sessionDirtyRef.current = false;
        lastHeartbeatFlushAtRef.current = 0;
        lastTickAtRef.current = null;
        mediaPlayingRef.current = false;
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
        };
        setWatchSessionId(null);
    }, []);

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
            maxProgressSeconds: 0,
            checkpointMaxSeconds: 0,
            durationSeconds: null,
            consumedAtMs: null,
            completedAtMs: null,
            isConsumed: false,
            isCompleted: false,
            heartbeatCount: 0,
            loadMsTotal: 0,
            loadSampleCount: 0,
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

        const deltaMs = clampDeltaMs(timestampMs - lastTickAt);
        lastTickAtRef.current = timestampMs;
        if (deltaMs <= 0) {
            return;
        }

        const deltaSeconds = roundSeconds(deltaMs / 1000);
        const documentVisible = typeof document === "undefined" || document.visibilityState === "visible";
        const shouldCountWatch = isMediaContent(contextRef.current.activeContentKind)
            ? mediaPlayingRef.current
            : documentVisible;

        if (!shouldCountWatch && !documentVisible) {
            return;
        }

        updateAssetState(asset, () => {
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, timestampMs);
            if (shouldCountWatch) {
                asset.totalWatchSeconds = roundSeconds(asset.totalWatchSeconds + deltaSeconds);
            }
            if (documentVisible) {
                asset.totalVisibleSeconds = roundSeconds(asset.totalVisibleSeconds + deltaSeconds);
            }
            asset.heartbeatCount += 1;
        });
    }, [ensureAssetState, getCurrentAssetIdentity, updateAssetState]);

    const buildSessionPayload = useCallback((reason: string, close: boolean) => {
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
        const maxAssetWatchSeconds = roundSeconds(allAssets.reduce((max, asset) => Math.max(max, asset.totalWatchSeconds), 0));
        const loadMsTotal = Math.round(allAssets.reduce((sum, asset) => sum + asset.loadMsTotal, 0));
        const loadSampleCount = allAssets.reduce((sum, asset) => sum + asset.loadSampleCount, 0);
        const assetRevisionMap = new Map<string, number>(dirtyAssets.map((asset) => [asset.assetKey, asset.revision]));

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
            totalWatchSeconds,
            totalVisibleSeconds,
            maxAssetWatchSeconds,
            viewedAssetCount: allAssets.filter((asset) => asset.totalWatchSeconds > 0 || asset.totalVisibleSeconds > 0 || asset.loadSampleCount > 0).length,
            completedAssetCount: allAssets.filter((asset) => asset.isCompleted).length,
            consumedAssetCount: allAssets.filter((asset) => asset.isConsumed).length,
            assetSwitchCount: sessionMetadataRef.current.assetSwitchCount,
            downloadCount: sessionMetadataRef.current.downloadCount,
            relatedClickCount: sessionMetadataRef.current.relatedClickCount,
            loadMsTotal,
            loadSampleCount,
            averageLoadMs: loadSampleCount > 0 ? Math.round(loadMsTotal / loadSampleCount) : 0,
            assets: dirtyAssets.map((asset) => ({
                assetKey: asset.assetKey,
                assetIndex: asset.assetIndex,
                contentKind: asset.contentKind,
                firstSeenAtMs: asset.firstSeenAtMs,
                lastSeenAtMs: asset.lastSeenAtMs,
                startedAtMs: asset.startedAtMs,
                totalWatchSeconds: asset.totalWatchSeconds,
                totalVisibleSeconds: asset.totalVisibleSeconds,
                maxProgressSeconds: asset.maxProgressSeconds,
                checkpointMaxSeconds: asset.checkpointMaxSeconds,
                durationSeconds: asset.durationSeconds ?? null,
                consumedAtMs: asset.consumedAtMs ?? null,
                completedAtMs: asset.completedAtMs ?? null,
                isConsumed: asset.isConsumed,
                isCompleted: asset.isCompleted,
                heartbeatCount: asset.heartbeatCount,
                loadMsTotal: asset.loadMsTotal,
                loadSampleCount: asset.loadSampleCount,
            })),
        };

        return {
            payload,
            sessionRevision: sessionRevisionRef.current,
            assetRevisionMap,
        };
    }, [applyActiveDelta, getCurrentAssetIdentity]);

    const flushSession = useCallback(async (reason: string, options?: FlushOptions) => {
        const payloadBundle = buildSessionPayload(reason, options?.close === true);
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
                if (options?.close && watchSessionIdRef.current === activeWatchSessionId && flushSucceeded) {
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
    }, [buildSessionPayload, resetSessionState]);

    flushSessionRef.current = flushSession;

    const reportAssetStarted = useCallback(() => {
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
    }, [ensureAssetState, updateAssetState]);

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

    const reportAssetProgress = useCallback((progressSeconds: number, durationSeconds?: number) => {
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
            }
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, updateAssetState]);

    const reportAssetConsumed = useCallback((progressSeconds?: number, durationSeconds?: number) => {
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
            }
            asset.isConsumed = true;
            asset.consumedAtMs = asset.consumedAtMs ?? currentTimestamp();
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, updateAssetState]);

    const reportAssetCompleted = useCallback((progressSeconds?: number, durationSeconds?: number) => {
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
            }
            asset.isConsumed = true;
            asset.isCompleted = true;
            asset.consumedAtMs = asset.consumedAtMs ?? currentTimestamp();
            asset.completedAtMs = asset.completedAtMs ?? currentTimestamp();
            asset.lastSeenAtMs = Math.max(asset.lastSeenAtMs, currentTimestamp());
        });
    }, [ensureAssetState, updateAssetState]);

    const reportMediaPlay = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        reportAssetStarted();
        if (Number.isFinite(progressSeconds)) {
            reportAssetProgress(progressSeconds || 0, durationSeconds);
        }
        applyActiveDelta();
        mediaPlayingRef.current = true;
        lastTickAtRef.current = currentTimestamp();
    }, [applyActiveDelta, reportAssetProgress, reportAssetStarted]);

    const reportMediaPause = useCallback((progressSeconds?: number, durationSeconds?: number) => {
        if (Number.isFinite(progressSeconds)) {
            reportAssetProgress(progressSeconds || 0, durationSeconds);
        }
        applyActiveDelta();
        mediaPlayingRef.current = false;
        lastTickAtRef.current = currentTimestamp();
    }, [applyActiveDelta, reportAssetProgress]);

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
        lastTickAtRef.current = currentTimestamp();
        if (hidden) {
            void flushSessionRef.current("visibility_hidden", { keepalive: true });
        }
    }, [applyActiveDelta]);

    useEffect(() => {
        if (!options.enabled || !options.dropId) {
            resetSessionState();
            return;
        }

        resetSessionState();
        const clientSessionId = getClientSessionId();
        const nextWatchSessionId = createAnalyticsWatchSessionId(clientSessionId);
        const startedAtMs = currentTimestamp();

        watchSessionIdRef.current = nextWatchSessionId;
        clientSessionIdRef.current = clientSessionId;
        sessionStartedAtRef.current = startedAtMs;
        lastTickAtRef.current = startedAtMs;
        previousAssetKeyRef.current = null;
        sessionDirtyRef.current = true;
        setWatchSessionId(nextWatchSessionId);

    }, [options.dropId, options.enabled, resetSessionState]);

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
                        const response = await authFetch("/api/viewer/watch-session", {
                            method: "POST",
                            body: JSON.stringify(entry.payload),
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
            mediaPlayingRef.current = false;
            sessionMetadataRef.current.assetSwitchCount += 1;
            markSessionDirty();
            lastTickAtRef.current = currentTimestamp();
        }

        previousAssetKeyRef.current = currentAssetKey;
    }, [applyActiveDelta, markSessionDirty, options.activeAssetIndex, options.dropId, options.enabled, watchSessionId]);

    useEffect(() => {
        if (!watchSessionIdRef.current || !options.enabled || !options.dropId) {
            return;
        }

        const intervalId = window.setInterval(() => {
            applyActiveDelta();
            if (!sessionDirtyRef.current && dirtyAssetKeysRef.current.size === 0) {
                return;
            }

            const timestamp = currentTimestamp();
            if (timestamp - lastHeartbeatFlushAtRef.current >= HEARTBEAT_FLUSH_WINDOW_MS) {
                void flushSessionRef.current("heartbeat");
            }
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [applyActiveDelta, options.dropId, options.enabled, watchSessionId]);

    useEffect(() => {
        if (!watchSessionIdRef.current || !options.enabled || !options.dropId) {
            return;
        }

        const handleVisibilityChange = () => {
            noteVisibility(document.visibilityState === "hidden");
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [noteVisibility, options.dropId, options.enabled, watchSessionId]);

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
    };
}
