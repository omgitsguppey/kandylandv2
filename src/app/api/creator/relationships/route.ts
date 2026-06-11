import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { CREATOR_COLLECTIONS, buildCreatorRelationshipId } from "@/lib/creator-experiences";
import { isCreatorVisibleInDiscovery } from "@/lib/creator-public-pages";
import { buildRelationshipPatch } from "@/lib/server/creator-experiences";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";
import { getErrorMessage } from "@/lib/server/route-diagnostics";
import { recordRouteRuntimeSample } from "@/lib/server/route-runtime-health";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { buildDeterministicCreatorRecommendations } from "@/lib/server/behavioral-intelligence";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { mapWithConcurrency } from "@/lib/server/bounded-concurrency";
import { isBoundedJsonBodyError, readBoundedJsonBody } from "@/lib/server/bounded-json-body";
import {
    CREATOR_RELATIONSHIP_DEBUG_LANE,
    buildCreatorRelationshipTelemetryPayload,
    classifyCreatorRelationshipState,
    type CreatorRelationshipEventName,
} from "@/lib/discovery/creator-relationship-contract";

const CREATOR_RELATIONSHIPS_READ_LIMIT = 500;
const CREATOR_RELATIONSHIP_DISCOVERY_USER_LIMIT = 1_000;
const CREATOR_RELATIONSHIP_DISCOVERY_DROP_LIMIT = 2_000;
const CREATOR_RELATIONSHIP_BODY_LIMIT_BYTES = 32_768;
const CREATOR_RELATIONSHIP_FOLLOWER_COUNT_CONCURRENCY = 6;

type CreatorRelationshipRecord = Record<string, unknown> & {
    id: string;
    creatorId?: unknown;
    following?: unknown;
    notificationsEnabled?: unknown;
};

type RecommendedCreatorRecord = Record<string, unknown> & {
    id: string;
    role?: unknown;
    status?: unknown;
    displayName?: unknown;
    username?: unknown;
    photoURL?: unknown;
    bio?: unknown;
    isVerified?: unknown;
    creatorApplication?: unknown;
};

type CreatorListEntry = {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    bio: string;
    isVerified: boolean;
};

const relationshipActionSchema = z.object({
    creatorId: z.string().trim().min(1),
    action: z.enum([
        "follow",
        "unfollow",

        "enable_notifications",
        "disable_notifications",
    ]),
});

function buildSubscriptionId(userId: string, creatorId: string) {
    return `${userId}__${creatorId}`;
}

async function getCreatorRecord(creatorId: string) {
    if (!adminDb) {
        return null;
    }

    const creatorSnap = await adminDb.collection("users").doc(creatorId).get();
    if (!creatorSnap.exists) {
        return null;
    }

    const data = creatorSnap.data() as Record<string, unknown>;
    if (!isCreatorVisibleInDiscovery({
        role: data.role,
        status: data.status,
        creatorApplication: data.creatorApplication,
    })) {
        return null;
    }

    return {
        id: creatorSnap.id,
        displayName: typeof data.displayName === "string" && data.displayName.trim().length > 0 ? data.displayName.trim() : "Creator",
        username: typeof data.username === "string" ? data.username : "",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    };
}

async function countActiveCreatorFollowers(creatorId: string) {
    if (!adminDb) {
        return 0;
    }

    const query = adminDb.collection(CREATOR_COLLECTIONS.relationships)
        .where("creatorId", "==", creatorId)
        .where("following", "==", true);

    if (typeof query.count === "function") {
        const snapshot = await query.count().get();
        return Number(snapshot.data().count) || 0;
    }

    const snapshot = await query.limit(CREATOR_RELATIONSHIPS_READ_LIMIT).get();
    return snapshot.size || snapshot.docs.length || 0;
}

function buildRelationshipDebug(status: "loaded" | "failed", detail: Record<string, unknown> = {}) {
    return {
        lane: CREATOR_RELATIONSHIP_DEBUG_LANE,
        sourceTruth: "creator_relationships",
        status,
        ...detail,
    };
}

