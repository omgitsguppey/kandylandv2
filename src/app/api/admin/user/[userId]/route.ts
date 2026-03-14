import { NextRequest, NextResponse } from "next/server";
import type { User } from "firebase/auth";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { normalizeTransactionRecord } from "@/lib/transaction-normalizers";
import { normalizeUserProfile } from "@/lib/user-utils";
import { describeSecurityEvent } from "@/lib/security-events";
import { getDropReferenceMap, resolveDropTitle } from "@/lib/server/drop-references";

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

function readNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function roundToSingleDecimal(value: number) {
    return Math.round((value + Number.EPSILON) * 10) / 10;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        await checkRateLimit(request, "admin/user-detail", ADMIN);
        await verifyAdmin(request);

        const { userId } = await context.params;
        const limitParam = Number(request.nextUrl.searchParams.get("limit") || 60);
        const historyLimit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 60;

        const userRef = adminDb.collection("users").doc(userId);
        const [userSnap, transactionsSnap, analyticsRollupSnap, analyticsFactsSnap, securityEventsSnap] = await Promise.all([
            userRef.get(),
            adminDb.collection("transactions")
                .where("userId", "==", userId)
                .orderBy("timestamp", "desc")
                .limit(historyLimit)
                .get(),
            adminDb.collection("analytics_users_rollup").doc(userId).get(),
            adminDb.collection("analytics_event_facts")
                .where("userId", "==", userId)
                .limit(400)
                .get(),
            adminDb.collection("security_events")
                .where("userId", "==", userId)
                .limit(60)
                .get(),
        ]);

        if (!userSnap.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const rawUser = userSnap.data() as Record<string, unknown>;
        const mockUser = {
            uid: userId,
            email: typeof rawUser.email === "string" ? rawUser.email : "",
            displayName: typeof rawUser.displayName === "string" ? rawUser.displayName : "",
            photoURL: typeof rawUser.photoURL === "string" ? rawUser.photoURL : "",
        } as User;

        const user = normalizeUserProfile(rawUser, mockUser);
        if (!user) {
            return NextResponse.json({ error: "User profile is malformed" }, { status: 500 });
        }

        const transactions = transactionsSnap.docs.flatMap((doc) => {
            try {
                const normalized = normalizeTransactionRecord(doc.data(), doc.id);
                const raw = doc.data() as Record<string, unknown>;
                const status = raw.status === "failed" || raw.error
                    ? "failed"
                    : raw.status === "pending"
                        ? "pending"
                        : "completed";

                return [{ ...normalized, status }];
            } catch {
                return [];
            }
        });

        const analyticsRollup = analyticsRollupSnap.exists
            ? analyticsRollupSnap.data() as Record<string, unknown>
            : {};

        const analyticsFacts = analyticsFactsSnap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return {
                    id: doc.id,
                    eventName: readString(data.eventName),
                    timestamp: toTimestampNumber(data.timestamp),
                    dropId: readString(data.dropId),
                    dropTitle: readString(data.dropTitle),
                    sessionWatchSeconds: readNumber(data.sessionWatchSeconds),
                    watchSeconds: readNumber(data.watchSeconds),
                    loadMs: readNumber(data.loadMs),
                };
            })
            .sort((left, right) => right.timestamp - left.timestamp);

        const referencedDropIds = [
            ...analyticsFacts.map((event) => event.dropId).filter(Boolean),
            ...transactions.map((transaction) => transaction.relatedDropId || "").filter(Boolean),
            ...(user.unlockedContent || []),
            ...securityEventsSnap.docs.map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return readString(data.dropId);
            }).filter(Boolean),
        ];
        const dropReferences = await getDropReferenceMap(referencedDropIds);

        const directViewSessionCount = analyticsFacts.filter((event) => event.eventName === "viewer_session_started").length;
        const directViewerOpenedCount = analyticsFacts.filter((event) => event.eventName === "viewer_opened").length;
        const directAssetViewCount = analyticsFacts.filter((event) => event.eventName === "viewer_asset_started").length;
        const directAssetCompletionCount = analyticsFacts.filter((event) => event.eventName === "viewer_asset_completed").length;
        const directDownloadCount = analyticsFacts.filter((event) => event.eventName === "viewer_source_downloaded").length;
        const directRelatedClickCount = analyticsFacts.filter((event) => event.eventName === "viewer_related_drop_clicked").length;
        const directUnwrapCount = analyticsFacts.filter((event) => event.eventName === "unlock_drop_success").length;
        const directEventCount = analyticsFacts.length;
        const directLastSeenAt = analyticsFacts.reduce((latest, event) => Math.max(latest, event.timestamp), 0);
        const completedSessionWatchSeconds = analyticsFacts.reduce((total, event) => {
            if (event.eventName !== "viewer_session_completed") {
                return total;
            }

            return total + Math.max(event.sessionWatchSeconds, event.watchSeconds, 0);
        }, 0);
        const loadSamples = analyticsFacts.filter((event) => event.loadMs > 0).map((event) => event.loadMs);
        const directAvgLoadMs = loadSamples.length > 0
            ? Math.round(loadSamples.reduce((sum, value) => sum + value, 0) / loadSamples.length)
            : 0;

        const viewedDrops = new Map<string, { dropId: string; dropTitle: string; views: number; watchSeconds: number }>();
        analyticsFacts.forEach((event) => {
            if (!event.dropId) {
                return;
            }

            const isViewSignal = event.eventName === "viewer_session_started" || event.eventName === "viewer_opened";
            const isWatchSignal = event.eventName === "viewer_session_completed";

            if (!isViewSignal && !isWatchSignal) {
                return;
            }

            const existing = viewedDrops.get(event.dropId) ?? {
                dropId: event.dropId,
                dropTitle: resolveDropTitle(dropReferences, event.dropId, event.dropTitle),
                views: 0,
                watchSeconds: 0,
            };

            if (isViewSignal) {
                existing.views += 1;
            }

            if (isWatchSignal) {
                existing.watchSeconds += Math.max(event.sessionWatchSeconds, event.watchSeconds, 0);
            }

            viewedDrops.set(event.dropId, existing);
        });

        const rollupWatchSeconds = readNumber(analyticsRollup.watchSecondsTotal);
        const rollupLoadSampleCount = readNumber(analyticsRollup.loadSampleCount);
        const rollupLoadMsTotal = readNumber(analyticsRollup.loadMsTotal);
        const rollupAvgLoadMs = rollupLoadSampleCount > 0 ? Math.round(rollupLoadMsTotal / rollupLoadSampleCount) : 0;

        const analytics = {
            eventCount: Math.max(readNumber(analyticsRollup.eventCount), directEventCount),
            unwrapCount: Math.max(readNumber(analyticsRollup.unwrapCount), directUnwrapCount),
            viewerSessionCount: Math.max(readNumber(analyticsRollup.sessionCount), directViewSessionCount || directViewerOpenedCount),
            viewerCompletionCount: analyticsFacts.filter((event) => event.eventName === "viewer_session_completed").length,
            assetViewCount: directAssetViewCount,
            assetCompletionCount: directAssetCompletionCount,
            uniqueViewedDrops: viewedDrops.size,
            watchSecondsTotal: Math.max(rollupWatchSeconds, completedSessionWatchSeconds),
            watchHours: roundToSingleDecimal(Math.max(rollupWatchSeconds, completedSessionWatchSeconds) / 3600),
            viewCount: directViewSessionCount || directViewerOpenedCount,
            downloadCount: directDownloadCount,
            relatedClickCount: directRelatedClickCount,
            avgLoadMs: Math.max(rollupAvgLoadMs, directAvgLoadMs),
            lastSeenAt: Math.max(readNumber(analyticsRollup.lastSeenAt), directLastSeenAt),
            topViewedDrops: Array.from(viewedDrops.values())
                .sort((left, right) => {
                    if (right.views !== left.views) {
                        return right.views - left.views;
                    }

                    return right.watchSeconds - left.watchSeconds;
                })
                .slice(0, 6),
        };

        const securityEvents = securityEventsSnap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                const descriptor = describeSecurityEvent(readString(data.reason));
                return {
                    id: doc.id,
                    reason: descriptor.reason,
                    label: readString(data.label) || descriptor.label,
                    message: readString(data.message) || descriptor.message,
                    locationLabel: readString(data.locationLabel) || descriptor.locationLabel,
                    severity: readString(data.severity) || descriptor.severity,
                    dropId: readString(data.dropId) || null,
                    dropTitle: readString(data.dropId) ? resolveDropTitle(dropReferences, readString(data.dropId)) : null,
                    timestamp: toTimestampNumber(data.timestamp) || toTimestampNumber(data.createdAt),
                };
            })
            .sort((left, right) => right.timestamp - left.timestamp);

        if (securityEvents.length === 0 && user.securityFlags?.ripAttempts) {
            const descriptor = describeSecurityEvent(user.securityFlags.lastViolationReason);
            securityEvents.push({
                id: "legacy-last-violation",
                reason: descriptor.reason,
                label: descriptor.label,
                message: user.securityFlags.lastViolationMessage || descriptor.message,
                locationLabel: descriptor.locationLabel,
                severity: descriptor.severity,
                dropId: user.securityFlags.lastViolationDropId || null,
                dropTitle: user.securityFlags.lastViolationDropId
                    ? resolveDropTitle(dropReferences, user.securityFlags.lastViolationDropId)
                    : null,
                timestamp: user.securityFlags.lastViolation ? new Date(user.securityFlags.lastViolation).getTime() : 0,
            });
        }

        return NextResponse.json({
            success: true,
            user,
            transactions,
            analytics,
            securityEvents,
            dropReferences,
        });
    } catch (error) {
        return handleApiError(error, "Admin.UserDetail.GET");
    }
}
