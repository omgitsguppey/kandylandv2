import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as admin from "firebase-admin";

import { UserProfile } from "@/types/db";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ANALYTICS_WRITE } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { createAnalyticsStorageKey, isValidAnalyticsWatchSessionId } from "@/lib/analytics-identifiers";
import { buildAnalyticsTimeKeys } from "@/lib/server/analytics-event-utils";
import { recordAnalyticsPipelineFailure } from "@/lib/server/analytics-pipeline-health";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import { profileAllowsIdentifiedAnalytics } from "@/lib/server/privacy-consent";
import {
    ANALYTICS_CANONICAL_COLLECTIONS,
    ANALYTICS_ROUTE_POLICIES,
} from "@/lib/server/analytics-governance";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { trackServerEvent } from "@/lib/server/analytics";
import { buildViewerStartTelemetryEvent } from "@/lib/analytics/viewer-start-telemetry-contract";
import {
    VIEWER_WATCH_CAPTURE_QUALITIES,
    VIEWER_WATCH_CAPTURE_TRANSPORTS,
    VIEWER_WATCH_CONTENT_KINDS,
    deriveViewerWatchAssetState,
    deriveViewerWatchCaptureState,
    deriveViewerWatchSessionState,
    scoreViewerWatchSession,
} from "@/lib/viewer-watch-session";

const MAX_WATCH_SESSION_BODY_BYTES = 96 * 1024;

const assetSnapshotSchema = z.object({
    assetKey: z.string().min(1).max(120),
    assetIndex: z.number().int().min(1).max(100),
    fileId: z.string().min(1).max(180).nullable().optional(),
    mediaType: z.enum(VIEWER_WATCH_CONTENT_KINDS).optional(),
    contentKind: z.enum(VIEWER_WATCH_CONTENT_KINDS),
    firstSeenAtMs: z.number().int().positive(),
    lastSeenAtMs: z.number().int().positive(),
    startedAtMs: z.number().int().positive(),
    totalWatchSeconds: z.number().min(0).max(172800),
    totalVisibleSeconds: z.number().min(0).max(172800),
    totalActiveSeconds: z.number().min(0).max(172800).optional(),
    totalPlayingSeconds: z.number().min(0).max(172800).optional(),
    maxProgressSeconds: z.number().min(0).max(172800),
    maxProgressPercent: z.number().min(0).max(100).optional(),
    checkpointMaxSeconds: z.number().min(0).max(172800),
    durationSeconds: z.number().int().positive().nullable().optional(),
    consumedAtMs: z.number().int().positive().nullable().optional(),
    completedAtMs: z.number().int().positive().nullable().optional(),
    isConsumed: z.boolean(),
    isCompleted: z.boolean(),
    heartbeatCount: z.number().int().min(0).max(100000),
    loadMsTotal: z.number().int().min(0).max(172800000),
    loadSampleCount: z.number().int().min(0).max(10000),
    seekCount: z.number().int().min(0).max(100000).optional(),
    seekForwardSeconds: z.number().min(0).max(172800).optional(),
    seekBackwardSeconds: z.number().min(0).max(172800).optional(),
    waitingCount: z.number().int().min(0).max(100000).optional(),
    waitingDurationSeconds: z.number().min(0).max(172800).optional(),
    playbackRateAverage: z.number().min(0).max(8).optional(),
    mutedSampleCount: z.number().int().min(0).max(100000).optional(),
    viewportVisiblePercent: z.number().min(0).max(100).optional(),
    documentVisibilityState: z.enum(["visible", "hidden", "prerender", "unloaded", "unknown"]).optional(),
    hasFocus: z.boolean().optional(),
});

