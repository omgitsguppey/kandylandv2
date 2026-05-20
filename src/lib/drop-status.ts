import type { Drop } from "@/types/db";

export type { DropTiming } from "../../shared/runtime/drop-status";
export { getFiniteDropTimestamp, isDropActiveNow, resolveDropStatusFromTiming } from "../../shared/runtime/drop-status";
import { getFiniteDropTimestamp, resolveDropStatusFromTiming } from "../../shared/runtime/drop-status";

export type DropLifecycleAudience = "creator" | "public" | "admin";

export type DropLifecycleStatus =
    | "draft"
    | "pending"
    | "approved"
    | "live"
    | "expired"
    | "rejected"
    | "needs_changes"
    | "unavailable";

export type DropLifecycleInput = {
    status?: unknown;
    reviewStatus?: unknown;
    approvalStatus?: unknown;
    publicDiscovery?: unknown;
    rotationEligibility?: unknown;
    visibility?: unknown;
    validFrom?: unknown;
    validUntil?: unknown;
};

export type DropLifecycleResolution = {
    status: DropLifecycleStatus;
    audience: DropLifecycleAudience;
    publicVisible: boolean;
    creatorVisible: boolean;
    reason: string;
};

function normalizeString(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function reviewStatusFor(drop: DropLifecycleInput) {
    return normalizeString(drop.reviewStatus ?? drop.approvalStatus);
}

function isExpired(drop: DropLifecycleInput, now: number) {
    const validUntil = getFiniteDropTimestamp(drop.validUntil);
    return validUntil !== null && now >= validUntil;
}

function isFutureScheduled(drop: DropLifecycleInput, now: number) {
    const validFrom = getFiniteDropTimestamp(drop.validFrom);
    return validFrom !== null && now < validFrom;
}

function publicGateOpen(drop: DropLifecycleInput) {
    return drop.publicDiscovery !== false
        && drop.rotationEligibility !== false
        && !["private", "unlisted", "archived"].includes(normalizeString(drop.visibility));
}

export function applyDropStatus<T extends Drop>(drop: T, now = Date.now()): T {
    const status = resolveDropStatusFromTiming(drop, now);
    if (drop.status === status) {
        return drop;
    }

    return {
        ...drop,
        status,
    };
}

export function resolveDropLifecycleStatus(
    drop: DropLifecycleInput,
    options: { audience: DropLifecycleAudience; now?: number },
): DropLifecycleResolution {
    const now = options.now ?? Date.now();
    const audience = options.audience;
    const reviewStatus = reviewStatusFor(drop);
    const rawStatus = normalizeString(drop.status);
    const expired = isExpired(drop, now);
    const scheduled = isFutureScheduled(drop, now) || rawStatus === "scheduled";
    const publicOpen = publicGateOpen(drop);

    if (rawStatus === "draft") {
        return {
            status: audience === "public" ? "unavailable" : "draft",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "draft_not_public",
        };
    }

    if (reviewStatus === "rejected") {
        return {
            status: audience === "public" ? "unavailable" : "rejected",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "admin_review_rejected",
        };
    }

    if (reviewStatus === "needs_changes") {
        return {
            status: audience === "public" ? "unavailable" : "needs_changes",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "admin_review_needs_changes",
        };
    }

    if (reviewStatus === "pending_admin_approval" || reviewStatus === "pending_review" || reviewStatus === "pending") {
        return {
            status: audience === "public" ? "unavailable" : "pending",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "pending_admin_approval",
        };
    }

    if (expired || rawStatus === "expired") {
        return {
            status: "expired",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "drop_expired",
        };
    }

    if (scheduled) {
        return {
            status: audience === "public" ? "unavailable" : "approved",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "drop_scheduled",
        };
    }

    const approved = reviewStatus === "approved" || rawStatus === "active" || rawStatus === "live";
    if (approved && publicOpen) {
        return {
            status: audience === "public" ? "live" : "approved",
            audience,
            publicVisible: true,
            creatorVisible: true,
            reason: "approved_public_visibility_open",
        };
    }

    if (approved) {
        return {
            status: audience === "public" ? "unavailable" : "approved",
            audience,
            publicVisible: false,
            creatorVisible: true,
            reason: "approved_but_public_visibility_closed",
        };
    }

    return {
        status: "unavailable",
        audience,
        publicVisible: false,
        creatorVisible: audience !== "public",
        reason: "status_unavailable",
    };
}
