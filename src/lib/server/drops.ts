import "server-only";
import { adminDb } from "./firebase-admin";
import { Drop } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { applyDropStatus } from "@/lib/drop-status";
import { cache } from "react";

/**
 * Compute the live status of a drop based on current time.
 * These reads stay side-effect free; cron/admin flows own persistence.
 */
function resolveDropStatus(drop: Drop, now: number): Drop {
    return applyDropStatus(drop, now);
}

/**
 * Strip sensitive fields (contentUrl) before sending a Drop to the client.
 * This prevents raw Firebase Storage URLs from appearing in the browser DOM.
 */
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
        return snapshot.docs.map(doc => {
            const raw = normalizeDropRecord(doc.data(), doc.id);
            const resolved = resolveDropStatus(raw, now);

            return sanitizeDropForClient(resolved);
        });
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

        const raw = normalizeDropRecord(docSnap.data(), docSnap.id);
        const now = Date.now();
        const resolved = resolveDropStatus(raw, now);

        return sanitizeDropForClient(resolved);
    } catch (error) {
        console.error("Error fetching drop:", error);
        return null;
    }
});

/**
 * Server-only: fetch a drop WITH contentUrl (for API routes that need it).
 */
export async function getDropRaw(id: string): Promise<Drop | null> {
    try {
        if (!adminDb) return null;
        const docRef = adminDb.collection("drops").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return null;
        }

        const raw = normalizeDropRecord(docSnap.data(), docSnap.id);
        const now = Date.now();
        const resolved = resolveDropStatus(raw, now);

        return resolved;
    } catch (error) {
        console.error("Error fetching raw drop:", error);
        return null;
    }
}
