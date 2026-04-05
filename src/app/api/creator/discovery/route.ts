import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/auth";
import { RELAXED } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { adminDb } from "@/lib/server/firebase-admin";
import { isCreatorRole } from "@/lib/creator-experiences";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";

type DiscoverySurface = "dashboard" | "drops" | "experiences";
type DiscoveryCreatorRecord = Record<string, unknown> & {
    uid: string;
    role?: unknown;
    status?: unknown;
    displayName?: unknown;
    username?: unknown;
    photoURL?: unknown;
    bio?: unknown;
    isVerified?: unknown;
};

export async function GET(request: NextRequest) {
    try {
        await guardApiRequest(request, {
            routeName: "creator/discovery",
            rateLimit: RELAXED,
        });

        if (!adminDb) {
            return NextResponse.json({ creators: [] });
        }

        const surface = (request.nextUrl.searchParams.get("surface")?.trim() || "drops") as DiscoverySurface;
        const now = Date.now();
        const [usersSnap, dropsSnap, relationshipsSnap] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("drops").get(),
            adminDb.collection("creator_relationships").get(),
        ]);

        const relationshipCounts = new Map<string, { followers: number; notifications: number }>();
        relationshipsSnap.docs.forEach((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const creatorId = typeof data.creatorId === "string" ? data.creatorId : "";
            if (!creatorId) {
                return;
            }

            const current = relationshipCounts.get(creatorId) ?? { followers: 0, notifications: 0 };
            if (data.following === true) {
                current.followers += 1;
            }
            if (data.notificationsEnabled === true) {
                current.notifications += 1;
            }
            relationshipCounts.set(creatorId, current);
        });

        const activeDropCounts = new Map<string, number>();
        dropsSnap.docs.forEach((doc) => {
            const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
            if (!normalized || isDropHiddenFromPublic(normalized) || !normalized.creatorId || normalized.status !== "active") {
                return;
            }

            activeDropCounts.set(normalized.creatorId, (activeDropCounts.get(normalized.creatorId) ?? 0) + 1);
        });

        const creators = usersSnap.docs
            .map((doc) => ({ uid: doc.id, ...(doc.data() as Record<string, unknown>) }) as DiscoveryCreatorRecord)
            .filter((entry) => isCreatorRole(entry.role) && entry.status !== "suspended" && entry.status !== "banned")
            .map((entry) => {
                const counts = relationshipCounts.get(entry.uid) ?? { followers: 0, notifications: 0 };
                return {
                    uid: entry.uid,
                    displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : "Creator",
                    username: typeof entry.username === "string" ? entry.username : "",
                    photoURL: typeof entry.photoURL === "string" ? entry.photoURL : null,
                    bio: typeof entry.bio === "string" ? entry.bio : "",
                    isVerified: entry.isVerified === true,
                    activeDropCount: activeDropCounts.get(entry.uid) ?? 0,
                    followerCount: counts.followers,
                    notificationsEnabledCount: counts.notifications,
                };
            })
            .sort((left, right) => {
                const leftScore = left.followerCount * 3 + left.activeDropCount;
                const rightScore = right.followerCount * 3 + right.activeDropCount;
                return rightScore - leftScore || left.displayName.localeCompare(right.displayName);
            })
            .slice(0, surface === "dashboard" ? 8 : 12);

        return NextResponse.json({
            success: true,
            creators,
        });
    } catch (error) {
        return handleApiError(error, "Creator.Discovery.GET");
    }
}
