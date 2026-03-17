import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { FieldValue } from "firebase-admin/firestore";
import { STANDARD } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";

const followRequestSchema = z.object({
    targetUserId: z.string().trim().min(1).max(128),
    action: z.enum(["follow", "unfollow"]),
});

export async function POST(request: NextRequest) {
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
        const [targetSnap, creatorDropsSnapshot] = await Promise.all([
            targetRef.get(),
            adminDb.collection("drops").where("creatorId", "==", targetUserId).limit(1).get(),
        ]);

        if (!targetSnap.exists) {
            return NextResponse.json({ error: "Creator not found" }, { status: 404 });
        }

        const targetData = targetSnap.data() ?? {};
        const targetRole = typeof targetData.role === "string" ? targetData.role : "";
        const hasCreatorContent = !creatorDropsSnapshot.empty;
        if (targetRole !== "creator" && targetRole !== "admin" && !hasCreatorContent) {
            return NextResponse.json({ error: "Target user is not a creator" }, { status: 400 });
        }
        if (targetData.status === "banned" || targetData.status === "suspended") {
            return NextResponse.json({ error: "Creator is unavailable" }, { status: 409 });
        }

        if (action === "follow") {
            await userRef.update({ following: FieldValue.arrayUnion(targetUserId) });
        } else {
            await userRef.update({ following: FieldValue.arrayRemove(targetUserId) });
        }

        return NextResponse.json({ success: true, action });
    } catch (error) {
        return handleApiError(error, "User.Follow");
    }
}