async function trackCreatorRelationshipRouteEvent(input: {
    eventName: CreatorRelationshipEventName;
    callerUid?: string | null;
    creatorId?: string | null;
    relationshipState?: ReturnType<typeof classifyCreatorRelationshipState>;
    recommendationCount?: number | null;
    listCount?: number | null;
    followerCount?: number | null;
    action?: "follow" | "unfollow" | "load" | "view" | "click" | null;
    failureReason?: string | null;
}) {
    await trackServerEvent(input.eventName, buildCreatorRelationshipTelemetryPayload({
        eventName: input.eventName,
        viewerUserId: input.callerUid,
        creatorId: input.creatorId,
        surface: "creator_relationships",
        sourceComponent: "creator_relationships_route",
        relationshipState: input.relationshipState,
        recommendationSource: "relationship_route",
        failureReason: input.failureReason,
        listCount: input.listCount,
        recommendationCount: input.recommendationCount,
        followerCount: input.followerCount,
        action: input.action,
    }), input.callerUid ?? undefined).catch(() => null);
}

export async function GET(request: NextRequest) {
    const startedAt = Date.now();
    let callerUid = "";
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "creator/relationships:GET",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/relationships",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        callerUid = caller.uid;

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        const relationshipsSnap = await adminDb
            .collection(CREATOR_COLLECTIONS.relationships)
            .where("userId", "==", caller.uid)
            .limit(CREATOR_RELATIONSHIPS_READ_LIMIT)
            .get();

        const rawRelationships = relationshipsSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Record<string, unknown>),
        }) as CreatorRelationshipRecord);

        const now = Date.now();
        const [recommendedCreatorDocs, dropsSnap] = await Promise.all([
            adminDb.collection("users")
                .select("role", "status", "displayName", "username", "photoURL", "bio", "isVerified", "creatorApplication")
                .limit(CREATOR_RELATIONSHIP_DISCOVERY_USER_LIMIT)
                .get(),
            adminDb.collection("drops").limit(CREATOR_RELATIONSHIP_DISCOVERY_DROP_LIMIT).get(),
        ]);
        const activeDropCounts = new Map<string, number>();
        dropsSnap.docs.forEach((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            if (!normalized || isDropHiddenFromPublic(normalized) || normalized.status !== "active" || !normalized.creatorId) {
                return;
            }

            activeDropCounts.set(normalized.creatorId, (activeDropCounts.get(normalized.creatorId) ?? 0) + 1);
        });

        const validCreators: CreatorListEntry[] = [];
        for (const doc of recommendedCreatorDocs.docs) {
            const entry = { id: doc.id, ...(doc.data() as Record<string, unknown>) } as RecommendedCreatorRecord;
            if (entry.id === caller.uid) {
                continue;
            }
            if (isCreatorVisibleInDiscovery({
                role: entry.role,
                status: entry.status,
                creatorApplication: entry.creatorApplication,
                activeDropCount: activeDropCounts.get(entry.id) ?? 0,
            })) {
                validCreators.push({
                    uid: entry.id,
                    displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : "Creator",
                    username: typeof entry.username === "string" ? entry.username : "",
                    photoURL: typeof entry.photoURL === "string" ? entry.photoURL : null,
                    bio: typeof entry.bio === "string" ? entry.bio : "",
                    isVerified: entry.isVerified === true,
                });
            }
        }
        
        const creatorRanking = await buildDeterministicCreatorRecommendations({
            userId: caller.uid,
            creatorIds: validCreators.map((entry) => entry.uid),
            activeDropCounts: Object.fromEntries(activeDropCounts.entries()),
            limit: validCreators.length,
        });
        const creatorScoreMap = new Map(creatorRanking.map((entry) => [entry.creatorId, entry.score]));
        validCreators.sort((left, right) => {
            const leftScore = creatorScoreMap.get(left.uid) ?? 0;
            const rightScore = creatorScoreMap.get(right.uid) ?? 0;
            const leftDrops = activeDropCounts.get(left.uid) ?? 0;
            const rightDrops = activeDropCounts.get(right.uid) ?? 0;
            return rightScore - leftScore || rightDrops - leftDrops || left.displayName.localeCompare(right.displayName);
        });

        const validCreatorsById = new Map(validCreators.map((entry) => [entry.uid, entry]));
        const validCreatorIds = new Set(validCreators.map((entry) => entry.uid));
        const relationships = rawRelationships.filter((entry) => typeof entry.creatorId === "string" && validCreatorIds.has(entry.creatorId));

        const followedCreatorIds = relationships
            .filter((entry) => entry.following === true && typeof entry.creatorId === "string")
            .map((entry) => String(entry.creatorId));
        const recommendedCreatorIds = validCreators
            .filter((entry) => !followedCreatorIds.includes(entry.uid))
            .slice(0, 12)
            .map((entry) => entry.uid);
        const visibleCreatorIds = Array.from(new Set(
            creatorId
                ? [creatorId]
                : [...followedCreatorIds, ...recommendedCreatorIds],
        ));
        const realtimeFollowerCounts = new Map(
            await mapWithConcurrency(
                visibleCreatorIds,
                CREATOR_RELATIONSHIP_FOLLOWER_COUNT_CONCURRENCY,
                async (entry) => [entry, await countActiveCreatorFollowers(entry)] as const,
            ),
        );

        if (creatorId) {
            const relationship = relationships.find((entry) => entry.creatorId === creatorId) || null;
            // bounded document read: one caller/creator subscription pair.
            const subscriptionSnap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(buildSubscriptionId(caller.uid, creatorId)).get();
            const relationshipState = classifyCreatorRelationshipState({
                viewerUserId: caller.uid,
                creatorId,
                following: relationship?.following === true,
                unavailable: !validCreatorIds.has(creatorId),
            });
            await trackCreatorRelationshipRouteEvent({
                eventName: "creator_relationship_list_loaded",
                callerUid: caller.uid,
                creatorId,
                relationshipState,
                listCount: relationship ? 1 : 0,
                recommendationCount: recommendedCreatorIds.length,
                followerCount: realtimeFollowerCounts.get(creatorId) ?? 0,
                action: "load",
            });

            return finalize(NextResponse.json({
                success: true,
                relationship: relationship
                    ? {
                        ...relationship,
                        followerCount: realtimeFollowerCounts.get(creatorId) ?? 0,
                        relationshipState,
                    }
                    : null,
                subscription: subscriptionSnap.exists ? { id: subscriptionSnap.id, ...(subscriptionSnap.data() as Record<string, unknown>) } : null,
                relationshipDebug: buildRelationshipDebug("loaded", {
                    relationshipState,
                    debugReason: "bounded caller/creator relationship lookup",
                }),
            }));
        }

        const followedCreators = followedCreatorIds
            .map((entry) => validCreatorsById.get(entry))
            .filter((entry): entry is CreatorListEntry => Boolean(entry))
            .map((entry) => ({
                uid: entry.uid,
                displayName: entry.displayName,
                username: entry.username,
                photoURL: entry.photoURL,
                bio: entry.bio,
                isVerified: entry.isVerified,
                followerCount: realtimeFollowerCounts.get(entry.uid) ?? 0,
                following: true,
            }));
        const recommendedCreators = validCreators
            .filter((entry) => !followedCreatorIds.includes(entry.uid))
            .slice(0, 12)
            .map((entry) => ({
                uid: entry.uid,
                displayName: entry.displayName,
                username: entry.username,
                photoURL: entry.photoURL,
                bio: entry.bio,
                isVerified: entry.isVerified,
                followerCount: realtimeFollowerCounts.get(entry.uid) ?? 0,
            }));

        await trackCreatorRelationshipRouteEvent({
            eventName: "creator_relationship_list_loaded",
            callerUid: caller.uid,
            relationshipState: "unknown",
            listCount: relationships.length,
            recommendationCount: recommendedCreators.length,
            action: "load",
        });

        return finalize(NextResponse.json({
            success: true,
            relationships,
            followedCreators,
            recommendedCreators,
            relationshipDebug: buildRelationshipDebug("loaded", {
                followedCreatorCount: followedCreators.length,
                recommendedCreatorCount: recommendedCreators.length,
                debugReason: "bounded relationship and creator discovery query",
            }),
        }));
    } catch (error) {
        void trackCreatorRelationshipRouteEvent({
            eventName: "creator_relationship_list_failed",
            callerUid,
            relationshipState: "unknown",
            action: "load",
            failureReason: getErrorMessage(error) || "creator_relationship_list_failed",
        });
        return finalize(handleApiError(error, "Creator.Relationships.GET"), error);
    }
}

