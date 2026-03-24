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
import {
    ANALYTICS_CANONICAL_COLLECTIONS,
    ANALYTICS_ROUTE_POLICIES,
} from "@/lib/server/analytics-governance";
import { VIEWER_WATCH_CONTENT_KINDS } from "@/lib/viewer-watch-session";

const MAX_WATCH_SESSION_BODY_BYTES = 96 * 1024;

const assetSnapshotSchema = z.object({
    assetKey: z.string().min(1).max(120),
    assetIndex: z.number().int().min(1).max(100),
    contentKind: z.enum(VIEWER_WATCH_CONTENT_KINDS),
    firstSeenAtMs: z.number().int().positive(),
    lastSeenAtMs: z.number().int().positive(),
    startedAtMs: z.number().int().positive(),
    totalWatchSeconds: z.number().min(0).max(172800),
    totalVisibleSeconds: z.number().min(0).max(172800),
    maxProgressSeconds: z.number().min(0).max(172800),
    checkpointMaxSeconds: z.number().min(0).max(172800),
    durationSeconds: z.number().int().positive().nullable().optional(),
    consumedAtMs: z.number().int().positive().nullable().optional(),
    completedAtMs: z.number().int().positive().nullable().optional(),
    isConsumed: z.boolean(),
    isCompleted: z.boolean(),
    heartbeatCount: z.number().int().min(0).max(100000),
    loadMsTotal: z.number().int().min(0).max(172800000),
    loadSampleCount: z.number().int().min(0).max(10000),
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
    totalWatchSeconds: z.number().min(0).max(172800),
    totalVisibleSeconds: z.number().min(0).max(172800),
    maxAssetWatchSeconds: z.number().min(0).max(172800),
    viewedAssetCount: z.number().int().min(0).max(100),
    completedAssetCount: z.number().int().min(0).max(100),
    consumedAssetCount: z.number().int().min(0).max(100),
    assetSwitchCount: z.number().int().min(0).max(100000),
    downloadCount: z.number().int().min(0).max(100000),
    relatedClickCount: z.number().int().min(0).max(100000),
    loadMsTotal: z.number().int().min(0).max(172800000),
    loadSampleCount: z.number().int().min(0).max(10000),
    averageLoadMs: z.number().int().min(0).max(172800000),
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

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            ...ANALYTICS_ROUTE_POLICIES.viewerWatchSession,
            preAuthRateLimit: ANALYTICS_WRITE,
            rateLimit: ANALYTICS_WRITE,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentLength = Number(request.headers.get("content-length") || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_WATCH_SESSION_BODY_BYTES) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        const parsedBody = watchSessionSchema.parse(await request.json());
        const userRef = adminDb.collection("users").doc(caller.uid);
        const dropRef = adminDb.collection("drops").doc(parsedBody.dropId);
        const [userSnapshot, dropSnapshot] = await Promise.all([userRef.get(), dropRef.get()]);

        if (!userSnapshot.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!dropSnapshot.exists) {
            return NextResponse.json({ error: "Drop not found" }, { status: 404 });
        }

        const userProfile = (userSnapshot.data() as UserProfile | undefined) ?? null;
        const unlockedContent = Array.isArray(userProfile?.unlockedContent) ? userProfile.unlockedContent : [];
        if (!unlockedContent.includes(parsedBody.dropId)) {
            return NextResponse.json({ error: "You do not own this content" }, { status: 403 });
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
        const assetRefs = parsedBody.assets.map((asset) => ({
            asset,
            ref: adminDb
                .collection(ANALYTICS_CANONICAL_COLLECTIONS.watchAssets)
                .doc(createAnalyticsStorageKey("watch_asset", parsedBody.watchSessionId, asset.assetKey)),
        }));

        const transactionResult = await adminDb.runTransaction(async (transaction) => {
            const [existingSessionSnapshot, ...existingAssetSnapshots] = await Promise.all([
                transaction.get(sessionRef),
                ...assetRefs.map(({ ref }) => transaction.get(ref)),
            ]);

            const existingSession = existingSessionSnapshot.exists
                ? existingSessionSnapshot.data() as Record<string, unknown>
                : null;
            const existingSequence = typeof existingSession?.lastSequence === "number"
                ? Number(existingSession.lastSequence)
                : 0;

            if (existingSequence >= parsedBody.sessionSequence) {
                return { accepted: false, stale: true };
            }

            const sessionData = {
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
                totalWatchSeconds: normalizeSeconds(readMax(existingSession?.totalWatchSeconds, parsedBody.totalWatchSeconds)),
                totalVisibleSeconds: normalizeSeconds(readMax(existingSession?.totalVisibleSeconds, parsedBody.totalVisibleSeconds)),
                maxAssetWatchSeconds: normalizeSeconds(readMax(existingSession?.maxAssetWatchSeconds, parsedBody.maxAssetWatchSeconds)),
                viewedAssetCount: Math.max(typeof existingSession?.viewedAssetCount === "number" ? Number(existingSession.viewedAssetCount) : 0, parsedBody.viewedAssetCount),
                completedAssetCount: Math.max(typeof existingSession?.completedAssetCount === "number" ? Number(existingSession.completedAssetCount) : 0, parsedBody.completedAssetCount),
                consumedAssetCount: Math.max(typeof existingSession?.consumedAssetCount === "number" ? Number(existingSession.consumedAssetCount) : 0, parsedBody.consumedAssetCount),
                assetSwitchCount: Math.max(typeof existingSession?.assetSwitchCount === "number" ? Number(existingSession.assetSwitchCount) : 0, parsedBody.assetSwitchCount),
                downloadCount: Math.max(typeof existingSession?.downloadCount === "number" ? Number(existingSession.downloadCount) : 0, parsedBody.downloadCount),
                relatedClickCount: Math.max(typeof existingSession?.relatedClickCount === "number" ? Number(existingSession.relatedClickCount) : 0, parsedBody.relatedClickCount),
                loadMsTotal: Math.max(typeof existingSession?.loadMsTotal === "number" ? Number(existingSession.loadMsTotal) : 0, parsedBody.loadMsTotal),
                loadSampleCount: Math.max(typeof existingSession?.loadSampleCount === "number" ? Number(existingSession.loadSampleCount) : 0, parsedBody.loadSampleCount),
                averageLoadMs: Math.max(typeof existingSession?.averageLoadMs === "number" ? Number(existingSession.averageLoadMs) : 0, parsedBody.averageLoadMs),
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

            transaction.set(sessionRef, sessionData, { merge: true });

            assetRefs.forEach(({ asset, ref }, index) => {
                const existingAssetSnapshot = existingAssetSnapshots[index];
                const existingAsset = existingAssetSnapshot.exists
                    ? existingAssetSnapshot.data() as Record<string, unknown>
                    : null;
                const assetLastTimeKeys = buildAnalyticsTimeKeys(asset.lastSeenAtMs);
                const assetStartedTimeKeys = buildAnalyticsTimeKeys(asset.startedAtMs);

                transaction.set(ref, {
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
                    maxProgressSeconds: Math.max(typeof existingAsset?.maxProgressSeconds === "number" ? Number(existingAsset.maxProgressSeconds) : 0, asset.maxProgressSeconds),
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
                    lastSequence: parsedBody.sessionSequence,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    ...(existingAssetSnapshot.exists ? {} : {
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    }),
                }, { merge: true });
            });

            return { accepted: true, stale: false };
        });

        return NextResponse.json({
            success: true,
            accepted: transactionResult.accepted,
            stale: transactionResult.stale,
            assetCount: parsedBody.assets.length,
            watchSessionId: parsedBody.watchSessionId,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid watch session payload" }, { status: 400 });
        }

        return handleApiError(error, "Viewer.WatchSession.POST");
    }
}
