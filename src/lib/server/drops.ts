import "server-only";
import { adminDb } from "./firebase-admin";
import { Drop } from "@/types/db";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import { applyDropStatus, resolveDropStatusFromTiming } from "@/lib/drop-status";
import { cache } from "react";
import { sendGlobalDropNotification } from "./push-notifications";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute the live status of a drop based on current time.
 * If auto-rotation is enabled and the drop has expired, calculate the next rotation.
 * Returns the drop with corrected status (and updated dates if rotated).
 */
function resolveDropStatus(drop: Drop, now: number): { drop: Drop; needsUpdate: boolean } {
    let needsUpdate = false;
    let resolved = applyDropStatus(drop, now);

    // Auto-rotation logic has been officially deprecated. Time is linear now.

    // If the stored status doesn't match the computed status, flag for update
    if (drop.status !== resolved.status) {
        needsUpdate = true;
    }

    return { drop: resolved, needsUpdate };
}

/**
 * Persist auto-healed drop status/dates back to Firestore (fire-and-forget).
 */
async function persistDropUpdate(dropId: string, drop: Drop): Promise<void> {
    if (!adminDb) return;
    try {
        const updateData: Record<string, any> = { status: drop.status };

        // Rotation logic officially deprecated. No longer appending timeline modifications.

        await adminDb.collection("drops").doc(dropId).update(updateData);
    } catch (err) {
        console.error(`Auto-heal failed for drop ${dropId}:`, err);
    }
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
            const { drop: resolved, needsUpdate } = resolveDropStatus(raw, now);

            if (needsUpdate) {
                persistDropUpdate(doc.id, resolved);
                if (resolveDropStatusFromTiming(raw, now) === "active" && raw.status === "scheduled") {
                    sendGlobalDropNotification(resolved.title, doc.id, resolved.imageUrl);
                }
            }

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
        const { drop: resolved, needsUpdate } = resolveDropStatus(raw, now);

        if (needsUpdate) {
            persistDropUpdate(docSnap.id, resolved);
            if (resolveDropStatusFromTiming(raw, now) === "active" && raw.status === "scheduled") {
                sendGlobalDropNotification(resolved.title, docSnap.id, resolved.imageUrl);
            }
        }

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
        const { drop: resolved, needsUpdate } = resolveDropStatus(raw, now);

        if (needsUpdate) {
            persistDropUpdate(docSnap.id, resolved);
            if (resolveDropStatusFromTiming(raw, now) === "active" && raw.status === "scheduled") {
                sendGlobalDropNotification(resolved.title, docSnap.id, resolved.imageUrl);
            }
        }

        return resolved;
    } catch (error) {
        console.error("Error fetching raw drop:", error);
        return null;
    }
}