const watchSessionSchema = z.object({
    watchSessionId: z.string().min(1).max(180).refine((value) => isValidAnalyticsWatchSessionId(value), {
        message: "Invalid watchSessionId",
    }),
    sessionSequence: z.number().int().min(1).max(1000000),
    clientSessionId: z.string().min(1).max(180),
    dropId: z.string().min(1).max(120),
    dropTitle: z.string().max(180).optional().default(""),
    dropCategory: z.string().max(80).optional().default(""),
    pagePath: z.string().max(180).optional().default("/dashboard/viewer"),
    sessionStartedAtMs: z.number().int().positive(),
    firstSeenAtMs: z.number().int().positive(),
    lastSeenAtMs: z.number().int().positive(),
    closedAtMs: z.number().int().positive().nullable().optional(),
    isClosed: z.boolean().default(false),
    closeReason: z.string().max(80).nullable().optional(),
    contentCount: z.number().int().min(0).max(100),
    activeAssetKey: z.string().max(120).nullable().optional(),
    activeAssetIndex: z.number().int().min(1).max(100).nullable().optional(),
    fileId: z.string().min(1).max(180).nullable().optional(),
    mediaIndex: z.number().int().min(1).max(100).nullable().optional(),
    mediaType: z.enum(VIEWER_WATCH_CONTENT_KINDS).nullable().optional(),
    totalWatchSeconds: z.number().min(0).max(172800),
    totalVisibleSeconds: z.number().min(0).max(172800),
    totalActiveSeconds: z.number().min(0).max(172800).optional(),
    totalPlayingSeconds: z.number().min(0).max(172800).optional(),
    maxAssetWatchSeconds: z.number().min(0).max(172800),
    maxProgressPercent: z.number().min(0).max(100).optional(),
    viewedAssetCount: z.number().int().min(0).max(100),
    completedAssetCount: z.number().int().min(0).max(100),
    consumedAssetCount: z.number().int().min(0).max(100),
    assetSwitchCount: z.number().int().min(0).max(100000),
    downloadCount: z.number().int().min(0).max(100000),
    relatedClickCount: z.number().int().min(0).max(100000),
    loadMsTotal: z.number().int().min(0).max(172800000),
    loadSampleCount: z.number().int().min(0).max(10000),
    averageLoadMs: z.number().int().min(0).max(172800000),
    captureQuality: z.enum(VIEWER_WATCH_CAPTURE_QUALITIES).optional(),
    captureTransport: z.enum(VIEWER_WATCH_CAPTURE_TRANSPORTS).optional(),
    replayRecovered: z.boolean().optional(),
    replayRecoveredCount: z.number().int().min(0).max(100000).optional(),
    flushAttemptCount: z.number().int().min(0).max(100000).optional(),
    flushSuccessCount: z.number().int().min(0).max(100000).optional(),
    flushFailureCount: z.number().int().min(0).max(100000).optional(),
    visibilityHiddenCount: z.number().int().min(0).max(100000).optional(),
    hiddenDurationSeconds: z.number().min(0).max(172800).optional(),
    idleDurationSeconds: z.number().min(0).max(172800).optional(),
    gapCount: z.number().int().min(0).max(100000).optional(),
    maxGapMs: z.number().int().min(0).max(172800000).optional(),
    viewportVisiblePercent: z.number().min(0).max(100).optional(),
    documentVisibilityState: z.enum(["visible", "hidden", "prerender", "unloaded", "unknown"]).optional(),
    hasFocus: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    displayMode: z.enum(["browser", "standalone", "fullscreen", "unknown"]).optional(),
    pageDurationMs: z.never().optional(),
    assets: z.array(assetSnapshotSchema).max(64),
});

function readUserDisplayName(userProfile: UserProfile | null, fallbackEmail?: string | null) {
    return userProfile?.username
        || userProfile?.displayName
        || fallbackEmail
        || "Unknown Collector";
}

function readMax(existing: unknown, incoming: number) {
    return Math.max(typeof existing === "number" && Number.isFinite(existing) ? existing : 0, incoming);
}

function readMinTimestamp(existing: unknown, incoming: number) {
    const current = typeof existing === "number" && Number.isFinite(existing) ? existing : incoming;
    return Math.min(current, incoming);
}

function normalizeSeconds(value: number) {
    return Math.max(0, Number(value.toFixed(2)));
}

function buildWatchSessionClientError(
    status: number,
    errorCode:
        | "unauthenticated"
        | "missing_drop_id"
        | "missing_session_id"
        | "invalid_duration"
        | "background_time_rejected"
        | "duplicate_closeout"
        | "not_unlocked"
        | "unsupported_media_kind"
        | "invalid_watch_session_request"
        | "payload_too_large",
    message: string,
) {
    return NextResponse.json({
        success: false,
        error: message,
        errorCode,
        routeStatus: "expected_typed_client_error",
        retryable: false,
        watchScoreSource: "watch_session_rollup",
    }, { status });
}

