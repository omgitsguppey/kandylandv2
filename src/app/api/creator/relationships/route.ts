import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { CREATOR_COLLECTIONS, buildCreatorRelationshipId, isCreatorRole } from "@/lib/creator-experiences";
import { buildRelationshipPatch } from "@/lib/server/creator-experiences";
import { handleApiError } from "@/lib/server/auth";
import { STANDARD } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/server/firebase-admin";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";

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
};

type CreatorListEntry = {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    bio: string;
    isVerified: boolean;
    followerCount: number;
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
    if (!isCreatorRole(data.role) || data.status === "suspended" || data.status === "banned") {
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

    const snapshot = await adminDb.collection(CREATOR_COLLECTIONS.relationships)
        .where("creatorId", "==", creatorId)
        .where("following", "==", true)
        .count()
        .get();

    return Number(snapshot.data().count) || 0;
}

export async function GET(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/relationships",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const creatorId = request.nextUrl.searchParams.get("creatorId")?.trim() || "";
        const relationshipsSnap = await adminDb
            .collection(CREATOR_COLLECTIONS.relationships)
            .where("userId", "==", caller.uid)
            .get();

        const rawRelationships = relationshipsSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Record<string, unknown>),
        }) as CreatorRelationshipRecord);

        const [creatorOpsSnap, recommendedCreatorDocs] = await Promise.all([
            adminDb.collection("creator_ops").get(),
            adminDb.collection("users")
                .where("role", "==", "creator")
                .where("status", "not-in", ["suspended", "banned"])
                .select("role", "status", "displayName", "username", "photoURL", "bio", "isVerified")
                .get(),
        ]);
        const creatorFollowerCounts = new Map(
            creatorOpsSnap.docs.map((doc) => {
                const summary = doc.data()?.summary as Record<string, unknown> | undefined;
                return [doc.id, typeof summary?.followerCount === "number" ? summary.followerCount : 0] as const;
            }),
        );

        const validCreators: CreatorListEntry[] = [];
        for (const doc of recommendedCreatorDocs.docs) {
            const entry = { id: doc.id, ...(doc.data() as Record<string, unknown>) } as RecommendedCreatorRecord;
            const followerCount = creatorFollowerCounts.get(entry.id) ?? 0;
            if (isCreatorRole(entry.role) && entry.status !== "suspended" && entry.status !== "banned") {
                validCreators.push({
                    uid: entry.id,
                    displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : "Creator",
                    username: typeof entry.username === "string" ? entry.username : "",
                    photoURL: typeof entry.photoURL === "string" ? entry.photoURL : null,
                    bio: typeof entry.bio === "string" ? entry.bio : "",
                    isVerified: entry.isVerified === true,
                    followerCount,
                });
            }
        }
        const validCreatorsById = new Map(validCreators.map((entry) => [entry.uid, entry]));
        const validCreatorIds = new Set(validCreators.map((entry) => entry.uid));
        const relationships = rawRelationships.filter((entry) => typeof entry.creatorId === "string" && validCreatorIds.has(entry.creatorId));

        if (creatorId) {
            const relationship = relationships.find((entry) => entry.creatorId === creatorId) || null;
            const subscriptionSnap = await adminDb.collection(CREATOR_COLLECTIONS.subscriptions).doc(buildSubscriptionId(caller.uid, creatorId)).get();

            return NextResponse.json({
                success: true,
                relationship,
                subscription: subscriptionSnap.exists ? { id: subscriptionSnap.id, ...(subscriptionSnap.data() as Record<string, unknown>) } : null,
            });
        }

        const followedCreatorIds = relationships
            .filter((entry) => entry.following === true && typeof entry.creatorId === "string")
            .map((entry) => String(entry.creatorId));
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
                followerCount: entry.followerCount,
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
                followerCount: entry.followerCount,
            }));

        return NextResponse.json({
            success: true,
            relationships,
            followedCreators,
            recommendedCreators,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Relationships.GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "creator/relationships",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller || !adminDb) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { creatorId, action } = relationshipActionSchema.parse(await request.json());
        if (creatorId === caller.uid) {
            return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
        }

        const creator = await getCreatorRecord(creatorId);
        if (!creator) {
            return NextResponse.json({ error: "Creator not found" }, { status: 404 });
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
            creator_username: creator.username,
            creator_display_name: creator.displayName,
            transaction_id: `${caller.uid}:${creatorId}:${action}`,
        }, caller.uid).catch(() => null);

        const followerCount = await countActiveCreatorFollowers(creatorId).catch(() => null);

        return NextResponse.json({
            success: true,
            relationship: {
                creatorId,
                ...result,
                followerCount,
            },
        });
    } catch (error) {
        return handleApiError(error, "Creator.Relationships.POST");
    }
}
