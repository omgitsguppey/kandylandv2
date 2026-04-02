import { applyDropStatus, isDropActiveNow } from "@/lib/drop-status";
import type { Drop } from "@/types/db";

export function mergeResolvedDropsById(primaryDrops: Drop[], secondaryDrops: Drop[], now: number) {
    const mergedDrops = new Map<string, Drop>();

    primaryDrops.forEach((drop) => {
        mergedDrops.set(drop.id, applyDropStatus(drop, now));
    });

    secondaryDrops.forEach((drop) => {
        mergedDrops.set(drop.id, applyDropStatus(drop, now));
    });

    return Array.from(mergedDrops.values()).sort((left, right) => right.validFrom - left.validFrom);
}

export function buildDashboardCollectionState(drops: Drop[], ownedIds: Set<string>, now?: number) {
    const visibleDrops: Drop[] = [];
    const ownedDrops: Drop[] = [];
    const lockedDrops: Drop[] = [];
    let ownedCount = 0;

    for (const drop of drops) {
        const isOwned = ownedIds.has(drop.id);
        if (!isOwned && !isDropActiveNow(drop, now)) {
            continue;
        }

        const resolvedDrop = applyDropStatus(drop, now);
        visibleDrops.push(resolvedDrop);

        if (isOwned) {
            ownedDrops.push(resolvedDrop);
            ownedCount += 1;
        } else {
            lockedDrops.push(resolvedDrop);
        }
    }

    return {
        visibleDrops,
        ownedDrops,
        lockedDrops,
        ownedCount,
        lockedCount: visibleDrops.length - ownedCount,
    };
}