function classifyWatchSessionZodError(error: z.ZodError) {
    const issue = error.issues[0];
    const path = issue?.path.join(".") ?? "";
    const message = issue?.message ?? "Invalid watch session payload";
    if (path.includes("dropId")) return { code: "missing_drop_id" as const, message };
    if (path.includes("watchSessionId") || path.includes("clientSessionId")) return { code: "missing_session_id" as const, message };
    if (path.includes("totalWatchSeconds") || path.includes("totalVisibleSeconds") || path.includes("totalActiveSeconds") || path.includes("totalPlayingSeconds")) {
        return { code: "invalid_duration" as const, message };
    }
    if (path.includes("contentKind") || path.includes("mediaType")) return { code: "unsupported_media_kind" as const, message };
    return { code: "invalid_watch_session_request" as const, message };
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "viewer/watch-session:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            ...ANALYTICS_ROUTE_POLICIES.viewerWatchSession,
            preAuthRateLimit: ANALYTICS_WRITE,
            rateLimit: ANALYTICS_WRITE,
            requireTrustedOrigin: true,
        });
        if (!caller) {
            return finalize(buildWatchSessionClientError(401, "unauthenticated", "Unauthorized"));
        }

        const parsedBody = watchSessionSchema.parse(await readBoundedJsonBody<unknown>(request, {
            maxBytes: MAX_WATCH_SESSION_BODY_BYTES,
            routeName: "viewer/watch-session",
            allowedContentTypes: ["application/json"],
        }));
        const userRef = adminDb.collection("users").doc(caller.uid);
        const dropRef = adminDb.collection("drops").doc(parsedBody.dropId);
        const [userSnapshot, dropSnapshot] = await Promise.all([userRef.get(), dropRef.get()]);

        if (!userSnapshot.exists) {
            return finalize(buildNotFoundResponse("user", "User not found"));
        }

        if (!dropSnapshot.exists) {
            return finalize(buildNotFoundResponse("drop", "Drop not found"));
        }

        const userProfile = (userSnapshot.data() as UserProfile | undefined) ?? null;
        if (!profileAllowsIdentifiedAnalytics(userProfile, request)) {
            return finalize(NextResponse.json({
                success: true,
                ignored: true,
                reason: "identified_analytics_consent_denied",
                watchSessionId: parsedBody.watchSessionId,
            }));
        }

        const unlockedContent = Array.isArray(userProfile?.unlockedContent) ? userProfile.unlockedContent : [];
        if (!unlockedContent.includes(parsedBody.dropId)) {
            return finalize(buildWatchSessionClientError(403, "not_unlocked", "You do not own this content"));
        }

        const username = readUserDisplayName(userProfile, caller.email);
        const dropRecord = dropSnapshot.data() as Record<string, unknown>;
        const contentUrls = Array.isArray(dropRecord.contentUrls)
            ? dropRecord.contentUrls.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
            : [];
        const canonicalContentCount = Math.max(parsedBody.contentCount, contentUrls.length, typeof dropRecord.contentUrl === "string" && dropRecord.contentUrl ? 1 : 0);
        const startedTimeKeys = buildAnalyticsTimeKeys(parsedBody.sessionStartedAtMs);
        const lastSeenTimeKeys = buildAnalyticsTimeKeys(parsedBody.lastSeenAtMs);
        const sessionRef = adminDb
            .collection(ANALYTICS_CANONICAL_COLLECTIONS.watchSessions)
            .doc(parsedBody.watchSessionId);
        const observationRef = adminDb
            .collection(ANALYTICS_CANONICAL_COLLECTIONS.watchObservations)
            .doc(createAnalyticsStorageKey("watch_observation", parsedBody.watchSessionId, String(parsedBody.sessionSequence)));
        const assetRefs = parsedBody.assets.map((asset) => ({
            asset,
            ref: adminDb
                .collection(ANALYTICS_CANONICAL_COLLECTIONS.watchAssets)
                .doc(createAnalyticsStorageKey("watch_asset", parsedBody.watchSessionId, asset.assetKey)),
        }));

        const transactionResult = await adminDb.runTransaction(async (transaction) => {
            const [existingSessionSnapshot, existingObservationSnapshot, ...existingAssetSnapshots] = await Promise.all([
                transaction.get(sessionRef),
                transaction.get(observationRef),
                ...assetRefs.map(({ ref }) => transaction.get(ref)),
            ]);

            const existingSession = existingSessionSnapshot.exists
                ? existingSessionSnapshot.data() as Record<string, unknown>
                : null;
            if (existingObservationSnapshot.exists) {
                return { accepted: false, stale: false, deduped: true };
            }
            const existingSequence = typeof existingSession?.lastSequence === "number"
                ? Number(existingSession.lastSequence)
                : 0;

            if (existingSequence >= parsedBody.sessionSequence) {
                return { accepted: false, stale: true, deduped: false };
            }

            const captureDerivedState = deriveViewerWatchCaptureState({
                replayRecovered: parsedBody.replayRecovered,
                replayRecoveredCount: parsedBody.replayRecoveredCount,
                gapCount: parsedBody.gapCount,
                flushFailureCount: parsedBody.flushFailureCount,
                isClosed: parsedBody.isClosed,
                closeReason: parsedBody.closeReason ?? null,
            });

            const mergedSessionData = {
                watchSessionId: parsedBody.watchSessionId,
                clientSessionId: parsedBody.clientSessionId,
                userId: caller.uid,
                username,
                dropId: parsedBody.dropId,
                dropTitle: parsedBody.dropTitle || (typeof dropRecord.title === "string" ? dropRecord.title : parsedBody.dropId),
                dropCategory: parsedBody.dropCategory || (typeof dropRecord.type === "string" ? dropRecord.type : ""),
                pagePath: parsedBody.pagePath,
                sessionStartedAtMs: readMinTimestamp(existingSession?.sessionStartedAtMs, parsedBody.sessionStartedAtMs),
                firstSeenAtMs: readMinTimestamp(existingSession?.firstSeenAtMs, parsedBody.firstSeenAtMs),
                lastSeenAtMs: readMax(existingSession?.lastSeenAtMs, parsedBody.lastSeenAtMs),
                closedAtMs: parsedBody.isClosed
                    ? readMax(existingSession?.closedAtMs, parsedBody.closedAtMs ?? parsedBody.lastSeenAtMs)
                    : (typeof existingSession?.closedAtMs === "number" ? existingSession.closedAtMs : null),
                isClosed: Boolean(existingSession?.isClosed) || parsedBody.isClosed,
                closeReason: parsedBody.isClosed
                    ? (parsedBody.closeReason || existingSession?.closeReason || null)
                    : (existingSession?.closeReason || null),
                contentCount: Math.max(
                    typeof existingSession?.contentCount === "number" ? Number(existingSession.contentCount) : 0,
                    canonicalContentCount,
                ),
                activeAssetKey: parsedBody.isClosed ? null : (parsedBody.activeAssetKey ?? null),
                activeAssetIndex: parsedBody.isClosed ? null : (parsedBody.activeAssetIndex ?? null),
                fileId: parsedBody.fileId ?? (typeof existingSession?.fileId === "string" ? existingSession.fileId : null),
                mediaIndex: parsedBody.mediaIndex ?? (typeof existingSession?.mediaIndex === "number" ? Number(existingSession.mediaIndex) : null),
                mediaType: parsedBody.mediaType ?? (typeof existingSession?.mediaType === "string" ? existingSession.mediaType : null),
                totalWatchSeconds: normalizeSeconds(readMax(existingSession?.totalWatchSeconds, parsedBody.totalWatchSeconds)),
                totalVisibleSeconds: normalizeSeconds(readMax(existingSession?.totalVisibleSeconds, parsedBody.totalVisibleSeconds)),
                totalActiveSeconds: normalizeSeconds(readMax(existingSession?.totalActiveSeconds, parsedBody.totalActiveSeconds ?? 0)),
                totalPlayingSeconds: normalizeSeconds(readMax(existingSession?.totalPlayingSeconds, parsedBody.totalPlayingSeconds ?? 0)),
                maxAssetWatchSeconds: normalizeSeconds(readMax(existingSession?.maxAssetWatchSeconds, parsedBody.maxAssetWatchSeconds)),
                maxProgressPercent: normalizeSeconds(readMax(existingSession?.maxProgressPercent, parsedBody.maxProgressPercent ?? 0)),
                viewedAssetCount: Math.max(typeof existingSession?.viewedAssetCount === "number" ? Number(existingSession.viewedAssetCount) : 0, parsedBody.viewedAssetCount),
                completedAssetCount: Math.max(typeof existingSession?.completedAssetCount === "number" ? Number(existingSession.completedAssetCount) : 0, parsedBody.completedAssetCount),
                consumedAssetCount: Math.max(typeof existingSession?.consumedAssetCount === "number" ? Number(existingSession.consumedAssetCount) : 0, parsedBody.consumedAssetCount),
                assetSwitchCount: Math.max(typeof existingSession?.assetSwitchCount === "number" ? Number(existingSession.assetSwitchCount) : 0, parsedBody.assetSwitchCount),
                downloadCount: Math.max(typeof existingSession?.downloadCount === "number" ? Number(existingSession.downloadCount) : 0, parsedBody.downloadCount),
                relatedClickCount: Math.max(typeof existingSession?.relatedClickCount === "number" ? Number(existingSession.relatedClickCount) : 0, parsedBody.relatedClickCount),
                loadMsTotal: Math.max(typeof existingSession?.loadMsTotal === "number" ? Number(existingSession.loadMsTotal) : 0, parsedBody.loadMsTotal),
                loadSampleCount: Math.max(typeof existingSession?.loadSampleCount === "number" ? Number(existingSession.loadSampleCount) : 0, parsedBody.loadSampleCount),
                averageLoadMs: Math.max(typeof existingSession?.averageLoadMs === "number" ? Number(existingSession.averageLoadMs) : 0, parsedBody.averageLoadMs),
                captureQuality: captureDerivedState.captureQuality,
                captureTransport: parsedBody.captureTransport ?? (typeof existingSession?.captureTransport === "string" ? existingSession.captureTransport : "unknown"),
                replayRecovered: Boolean(existingSession?.replayRecovered) || Boolean(parsedBody.replayRecovered) || captureDerivedState.replayRecovered,
                replayRecoveredCount: Math.max(typeof existingSession?.replayRecoveredCount === "number" ? Number(existingSession.replayRecoveredCount) : 0, parsedBody.replayRecoveredCount ?? 0),
                flushAttemptCount: Math.max(typeof existingSession?.flushAttemptCount === "number" ? Number(existingSession.flushAttemptCount) : 0, parsedBody.flushAttemptCount ?? 0),
                flushSuccessCount: Math.max(typeof existingSession?.flushSuccessCount === "number" ? Number(existingSession.flushSuccessCount) : 0, parsedBody.flushSuccessCount ?? 0),
                flushFailureCount: Math.max(typeof existingSession?.flushFailureCount === "number" ? Number(existingSession.flushFailureCount) : 0, parsedBody.flushFailureCount ?? 0),
                visibilityHiddenCount: Math.max(typeof existingSession?.visibilityHiddenCount === "number" ? Number(existingSession.visibilityHiddenCount) : 0, parsedBody.visibilityHiddenCount ?? 0),
                hiddenDurationSeconds: normalizeSeconds(readMax(existingSession?.hiddenDurationSeconds, parsedBody.hiddenDurationSeconds ?? 0)),
                idleDurationSeconds: normalizeSeconds(readMax(existingSession?.idleDurationSeconds, parsedBody.idleDurationSeconds ?? 0)),
                gapCount: Math.max(typeof existingSession?.gapCount === "number" ? Number(existingSession.gapCount) : 0, parsedBody.gapCount ?? 0),
                maxGapMs: Math.max(typeof existingSession?.maxGapMs === "number" ? Number(existingSession.maxGapMs) : 0, parsedBody.maxGapMs ?? 0),
                viewportVisiblePercent: Math.max(typeof existingSession?.viewportVisiblePercent === "number" ? Number(existingSession.viewportVisiblePercent) : 0, parsedBody.viewportVisiblePercent ?? 0),
                documentVisibilityState: parsedBody.documentVisibilityState ?? (typeof existingSession?.documentVisibilityState === "string" ? existingSession.documentVisibilityState : "unknown"),
                hasFocus: parsedBody.hasFocus ?? (typeof existingSession?.hasFocus === "boolean" ? existingSession.hasFocus : null),
                reducedMotion: parsedBody.reducedMotion ?? (typeof existingSession?.reducedMotion === "boolean" ? existingSession.reducedMotion : null),
                displayMode: parsedBody.displayMode ?? (typeof existingSession?.displayMode === "string" ? existingSession.displayMode : "unknown"),
                startedDayKey: startedTimeKeys.dayKey,
                startedHourKey: startedTimeKeys.hourKey,
                lastDayKey: lastSeenTimeKeys.dayKey,
                lastHourKey: lastSeenTimeKeys.hourKey,
                unwrappedAtMs: typeof userProfile?.unlockedContentTimestamps?.[parsedBody.dropId] === "number"
                    ? userProfile.unlockedContentTimestamps[parsedBody.dropId]
                    : null,
                lastSequence: parsedBody.sessionSequence,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                ...(existingSessionSnapshot.exists ? {} : {
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                }),
            };

            const sessionDerivedState = deriveViewerWatchSessionState({
                totalWatchSeconds: mergedSessionData.totalWatchSeconds,
                totalVisibleSeconds: mergedSessionData.totalVisibleSeconds,
                totalActiveSeconds: mergedSessionData.totalActiveSeconds,
                totalPlayingSeconds: mergedSessionData.totalPlayingSeconds,
                hiddenDurationSeconds: mergedSessionData.hiddenDurationSeconds,
                idleDurationSeconds: mergedSessionData.idleDurationSeconds,
                maxAssetWatchSeconds: mergedSessionData.maxAssetWatchSeconds,
                maxProgressPercent: mergedSessionData.maxProgressPercent,
                viewedAssetCount: mergedSessionData.viewedAssetCount,
                completedAssetCount: mergedSessionData.completedAssetCount,
                consumedAssetCount: mergedSessionData.consumedAssetCount,
                assetSwitchCount: mergedSessionData.assetSwitchCount,
                downloadCount: mergedSessionData.downloadCount,
                relatedClickCount: mergedSessionData.relatedClickCount,
                loadSampleCount: mergedSessionData.loadSampleCount,
            });
            const primaryContentKind = parsedBody.assets[0]?.contentKind ?? "unknown";
            const sessionWatchScore = scoreViewerWatchSession({
                contentKind: primaryContentKind,
                totalWatchSeconds: mergedSessionData.totalWatchSeconds,
                totalVisibleSeconds: mergedSessionData.totalVisibleSeconds,
                totalActiveSeconds: mergedSessionData.totalActiveSeconds,
                totalPlayingSeconds: mergedSessionData.totalPlayingSeconds,
                hiddenDurationSeconds: mergedSessionData.hiddenDurationSeconds,
                idleDurationSeconds: mergedSessionData.idleDurationSeconds,
                maxProgressPercent: mergedSessionData.maxProgressPercent,
                completed: mergedSessionData.completedAssetCount > 0,
            });

            const sessionData = {
                ...mergedSessionData,
                watchScore: sessionWatchScore.score,
                watchTier: sessionWatchScore.tier,
                validWatchMs: sessionWatchScore.validWatchMs,
                completionCredit: sessionWatchScore.completionCredit,
                reasonCodes: sessionWatchScore.reasonCodes,
                watchScoreSource: "watch_session_rollup",
                meaningfulWatch: sessionDerivedState.meaningfulWatch,
                deepWatch: sessionDerivedState.deepWatch,
                bounced: sessionDerivedState.bounced,
                abandoned: sessionDerivedState.abandoned,
                stalled: sessionDerivedState.stalled,
                converted: sessionDerivedState.converted,
                completedSession: sessionDerivedState.completedSession,
                openedWithoutDepth: sessionDerivedState.openedWithoutDepth,
                captureDegraded: captureDerivedState.degraded,
                captureReplayRecovered: captureDerivedState.replayRecovered,
                captureCloseMissing: captureDerivedState.closeMissing,
                captureGapDetected: captureDerivedState.gapDetected,
                captureFlushDegraded: captureDerivedState.flushDegraded,
                idleVisibleSeconds: sessionDerivedState.idleVisibleSeconds,
                sessionOutcome: sessionDerivedState.outcome,
                dropOffStage: sessionDerivedState.dropOffStage,
            };

            const observedWatchDeltaMs = Math.max(
                0,
                Math.round((mergedSessionData.totalWatchSeconds - (typeof existingSession?.totalWatchSeconds === "number" ? Number(existingSession.totalWatchSeconds) : 0)) * 1000),
            );
            const observedVisibleDeltaMs = Math.max(
                0,
                Math.round((mergedSessionData.totalVisibleSeconds - (typeof existingSession?.totalVisibleSeconds === "number" ? Number(existingSession.totalVisibleSeconds) : 0)) * 1000),
            );

            transaction.set(sessionRef, sessionData, { merge: true });
            transaction.create(observationRef, {
                observationId: observationRef.id,
                sourceLayer: "observed",
                truthLabel: parsedBody.isClosed ? "live" : "provisional",
                provenance: "viewer_watch_session_flush",
                watchSessionId: parsedBody.watchSessionId,
                sessionSequence: parsedBody.sessionSequence,
                clientSessionId: parsedBody.clientSessionId,
                userId: caller.uid,
                username,
                dropId: parsedBody.dropId,
                dropTitle: parsedBody.dropTitle || (typeof dropRecord.title === "string" ? dropRecord.title : parsedBody.dropId),
                dropCategory: parsedBody.dropCategory || (typeof dropRecord.type === "string" ? dropRecord.type : ""),
                pagePath: parsedBody.pagePath,
                fileId: parsedBody.fileId ?? null,
                mediaIndex: parsedBody.mediaIndex ?? null,
                mediaType: parsedBody.mediaType ?? null,
                sessionStartedAtMs: parsedBody.sessionStartedAtMs,
                observedAtMs: parsedBody.lastSeenAtMs,
                closedAtMs: parsedBody.closedAtMs ?? null,
                isClosed: parsedBody.isClosed,
                closeReason: parsedBody.closeReason ?? null,
                rawObservedWatchTimeMs: Math.round(parsedBody.totalWatchSeconds * 1000),
                rawObservedVisibleTimeMs: Math.round(parsedBody.totalVisibleSeconds * 1000),
                rawObservedActiveTimeMs: Math.round((parsedBody.totalActiveSeconds ?? 0) * 1000),
                rawObservedPlayingTimeMs: Math.round((parsedBody.totalPlayingSeconds ?? 0) * 1000),
                observedWatchDeltaMs,
                observedVisibleDeltaMs,
                validWatchMs: sessionWatchScore.validWatchMs,
                watchScore: sessionWatchScore.score,
                watchTier: sessionWatchScore.tier,
                watchScoreSource: "watch_session_rollup",
                reasonCodes: sessionWatchScore.reasonCodes,
                viewedAssetCount: parsedBody.viewedAssetCount,
                completedAssetCount: parsedBody.completedAssetCount,
                consumedAssetCount: parsedBody.consumedAssetCount,
                assetSwitchCount: parsedBody.assetSwitchCount,
                captureQuality: captureDerivedState.captureQuality,
                captureTransport: parsedBody.captureTransport ?? "unknown",
                replayRecovered: captureDerivedState.replayRecovered,
                gapDetected: captureDerivedState.gapDetected,
                closeMissing: captureDerivedState.closeMissing,
                flushDegraded: captureDerivedState.flushDegraded,
                assets: parsedBody.assets.map((asset) => ({
                    assetKey: asset.assetKey,
                    assetIndex: asset.assetIndex,
                    fileId: asset.fileId ?? null,
                    mediaType: asset.mediaType ?? asset.contentKind,
                    contentKind: asset.contentKind,
                    totalWatchSeconds: asset.totalWatchSeconds,
                    totalVisibleSeconds: asset.totalVisibleSeconds,
                    totalActiveSeconds: asset.totalActiveSeconds ?? 0,
                    totalPlayingSeconds: asset.totalPlayingSeconds ?? 0,
                    maxProgressSeconds: asset.maxProgressSeconds,
                    maxProgressPercent: asset.maxProgressPercent ?? 0,
                    checkpointMaxSeconds: asset.checkpointMaxSeconds,
                    durationSeconds: asset.durationSeconds ?? null,
                    isConsumed: asset.isConsumed,
                    isCompleted: asset.isCompleted,
                })),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            assetRefs.forEach(({ asset, ref }, index) => {
                const existingAssetSnapshot = existingAssetSnapshots[index];
                const existingAsset = existingAssetSnapshot.exists
                    ? existingAssetSnapshot.data() as Record<string, unknown>
                    : null;
                const assetLastTimeKeys = buildAnalyticsTimeKeys(asset.lastSeenAtMs);
                const assetStartedTimeKeys = buildAnalyticsTimeKeys(asset.startedAtMs);

                const mergedAssetData = {
                    watchSessionId: parsedBody.watchSessionId,
                    clientSessionId: parsedBody.clientSessionId,
                    userId: caller.uid,
                    username,
                    dropId: parsedBody.dropId,
                    dropTitle: parsedBody.dropTitle || (typeof dropRecord.title === "string" ? dropRecord.title : parsedBody.dropId),
                    dropCategory: parsedBody.dropCategory || (typeof dropRecord.type === "string" ? dropRecord.type : ""),
                    pagePath: parsedBody.pagePath,
                    assetKey: asset.assetKey,
                    assetIndex: asset.assetIndex,
                    fileId: asset.fileId ?? null,
                    mediaType: asset.mediaType ?? asset.contentKind,
                    contentKind: asset.contentKind,
                    sessionStartedAtMs: parsedBody.sessionStartedAtMs,
                    startedDayKey: assetStartedTimeKeys.dayKey,
                    startedHourKey: assetStartedTimeKeys.hourKey,
                    lastDayKey: assetLastTimeKeys.dayKey,
                    lastHourKey: assetLastTimeKeys.hourKey,
                    firstSeenAtMs: readMinTimestamp(existingAsset?.firstSeenAtMs, asset.firstSeenAtMs),
                    lastSeenAtMs: readMax(existingAsset?.lastSeenAtMs, asset.lastSeenAtMs),
                    startedAtMs: readMinTimestamp(existingAsset?.startedAtMs, asset.startedAtMs),
                    totalWatchSeconds: normalizeSeconds(readMax(existingAsset?.totalWatchSeconds, asset.totalWatchSeconds)),
                    totalVisibleSeconds: normalizeSeconds(readMax(existingAsset?.totalVisibleSeconds, asset.totalVisibleSeconds)),
                    totalActiveSeconds: normalizeSeconds(readMax(existingAsset?.totalActiveSeconds, asset.totalActiveSeconds ?? 0)),
                    totalPlayingSeconds: normalizeSeconds(readMax(existingAsset?.totalPlayingSeconds, asset.totalPlayingSeconds ?? 0)),
                    maxProgressSeconds: Math.max(typeof existingAsset?.maxProgressSeconds === "number" ? Number(existingAsset.maxProgressSeconds) : 0, asset.maxProgressSeconds),
                    maxProgressPercent: Math.max(typeof existingAsset?.maxProgressPercent === "number" ? Number(existingAsset.maxProgressPercent) : 0, asset.maxProgressPercent ?? 0),
                    checkpointMaxSeconds: Math.max(typeof existingAsset?.checkpointMaxSeconds === "number" ? Number(existingAsset.checkpointMaxSeconds) : 0, asset.checkpointMaxSeconds),
                    durationSeconds: Math.max(typeof existingAsset?.durationSeconds === "number" ? Number(existingAsset.durationSeconds) : 0, asset.durationSeconds ?? 0) || null,
                    consumedAtMs: asset.isConsumed
                        ? readMinTimestamp(existingAsset?.consumedAtMs, asset.consumedAtMs ?? asset.lastSeenAtMs)
                        : (typeof existingAsset?.consumedAtMs === "number" ? existingAsset.consumedAtMs : null),
                    completedAtMs: asset.isCompleted
                        ? readMinTimestamp(existingAsset?.completedAtMs, asset.completedAtMs ?? asset.lastSeenAtMs)
                        : (typeof existingAsset?.completedAtMs === "number" ? existingAsset.completedAtMs : null),
                    isConsumed: Boolean(existingAsset?.isConsumed) || asset.isConsumed,
                    isCompleted: Boolean(existingAsset?.isCompleted) || asset.isCompleted,
                    heartbeatCount: Math.max(typeof existingAsset?.heartbeatCount === "number" ? Number(existingAsset.heartbeatCount) : 0, asset.heartbeatCount),
                    loadMsTotal: Math.max(typeof existingAsset?.loadMsTotal === "number" ? Number(existingAsset.loadMsTotal) : 0, asset.loadMsTotal),
                    loadSampleCount: Math.max(typeof existingAsset?.loadSampleCount === "number" ? Number(existingAsset.loadSampleCount) : 0, asset.loadSampleCount),
                    seekCount: Math.max(typeof existingAsset?.seekCount === "number" ? Number(existingAsset.seekCount) : 0, asset.seekCount ?? 0),
                    seekForwardSeconds: normalizeSeconds(readMax(existingAsset?.seekForwardSeconds, asset.seekForwardSeconds ?? 0)),
                    seekBackwardSeconds: normalizeSeconds(readMax(existingAsset?.seekBackwardSeconds, asset.seekBackwardSeconds ?? 0)),
                    waitingCount: Math.max(typeof existingAsset?.waitingCount === "number" ? Number(existingAsset.waitingCount) : 0, asset.waitingCount ?? 0),
                    waitingDurationSeconds: normalizeSeconds(readMax(existingAsset?.waitingDurationSeconds, asset.waitingDurationSeconds ?? 0)),
                    playbackRateAverage: Math.max(typeof existingAsset?.playbackRateAverage === "number" ? Number(existingAsset.playbackRateAverage) : 0, asset.playbackRateAverage ?? 0),
                    mutedSampleCount: Math.max(typeof existingAsset?.mutedSampleCount === "number" ? Number(existingAsset.mutedSampleCount) : 0, asset.mutedSampleCount ?? 0),
                    viewportVisiblePercent: Math.max(typeof existingAsset?.viewportVisiblePercent === "number" ? Number(existingAsset.viewportVisiblePercent) : 0, asset.viewportVisiblePercent ?? 0),
                    documentVisibilityState: asset.documentVisibilityState ?? (typeof existingAsset?.documentVisibilityState === "string" ? existingAsset.documentVisibilityState : "unknown"),
                    hasFocus: asset.hasFocus ?? (typeof existingAsset?.hasFocus === "boolean" ? existingAsset.hasFocus : null),
                    lastSequence: parsedBody.sessionSequence,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    ...(existingAssetSnapshot.exists ? {} : {
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                };

                const assetDerivedState = deriveViewerWatchAssetState({
                    totalWatchSeconds: mergedAssetData.totalWatchSeconds,
                    totalVisibleSeconds: mergedAssetData.totalVisibleSeconds,
                    totalActiveSeconds: mergedAssetData.totalActiveSeconds,
                    totalPlayingSeconds: mergedAssetData.totalPlayingSeconds,
                    maxProgressSeconds: mergedAssetData.maxProgressSeconds,
                    maxProgressPercent: mergedAssetData.maxProgressPercent,
                    completedAssetCount: mergedAssetData.isCompleted ? 1 : 0,
                    consumedAssetCount: mergedAssetData.isConsumed ? 1 : 0,
                    loadSampleCount: mergedAssetData.loadSampleCount,
                    viewedAssetCount: 1,
                });
                const assetWatchScore = scoreViewerWatchSession({
                    contentKind: mergedAssetData.contentKind,
                    totalWatchSeconds: mergedAssetData.totalWatchSeconds,
                    totalVisibleSeconds: mergedAssetData.totalVisibleSeconds,
                    totalActiveSeconds: mergedAssetData.totalActiveSeconds,
                    totalPlayingSeconds: mergedAssetData.totalPlayingSeconds,
                    hiddenDurationSeconds: 0,
                    idleDurationSeconds: 0,
                    maxProgressPercent: mergedAssetData.maxProgressPercent,
                    completed: mergedAssetData.isCompleted,
                });

                transaction.set(ref, {
                    ...mergedAssetData,
                    watchScore: assetWatchScore.score,
                    watchTier: assetWatchScore.tier,
                    validWatchMs: assetWatchScore.validWatchMs,
                    completionCredit: assetWatchScore.completionCredit,
                    reasonCodes: assetWatchScore.reasonCodes,
                    watchScoreSource: "watch_session_rollup",
                    meaningfulWatch: assetDerivedState.meaningfulWatch,
                    deepWatch: assetDerivedState.deepWatch,
                    bounced: assetDerivedState.bounced,
                    abandoned: assetDerivedState.abandoned,
                    stalled: assetDerivedState.stalled,
                    converted: assetDerivedState.converted,
                    openedWithoutDepth: assetDerivedState.openedWithoutDepth,
                    idleVisibleSeconds: assetDerivedState.idleVisibleSeconds,
                    assetOutcome: assetDerivedState.outcome,
                    dropOffStage: assetDerivedState.dropOffStage,
                }, { merge: true });
            });

            return { accepted: true, stale: false, deduped: false };
        });

        if (transactionResult.accepted && parsedBody.sessionSequence === 1) {
            const viewerStartTelemetry = buildViewerStartTelemetryEvent({
                userId: caller.uid,
                dropId: parsedBody.dropId,
                watchSessionId: parsedBody.watchSessionId,
                clientSessionId: parsedBody.clientSessionId,
                entitlementState: "unlocked",
                mediaKind: parsedBody.mediaType ?? parsedBody.assets[0]?.contentKind ?? "unknown",
                route: parsedBody.pagePath || "/dashboard/viewer",
                sourceComponent: "viewer_watch_session_route",
                consentState: "granted",
            });
            await trackServerEvent(viewerStartTelemetry.eventName, viewerStartTelemetry.params, caller.uid).catch(() => null);
        }

        return finalize(NextResponse.json({
            success: true,
            accepted: transactionResult.accepted,
            stale: transactionResult.stale,
            deduped: transactionResult.deduped,
            assetCount: parsedBody.assets.length,
            watchSessionId: parsedBody.watchSessionId,
            watchScoreSource: "watch_session_rollup",
        }));
    } catch (error) {
        if (isBoundedJsonBodyError(error)) {
            return finalize(buildWatchSessionClientError(
                error.status,
                error.code === "payload_too_large" ? "payload_too_large" : "invalid_watch_session_request",
                error.message,
            ), error);
        }
        if (error instanceof z.ZodError) {
            const classified = classifyWatchSessionZodError(error);
            return finalize(buildWatchSessionClientError(400, classified.code, classified.message), error);
        }

        await recordServerDiagnostic({
            channel: "analytics",
            severity: "error",
            message: "Viewer watch session write failed",
            detail: {
                route: "viewer/watch-session",
                error: error instanceof Error ? error.message : String(error),
            },
        });
        await recordAnalyticsPipelineFailure({
            routeName: "viewer/watch-session",
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        return finalize(handleApiError(error, "Viewer.WatchSession.POST"), error);
    }
}
