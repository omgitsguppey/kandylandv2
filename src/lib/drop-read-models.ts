import { applyDropStatus } from "@/lib/drop-status";
import { normalizeDropRecord } from "@/lib/drop-normalizers";
import type { Drop } from "@/types/db";

type DropNormalizationErrorHandler = (error: unknown) => void;

export function normalizeDropRecordOrNull(
    raw: unknown,
    id: string,
    onError?: DropNormalizationErrorHandler,
): Drop | null {
    try {
        return normalizeDropRecord(raw, id);
    } catch (error) {
        onError?.(error);
        return null;
    }
}

export function normalizeDropRecordOrFallback(raw: unknown, id: string): Drop {
    return normalizeDropRecordOrNull(raw, id) ?? ({ id, ...(raw as Record<string, unknown>) } as Drop);
}

export function normalizeAndApplyDropStatusOrNull(
    raw: unknown,
    id: string,
    now: number,
    onError?: DropNormalizationErrorHandler,
): Drop | null {
    const drop = normalizeDropRecordOrNull(raw, id, onError);
    return drop ? applyDropStatus(drop, now) : null;
}

export function isDropHiddenFromPublic(drop: Pick<Drop, "approvalStatus">): boolean {
    return drop.approvalStatus === "pending_review" || drop.approvalStatus === "rejected";
}
