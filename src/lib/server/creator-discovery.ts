import "server-only";

import type { CreatorDiscoveryProfile, CreatorDiscoverySurface } from "@/lib/creator-public-pages";
import { isCreatorVisibleInDiscovery } from "@/lib/creator-public-pages";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { adminDb } from "@/lib/server/firebase-admin";

type DiscoveryCreatorRecord = Record<string, unknown> & {
    uid: string;
    role?: unknown;
    status?: unknown;
    displayName?: unknown;
    username?: unknown;
    photoURL?: unknown;
    bio?: unknown;
    isVerified?: unknown;
    creatorApplication?: unknown;
};

export async function listCreatorDiscoveryProfiles(
    surface: CreatorDiscoverySurface,
): Promise<CreatorDiscoveryProfile[]> {
    if (!adminDb) {
        return [];
    }

    const now = Date.now();
    const usersCollection = adminDb.collection("users");
    const dropsCollection = adminDb.collection("drops");
    const relationshipsCollection = adminDb.collection("creator_relationships");
    const usersReader = typeof usersCollection.select === "function"
        ? usersCollection.select("role", "status", "displayName", "username", "photoURL", "bio", "isVerified", "creatorApplication")
        : usersCollection;
    const relationshipsReader = typeof relationshipsCollection.select === "function"
        ? relationshipsCollection.select("creatorId", "following", "notificationsEnabled")
        : relationshipsCollection;
    const [usersSnap, dropsSnap, relationshipsSnap] = await Promise.all([
        usersReader.get(),
        dropsCollection.get(),
        relationshipsReader.get(),
    ]);

    const relationshipCounts = new Map<string, { followers: number; notifications: number }>();
    for (const doc of relationshipsSnap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const creatorId = typeof data.creatorId === "string" ? data.creatorId : "";
        if (!creatorId) {
            continue;
        }

        const current = relationshipCounts.get(creatorId) ?? { followers: 0, notifications: 0 };
        if (data.following === true) {
            current.followers += 1;
        }
        if (data.notificationsEnabled === true) {
            current.notifications += 1;
        }
        relationshipCounts.set(creatorId, current);
    }

    const activeDropCounts = new Map<string, number>();
    for (const doc of dropsSnap.docs) {
        const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
        if (!normalized || isDropHiddenFromPublic(normalized) || !normalized.creatorId || normalized.status !== "active") {
            continue;
        }

        activeDropCounts.set(normalized.creatorId, (activeDropCounts.get(normalized.creatorId) ?? 0) + 1);
    }

    const creators = usersSnap.docs
        .map((doc) => ({ uid: doc.id, ...(doc.data() as Record<string, unknown>) }) as DiscoveryCreatorRecord)
        .filter((entry) => isCreatorVisibleInDiscovery({
            role: entry.role,
            status: entry.status,
            creatorApplication: entry.creatorApplication,
            activeDropCount: activeDropCounts.get(entry.uid) ?? 0,
        }))
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
            } satisfies CreatorDiscoveryProfile;
        })
        .sort((left, right) => {
            const leftScore = left.followerCount * 3 + left.activeDropCount;
            const rightScore = right.followerCount * 3 + right.activeDropCount;
            return rightScore - leftScore || left.displayName.localeCompare(right.displayName);
        });

    return creators.slice(0, surface === "dashboard" ? 8 : 12);
}
