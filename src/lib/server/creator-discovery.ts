import "server-only";

import type { CreatorDiscoveryProfile, CreatorDiscoverySurface } from "@/lib/creator-public-pages";
import { isCreatorVisibleInDiscovery } from "@/lib/creator-public-pages";
import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { mapWithConcurrency } from "@/lib/server/bounded-concurrency";
import { adminDb } from "@/lib/server/firebase-admin";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

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

const CREATOR_DISCOVERY_RELATIONSHIP_COUNT_LIMIT = 36;
const CREATOR_DISCOVERY_RELATIONSHIP_COUNT_CONCURRENCY = 6;

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
    const [usersSnap, dropsSnap] = await Promise.all([
        usersReader.get(),
        dropsCollection.get(),
    ]);

    const activeDropCounts = new Map<string, number>();
    for (const doc of dropsSnap.docs) {
        const normalized = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now);
        if (!normalized || isDropHiddenFromPublic(normalized) || !normalized.creatorId || normalized.status !== "active") {
            continue;
        }

        activeDropCounts.set(normalized.creatorId, (activeDropCounts.get(normalized.creatorId) ?? 0) + 1);
    }

    const eligibleDocs = usersSnap.docs
        .map((doc) => ({ uid: doc.id, ...(doc.data() as Record<string, unknown>) }) as DiscoveryCreatorRecord)
        .filter((entry) => isCreatorVisibleInDiscovery({
            role: entry.role,
            status: entry.status,
            creatorApplication: entry.creatorApplication,
            activeDropCount: activeDropCounts.get(entry.uid) ?? 0,
        }));

    const relationshipCandidates = eligibleDocs
        .sort((left, right) => {
            const leftActiveDrops = activeDropCounts.get(left.uid) ?? 0;
            const rightActiveDrops = activeDropCounts.get(right.uid) ?? 0;
            return rightActiveDrops - leftActiveDrops
                || String(left.displayName ?? "").localeCompare(String(right.displayName ?? ""));
        })
        .slice(0, CREATOR_DISCOVERY_RELATIONSHIP_COUNT_LIMIT);

    if (eligibleDocs.length > relationshipCandidates.length) {
        recordRouteWarning("creator-discovery", "Creator discovery relationship counts were candidate-limited", {
            surface,
            eligibleCreators: eligibleDocs.length,
            countedCreators: relationshipCandidates.length,
        });
    }

    const relationshipCounts = new Map<string, { followers: number; notifications: number }>();
    await mapWithConcurrency(relationshipCandidates, CREATOR_DISCOVERY_RELATIONSHIP_COUNT_CONCURRENCY, async (entry) => {
        const query = relationshipsCollection
            .where("creatorId", "==", entry.uid)
            .where("following", "==", true);
            
        let followers = 0;
        if (typeof query.count === "function") {
            const snapshot = await query.count().get();
            followers = Number(snapshot.data().count) || 0;
        } else {
            const snapshot = await query.get();
            followers = snapshot.size || snapshot.docs.length || 0;
        }
        
        relationshipCounts.set(entry.uid, { followers, notifications: 0 });
    });

    const creators = relationshipCandidates
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
