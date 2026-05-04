import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildCreatorRelationshipId, isCreatorRole } from "@/lib/creator-experiences";
import { buildRelationshipPatch } from "@/lib/server/creator-experiences";
import { trackServerEvent } from "@/lib/server/analytics";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import { buildNotFoundResponse } from "@/lib/server/not-found";

const followRequestSchema = z.object({
    targetUserId: z.string().trim().min(1).max(128),
    action: z.enum(["follow", "unfollow"]),
});

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "user/follow",
            rateLimit: STANDARD,
            requireTrustedOrigin: true,
            auth: "user",
            scopeToCaller: true,
        });
        if (!caller) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { targetUserId, action } = followRequestSchema.parse(await request.json());

        // Use verified UID from token
        const userId = caller.uid;

        if (userId === targetUserId) {
            return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const userRef = adminDb.collection("users").doc(userId);
        const targetRef = adminDb.collection("users").doc(targetUserId);
        const targetSnap = await targetRef.get();

        if (!targetSnap.exists) {
            return buildNotFoundResponse("creator", "Creator not found");
        }

        const targetData = targetSnap.data() ?? {};
        const targetRole = typeof targetData.role === "string" ? targetData.role : "";
        if (!isCreatorRole(targetRole)) {
            return NextResponse.json({ error: "Target user is not a creator" }, { status: 400 });
        }
        if (targetData.status === "banned" || targetData.status === "suspended") {
            return NextResponse.json({ error: "Creator is unavailable" }, { status: 409 });
        }

        const relationshipRef = adminDb.collection("creator_relationships").doc(buildCreatorRelationshipId(userId, targetUserId));
        await adminDb.runTransaction(async (transaction) => {
            const relationshipSnap = await transaction.get(relationshipRef);
            const existing = relationshipSnap.exists ? relationshipSnap.data() as Record<string, unknown> : {};
            transaction.set(relationshipRef, buildRelationshipPatch({
                userId,
                creatorId: targetUserId,
                creatorDisplayName: typeof targetData.displayName === "string" ? targetData.displayName : "Creator",
                creatorUsername: typeof targetData.username === "string" ? targetData.username : "",
                creatorPhotoURL: typeof targetData.photoURL === "string" ? targetData.photoURL : null,
                following: action === "follow",
                existing,
            }), { merge: true });
            if (action === "follow") {
                transaction.update(userRef, { following: FieldValue.arrayUnion(targetUserId) });
            } else {
                transaction.update(userRef, { following: FieldValue.arrayRemove(targetUserId) });
            }
        });

        await trackServerEvent(action === "follow" ? "creator_followed" : "creator_unfollowed", {
            creator_id: targetUserId,
            target_creator_id: targetUserId,
            creator_username: typeof targetData.username === "string" ? targetData.username : "",
            creator_display_name: typeof targetData.displayName === "string" ? targetData.displayName : "Creator",
            transaction_id: `${userId}:${targetUserId}:${action}`,
        }, userId).catch(() => null);

        return NextResponse.json({ success: true, action });
    } catch (error) {
        return handleApiError(error, "User.Follow");
    }
}

export let POST = withRouteRuntimeHealth("user/follow:POST", POST_handler);
