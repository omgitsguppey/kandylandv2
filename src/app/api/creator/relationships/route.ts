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
    favorited?: unknown;
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

const relationshipActionSchema = z.object({
    creatorId: z.string().trim().min(1),
    action: z.enum([
        "follow",
        "unfollow",
        "favorite",
        "unfavorite",
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

        const relationships = relationshipsSnap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Record<string, unknown>),
        }) as CreatorRelationshipRecord);

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
        const recommendedCreatorDocs = await adminDb.collection("users").get();
        const recommendedCreators = recommendedCreatorDocs.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as RecommendedCreatorRecord)
            .filter((entry) => isCreatorRole(entry.role) && entry.status !== "suspended" && entry.status !== "banned")
            .filter((entry) => !followedCreatorIds.includes(entry.id))
            .slice(0, 12)
            .map((entry) => ({
                uid: entry.id,
                displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : "Creator",
                username: typeof entry.username === "string" ? entry.username : "",
                photoURL: typeof entry.photoURL === "string" ? entry.photoURL : null,
                bio: typeof entry.bio === "string" ? entry.bio : "",
                isVerified: entry.isVerified === true,
            }));

        return NextResponse.json({
            success: true,
            relationships,
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
            const nextFavorited = action === "favorite"
                ? true
                : action === "unfavorite"
                    ? false
                    : existingRelationship.favorited === true;
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
                favorited: nextFavorited,
                notificationsEnabled: nextNotificationsEnabled,
                existing: existingRelationship,
            }), { merge: true });

            const currentFollowing = Array.isArray(userData.following)
                ? userData.following.filter((entry): entry is string => typeof entry === "string")
                : [];
            const currentFavorites = Array.isArray(userData.favoriteCreators)
                ? userData.favoriteCreators.filter((entry): entry is string => typeof entry === "string")
                : [];
            const nextNotificationPrefs = userData.creatorNotificationPreferences && typeof userData.creatorNotificationPreferences === "object"
                ? { ...(userData.creatorNotificationPreferences as Record<string, unknown>) }
                : {};

            if (action === "follow") {
                transaction.update(userRef, { following: FieldValue.arrayUnion(creatorId) });
            } else if (action === "unfollow" && currentFollowing.includes(creatorId)) {
                transaction.update(userRef, { following: FieldValue.arrayRemove(creatorId) });
            }

            if (action === "favorite") {
                transaction.update(userRef, { favoriteCreators: FieldValue.arrayUnion(creatorId) });
            } else if (action === "unfavorite" && currentFavorites.includes(creatorId)) {
                transaction.update(userRef, { favoriteCreators: FieldValue.arrayRemove(creatorId) });
            }

            if (action === "enable_notifications" || action === "disable_notifications") {
                nextNotificationPrefs[creatorId] = action === "enable_notifications";
                transaction.update(userRef, {
                    creatorNotificationPreferences: nextNotificationPrefs,
                });
            }

            return {
                following: nextFollowing,
                favorited: nextFavorited,
                notificationsEnabled: nextNotificationsEnabled,
            };
        });

        const telemetryEventName = action === "follow"
            ? "creator_followed"
            : action === "unfollow"
                ? "creator_unfollowed"
                : action === "favorite"
                    ? "creator_favorited"
                    : action === "unfavorite"
                        ? "creator_unfavorited"
                        : action === "enable_notifications"
                            ? "creator_notifications_enabled"
                            : "creator_notifications_disabled";

        await trackServerEvent(telemetryEventName, {
            creator_id: creatorId,
            creator_username: creator.username,
            creator_display_name: creator.displayName,
            transaction_id: `${caller.uid}:${creatorId}:${action}`,
        }, caller.uid).catch(() => null);

        return NextResponse.json({
            success: true,
            relationship: {
                creatorId,
                ...result,
            },
        });
    } catch (error) {
        return handleApiError(error, "Creator.Relationships.POST");
    }
}
