import { formatAdminCompactDateTime } from "@/lib/admin-drop-formatting";
import { resolveDropStatusFromTiming } from "@/lib/drop-status";
import type { DropQueueLifecycleProjection } from "@/lib/drop-queue-lifecycle";
import type { Drop } from "@/types/db";

export type AdminDropLifecycleKind =
    | "pending_review"
    | "rejected"
    | "live"
    | "queued"
    | "scheduled"
    | "cooldown"
    | "ended";

export type AdminDropLifecycleFacts = {
    kind: AdminDropLifecycleKind;
    liveStatus: Drop["status"];
    isQueueManaged: boolean;
    queueStatus: DropQueueLifecycleProjection["queueStatus"] | null;
    queueSlotMs: number | null;
    queueSlotLabel: string | null;
    cooldownEndsAt: number | null;
};

export function resolveAdminDropLifecycleFacts(
    drop: Drop,
    input: {
        now: number;
        isQueueManaged: boolean;
        queueLifecycle?: DropQueueLifecycleProjection;
    },
): AdminDropLifecycleFacts {
    const liveStatus = resolveDropStatusFromTiming(drop, input.now);
    const queueStatus = input.queueLifecycle?.queueStatus ?? null;
    const queueSlotMs = input.queueLifecycle?.queueSlotMs ?? null;
    const cooldownEndsAt = input.queueLifecycle?.cooldownEndsAt ?? null;
    const queueSlotLabel = queueSlotMs ? formatAdminCompactDateTime(queueSlotMs) : null;

    let kind: AdminDropLifecycleKind = "ended";
    if (drop.approvalStatus === "pending_review") {
        kind = "pending_review";
    } else if (drop.approvalStatus === "rejected") {
        kind = "rejected";
    } else if (liveStatus === "active") {
        kind = "live";
    } else if (input.isQueueManaged && queueStatus === "cooldown") {
        kind = "cooldown";
    } else if (input.isQueueManaged && queueSlotLabel && (queueStatus === "queued" || queueStatus === "scheduled")) {
        kind = "queued";
    } else if (liveStatus === "scheduled") {
        kind = "scheduled";
    }

    return {
        kind,
        liveStatus,
        isQueueManaged: input.isQueueManaged,
        queueStatus,
        queueSlotMs,
        queueSlotLabel,
        cooldownEndsAt,
    };
}
