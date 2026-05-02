import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { RELAXED } from "@/lib/server/rate-limit";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { guardApiRequest } from "@/lib/server/request-guard";
import { buildNotFoundResponse } from "@/lib/server/not-found";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { isCreatorRole, normalizeCreatorSettings } from "@/lib/creator-experiences";
import { sanitizeDropForClient } from "@/lib/server/drops";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";

async function GET_handler(
    request: NextRequest,
    context: { params: Promise<{ username: string }> },
) {
    try {
        await guardApiRequest(request, {
            routeName: "creators/profile",
            rateLimit: RELAXED,
        });
        const { username } = await context.params;
        const normalizedUsername = username.trim().toLowerCase();
        const nowMs = Date.now();

        if (!normalizedUsername) {
            return NextResponse.json({ error: "Missing creator username" }, { status: 400 });
        }
        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const creatorSnapshot = await adminDb.collection("users")
            .where("username", "==", normalizedUsername)
            .limit(1)
            .get();

        if (creatorSnapshot.empty) {
            return buildNotFoundResponse("creator", "Creator not found");
        }

        const creatorDoc = creatorSnapshot.docs[0];
        const creatorRaw = creatorDoc.data() as Record<string, unknown>;
        const creatorStatus = creatorRaw.status;
        const isPublicCreator = isCreatorRole(creatorRaw.role);
        const isPublicStatus = creatorStatus === undefined || creatorStatus === "active";

        if (!isPublicCreator || !isPublicStatus) {
            return buildNotFoundResponse("creator", "Creator not found");
        }

        const followersSnapshot = await adminDb.collection("creator_relationships")
            .where("creatorId", "==", creatorDoc.id)
            .where("following", "==", true)
            .count()
            .get();
        const followerCount = followersSnapshot.data().count;

        const creator = {
            uid: creatorDoc.id,
            displayName: typeof creatorRaw.displayName === "string" ? creatorRaw.displayName : "Creator",
            username: typeof creatorRaw.username === "string" ? creatorRaw.username : normalizedUsername,
            photoURL: typeof creatorRaw.photoURL === "string" ? creatorRaw.photoURL : null,
            bannerUrl: typeof creatorRaw.bannerUrl === "string" ? creatorRaw.bannerUrl : undefined,
            bio: typeof creatorRaw.bio === "string" ? creatorRaw.bio : undefined,
            isVerified: creatorRaw.isVerified === true,
            followerCount,
            creatorSettings: normalizeCreatorSettings(creatorRaw.creatorSettings),
        };

        const dropsSnapshot = await adminDb.collection("drops")
            .where("creatorId", "==", creator.uid)
            .get();

        const drops = dropsSnapshot.docs.flatMap((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, nowMs);
            return normalized && normalized.status === "active" && !isDropHiddenFromPublic(normalized)
                ? [sanitizeDropForClient(normalized)]
                : [];
        }).sort((left, right) => right.validFrom - left.validFrom);

        // Intentionally decouple and swallow the view-count increment to prevent blocking or failing the read path.
        const { FieldValue } = await import("firebase-admin/firestore");
        creatorDoc.ref.update({ profileViewsCount: FieldValue.increment(1) }).catch((error) => {
            recordRouteWarning("creators/profile", "Creator profile view count update failed", error, {
                channel: "creator_onboarding",
                detail: {
                    creatorId: creator.uid,
                },
            });
        });

        return NextResponse.json({ success: true, creator, drops });
    } catch (error) {
        return handleApiError(error, "Creators.Profile.GET");
    }
}

export let GET = withRouteRuntimeHealth("creators/[username]:GET", GET_handler);