export async function POST(request: NextRequest) {
    const startedAt = Date.now();
    let callerUid = "";
    let parsedCreatorId = "";
    let parsedAction: z.infer<typeof relationshipActionSchema>["action"] | "" = "";
    const finalize = (response: NextResponse, error?: unknown) => {
        void recordRouteRuntimeSample({
            key: "creator/relationships:POST",
            durationMs: Date.now() - startedAt,
            statusCode: response.status,
            errorMessage: error ? getErrorMessage(error) : null,
        });
        return response;
    };

    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/relationships",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return finalize(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        callerUid = caller.uid;

        const body = await readBoundedJsonBody<z.infer<typeof relationshipActionSchema>>(request, {
            maxBytes: CREATOR_RELATIONSHIP_BODY_LIMIT_BYTES,
            routeName: "creator/relationships",
            allowEmpty: false,
        });
        const { creatorId, action } = relationshipActionSchema.parse(body);
        parsedCreatorId = creatorId;
        parsedAction = action;
        if (creatorId === caller.uid) {
            return finalize(NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 }));
        }

        const creator = await getCreatorRecord(creatorId);
        if (!creator) {
            return finalize(buildNotFoundResponse("creator", "Creator not found"));
        }
        if (action === "follow" || action === "unfollow") {
            await trackCreatorRelationshipRouteEvent({
                eventName: action === "follow" ? "creator_follow_attempted" : "creator_unfollow_attempted",
                callerUid: caller.uid,
                creatorId,
                relationshipState: action === "follow" ? "not_following" : "following",
                action,
            });
        }

        const relationshipRef = adminDb.collection(CREATOR_COLLECTIONS.relationships).doc(buildCreatorRelationshipId(caller.uid, creatorId));
        const userRef = adminDb.collection("users").doc(caller.uid);
        const creatorOpsRef = adminDb.collection("creator_ops").doc(creatorId);

        const result = await adminDb.runTransaction(async (transaction) => {
            const [relationshipSnap, userSnap] = await Promise.all([
                transaction.get(relationshipRef),
                transaction.get(userRef),
            ]);

            if (!userSnap.exists) {
                throw new Error("User not found");
            }

            const existingRelationship = relationshipSnap.exists ? relationshipSnap.data() as Record<string, unknown> : {};
            const userData = userSnap.data() as Record<string, unknown>;
            const nextFollowing = action === "follow"
                ? true
                : action === "unfollow"
                    ? false
                    : existingRelationship.following === true;

            const nextNotificationsEnabled = action === "enable_notifications"
                ? true
                : action === "disable_notifications"
                    ? false
                    : existingRelationship.notificationsEnabled === true;

            transaction.set(relationshipRef, buildRelationshipPatch({
                userId: caller.uid,
                creatorId,
                creatorDisplayName: creator.displayName,
                creatorUsername: creator.username,
                creatorPhotoURL: creator.photoURL,
                following: nextFollowing,

                notificationsEnabled: nextNotificationsEnabled,
                existing: existingRelationship,
            }), { merge: true });

            const currentFollowing = Array.isArray(userData.following)
                ? userData.following.filter((entry): entry is string => typeof entry === "string")
                : [];
            const nextNotificationPrefs = userData.creatorNotificationPreferences && typeof userData.creatorNotificationPreferences === "object"
                ? { ...(userData.creatorNotificationPreferences as Record<string, unknown>) }
                : {};

            if (action === "follow") {
                transaction.update(userRef, { following: FieldValue.arrayUnion(creatorId) });
            } else if (action === "unfollow" && currentFollowing.includes(creatorId)) {
                transaction.update(userRef, { following: FieldValue.arrayRemove(creatorId) });
            }

            if (action === "enable_notifications" || action === "disable_notifications") {
                nextNotificationPrefs[creatorId] = action === "enable_notifications";
                transaction.update(userRef, {
                    creatorNotificationPreferences: nextNotificationPrefs,
                });
            }

            const opsPatch: Record<string, unknown> = {};
            if (existingRelationship.following !== true && nextFollowing) {
                opsPatch.followerCount = FieldValue.increment(1);
            } else if (existingRelationship.following === true && !nextFollowing) {
                opsPatch.followerCount = FieldValue.increment(-1);
            }

            if (existingRelationship.notificationsEnabled !== true && nextNotificationsEnabled) {
                opsPatch.alertOptIns = FieldValue.increment(1);
            } else if (existingRelationship.notificationsEnabled === true && !nextNotificationsEnabled) {
                opsPatch.alertOptIns = FieldValue.increment(-1);
            }

            if (Object.keys(opsPatch).length > 0) {
                transaction.set(creatorOpsRef, { summary: opsPatch }, { merge: true });
            }

            return {
                following: nextFollowing,

                notificationsEnabled: nextNotificationsEnabled,
            };
        });

        const telemetryEventName = action === "follow"
            ? "creator_followed"
            : action === "unfollow"
                ? "creator_unfollowed"

                        : action === "enable_notifications"
                            ? "creator_notifications_enabled"
                            : "creator_notifications_disabled";

        await trackServerEvent(telemetryEventName, {
            creator_id: creatorId,
            target_creator_id: creatorId,
            creator_username: creator.username,
            creator_display_name: creator.displayName,
            transaction_id: `${caller.uid}:${creatorId}:${action}`,
        }, caller.uid).catch(() => null);

        const followerCount = await countActiveCreatorFollowers(creatorId).catch(() => null);
        if (action === "follow" || action === "unfollow") {
            await trackCreatorRelationshipRouteEvent({
                eventName: action === "follow" ? "creator_follow_succeeded" : "creator_unfollow_succeeded",
                callerUid: caller.uid,
                creatorId,
                relationshipState: result.following ? "following" : "not_following",
                followerCount,
                action,
            });
        }

        return finalize(NextResponse.json({
            success: true,
            relationship: {
                creatorId,
                ...result,
                followerCount,
                relationshipState: result.following ? "following" : "not_following",
                debugLane: CREATOR_RELATIONSHIP_DEBUG_LANE,
                debugReason: "relationship mutation completed through creator relationship route",
            },
        }));
    } catch (error) {
        if ((parsedAction === "follow" || parsedAction === "unfollow") && parsedCreatorId) {
            void trackCreatorRelationshipRouteEvent({
                eventName: "creator_follow_failed",
                callerUid,
                creatorId: parsedCreatorId,
                relationshipState: "unknown",
                action: parsedAction,
                failureReason: isBoundedJsonBodyError(error) ? error.code : "creator_relationship_mutation_failed",
            });
        }
        if (isBoundedJsonBodyError(error)) {
            return finalize(NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
            }, { status: error.status }), error);
        }
        return finalize(handleApiError(error, "Creator.Relationships.POST"), error);
    }
}
