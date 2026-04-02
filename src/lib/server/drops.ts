import "server-only";

import { cache } from "react";

import { isDropHiddenFromPublic, normalizeAndApplyDropStatusOrNull } from "@/lib/drop-read-models";
import { adminDb } from "@/lib/server/firebase-admin";
import type { Drop } from "@/types/db";

export function sanitizeDropForClient(drop: Drop): Drop {
    const safeContentUrls = Array.isArray(drop.contentUrls)
        ? drop.contentUrls.map(() => "")
        : (drop.contentUrl ? [""] : []);
    const { contentUrl, contentUrls, ...safe } = drop;
    return { ...safe, contentUrl: "", contentUrls: safeContentUrls } as Drop;
}

export const getDrops = cache(async (): Promise<Drop[]> => {
    try {
        if (!adminDb) return [];
        const snapshot = await adminDb.collection("drops").orderBy("validFrom", "desc").get();

        if (snapshot.empty) return [];

        const now = Date.now();
        const drops: Drop[] = [];

        for (const doc of snapshot.docs) {
            const resolved = normalizeAndApplyDropStatusOrNull(doc.data(), doc.id, now, (error) => {
                console.error(`Skipping invalid drop document ${doc.id}`, error);
            });
            if (!resolved) {
                continue;
            }

            if (isDropHiddenFromPublic(resolved)) {
                continue;
            }

            drops.push(sanitizeDropForClient(resolved));
        }

        return drops;
    } catch (error) {
        console.error("Error fetching drops:", error);
        return [];
    }
});

export const getDrop = cache(async (id: string): Promise<Drop | null> => {
    try {
        if (!adminDb) return null;
        const docSnap = await adminDb.collection("drops").doc(id).get();

        if (!docSnap.exists) return null;

        const resolved = normalizeAndApplyDropStatusOrNull(docSnap.data(), docSnap.id, Date.now());
        if (!resolved || isDropHiddenFromPublic(resolved)) {
            return null;
        }

        return sanitizeDropForClient(resolved);
    } catch (error) {
        console.error("Error fetching drop:", error);
        return null;
    }
});

export async function getDropRaw(id: string): Promise<Drop | null> {
    try {
        if (!adminDb) return null;
        const docRef = adminDb.collection("drops").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return null;
        }

        return normalizeAndApplyDropStatusOrNull(docSnap.data(), docSnap.id, Date.now());
    } catch (error) {
        console.error("Error fetching raw drop:", error);
        return null;
    }
}
