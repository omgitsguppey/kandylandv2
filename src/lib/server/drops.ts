import "server-only";
import { adminDb } from "./firebase-admin";
import { Drop } from "@/types/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute the live status of a drop based on current time.
 * If auto-rotation is enabled and the drop has expired, calculate the next rotation.
 * Returns the drop with corrected status (and updated dates if rotated).
 */
function resolveDropStatus(drop: Drop, now: number): { drop: Drop; needsUpdate: boolean } {
    let needsUpdate = false;
    let resolved = { ...drop };

    // Auto-rotation: if enabled and the current window has expired
    const rc = resolved.rotationConfig;
    if (rc?.enabled && resolved.validUntil && now >= resolved.validUntil) {
        // Check if we've hit the max rotation cap
        const atCap = rc.maxRotations !== undefined && rc.rotationCount >= rc.maxRotations;

        if (!atCap) {
            // Calculate the gap between active windows
            const gapDays = rc.intervalDays - rc.durationDays;
            const gapMs = Math.max(0, gapDays) * MS_PER_DAY;
            const durationMs = rc.durationDays * MS_PER_DAY;

            // How many full cycles have we missed since the last validUntil?
            const elapsed = now - resolved.validUntil;
            const cycleMs = rc.intervalDays * MS_PER_DAY;
            const missedCycles = Math.floor(elapsed / cycleMs);

            // Jump forward to the correct cycle
            const newValidFrom = resolved.validUntil + gapMs + (missedCycles * cycleMs);
            const newValidUntil = newValidFrom + durationMs;
            const newRotationCount = rc.rotationCount + 1 + missedCycles;

            // Check cap again after accounting for missed cycles
            const finalCount = rc.maxRotations !== undefined
                ? Math.min(newRotationCount, rc.maxRotations)
                : newRotationCount;

            resolved = {
                ...resolved,
                validFrom: newValidFrom,
                validUntil: newValidUntil,
                rotationConfig: {
                    ...rc,
                    rotationCount: finalCount,
                },
            };
            needsUpdate = true;
        }
    }

    // Compute live status from dates
    if (now < resolved.validFrom) {
        resolved.status = "scheduled";
    } else if (resolved.validUntil && now >= resolved.validUntil) {
        resolved.status = "expired";
    } else {
        resolved.status = "active";
    }

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

        // If rotation happened, also update dates and config
        if (drop.rotationConfig) {
            updateData.validFrom = drop.validFrom;
            updateData.validUntil = drop.validUntil;
            updateData.rotationConfig = drop.rotationConfig;
        }

        await adminDb.collection("drops").doc(dropId).update(updateData);
    } catch (err) {
        console.error(`Auto-heal failed for drop ${dropId}:`, err);
    }
}

export async function getDrops(): Promise<Drop[]> {
    try {
        if (!adminDb) return [];
        const dropsRef = adminDb.collection("drops");
        const snapshot = await dropsRef.orderBy("validFrom", "desc").get();

        if (snapshot.empty) {
            return [];
        }

        const now = Date.now();
        const drops: Drop[] = [];

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const raw: Drop = {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toMillis?.() || data.createdAt,
                validFrom: data.validFrom?.toMillis?.() || data.validFrom,
                validUntil: data.validUntil?.toMillis?.() || data.validUntil,
            } as unknown as Drop;

            const { drop: resolved, needsUpdate } = resolveDropStatus(raw, now);

            // Fire-and-forget: persist any status/rotation updates
            if (needsUpdate) {
                persistDropUpdate(doc.id, resolved);
            }

            drops.push(resolved);
        }

        return drops;
    } catch (error) {
        console.error("Error fetching drops:", error);
        return [];
    }
}



export async function getDrop(id: string): Promise<Drop | null> {
    try {
        if (!adminDb) return null;
        const docRef = adminDb.collection("drops").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return null;
        }

        const data = docSnap.data()!;
        const raw: Drop = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt,
            validFrom: data.validFrom?.toMillis?.() || data.validFrom,
            validUntil: data.validUntil?.toMillis?.() || data.validUntil,
        } as unknown as Drop;

        const now = Date.now();
        const { drop: resolved, needsUpdate } = resolveDropStatus(raw, now);

        if (needsUpdate) {
            persistDropUpdate(docSnap.id, resolved);
        }

        return resolved;
    } catch (error) {
        console.error("Error fetching drop:", error);
        return null;
    }
}


