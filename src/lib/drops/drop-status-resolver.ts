import { getFiniteDropTimestamp } from "@/lib/drop-status";

export type CreatorDropStatusKey =
    | "admin_created"
    | "creator_submitted"
    | "draft"
    | "pending_review"
    | "needs_changes"
    | "approved_live"
    | "rejected"
    | "expired"
    | "archived"
    | "unavailable";

export type DropStatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

export type CreatorDropStatusInput = {
    status?: unknown;
    reviewStatus?: unknown;
    approvalStatus?: unknown;
    publicDiscovery?: unknown;
    rotationEligibility?: unknown;
    validUntil?: unknown;
    expiresAt?: unknown;
    visibility?: unknown;
    createdByRole?: unknown;
    creatorId?: unknown;
    submittedByCreatorId?: unknown;
    assignedCreatorIds?: unknown;
};

export type DropStatusResolution = {
    creatorStatusKey: CreatorDropStatusKey;
    creatorStatusLabel: string;
    adminStatusLabel: string;
    publicVisibilityLabel: string;
    statusTone: DropStatusTone;
    canCreatorEdit: boolean;
    canCreatorResubmit: boolean;
    canCreatorViewMetrics: boolean;
    isExpired: boolean;
    isPublicVisible: boolean;
    isRotationEligible: boolean;
    isAdminCreated: boolean;
    isCreatorSubmitted: boolean;
    sourceTruth: "drop_status_resolver";
};

function normalizeString(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isExpired(input: CreatorDropStatusInput, now: number) {
    const expiresAt = getFiniteDropTimestamp(input.expiresAt ?? input.validUntil);
    return expiresAt !== null && now >= expiresAt;
}

function isArchived(input: CreatorDropStatusInput) {
    const rawStatus = normalizeString(input.status);
    const visibility = normalizeString(input.visibility);
    return rawStatus === "archived" || visibility === "archived" || visibility === "unlisted";
}

function resolveReview(input: CreatorDropStatusInput) {
    return normalizeString(input.reviewStatus) || normalizeString(input.approvalStatus);
}

function isPublicVisible(input: CreatorDropStatusInput, expired: boolean, archived: boolean) {
    const rawStatus = normalizeString(input.status);
    const review = resolveReview(input);
    return !expired
        && !archived
        && (rawStatus === "active" || rawStatus === "live")
        && (review === "approved" || review === "")
        && input.publicDiscovery === true;
}

function visibilityLabel(publicVisible: boolean, rotationEligible: boolean, archived: boolean, expired: boolean) {
    if (archived) return "Archived";
    if (expired) return "Expired";
    if (publicVisible && rotationEligible) return "Public rotation";
    if (publicVisible) return "Public";
    return "Not public";
}

function resolution(input: CreatorDropStatusInput, key: CreatorDropStatusKey, extras: {
    creatorStatusLabel: string;
    adminStatusLabel: string;
    statusTone: DropStatusTone;
    canCreatorEdit?: boolean;
    canCreatorResubmit?: boolean;
    now: number;
}): DropStatusResolution {
    const expired = isExpired(input, extras.now);
    const archived = isArchived(input);
    const rotationEligible = input.rotationEligibility === true;
    const publicVisible = isPublicVisible(input, expired, archived);
    const createdByRole = normalizeString(input.createdByRole);
    const isCreatorSubmitted = createdByRole === "creator" || normalizeString(input.submittedByCreatorId).length > 0;
    const isAdminCreated = createdByRole === "admin" && !isCreatorSubmitted;

    return {
        creatorStatusKey: key,
        creatorStatusLabel: extras.creatorStatusLabel,
        adminStatusLabel: extras.adminStatusLabel,
        publicVisibilityLabel: visibilityLabel(publicVisible, rotationEligible, archived, expired),
        statusTone: extras.statusTone,
        canCreatorEdit: extras.canCreatorEdit ?? false,
        canCreatorResubmit: extras.canCreatorResubmit ?? false,
        canCreatorViewMetrics: true,
        isExpired: expired,
        isPublicVisible: publicVisible,
        isRotationEligible: rotationEligible,
        isAdminCreated,
        isCreatorSubmitted,
        sourceTruth: "drop_status_resolver",
    };
}

export function resolveDropStatus(input: CreatorDropStatusInput, options: { now?: number } = {}): DropStatusResolution {
    const now = options.now ?? Date.now();
    const review = resolveReview(input);
    const rawStatus = normalizeString(input.status);
    const expired = isExpired(input, now);
    const archived = isArchived(input);
    const createdByRole = normalizeString(input.createdByRole);
    const creatorSubmitted = createdByRole === "creator" || normalizeString(input.submittedByCreatorId).length > 0;
    const publicVisible = isPublicVisible(input, expired, archived);

    if (archived) {
        return resolution(input, "archived", {
            creatorStatusLabel: "Archived",
            adminStatusLabel: "Archived",
            statusTone: "muted",
            now,
        });
    }

    if (expired || rawStatus === "expired") {
        return resolution(input, "expired", {
            creatorStatusLabel: "Expired",
            adminStatusLabel: "Expired",
            statusTone: "muted",
            now,
        });
    }

    if (rawStatus === "draft") {
        return resolution(input, "draft", {
            creatorStatusLabel: "Draft",
            adminStatusLabel: "Draft",
            statusTone: "neutral",
            canCreatorEdit: true,
            canCreatorResubmit: true,
            now,
        });
    }

    if (review === "needs_changes") {
        return resolution(input, "needs_changes", {
            creatorStatusLabel: "Needs changes",
            adminStatusLabel: "Needs changes",
            statusTone: "warning",
            canCreatorEdit: true,
            canCreatorResubmit: true,
            now,
        });
    }

    if (review === "rejected") {
        return resolution(input, "rejected", {
            creatorStatusLabel: "Rejected",
            adminStatusLabel: "Rejected",
            statusTone: "danger",
            canCreatorEdit: true,
            canCreatorResubmit: true,
            now,
        });
    }

    if (review === "pending_admin_approval" || review === "pending_review" || review === "pending") {
        return resolution(input, "pending_review", {
            creatorStatusLabel: "Pending review",
            adminStatusLabel: "Pending review",
            statusTone: "info",
            now,
        });
    }

    if (publicVisible || review === "approved" || rawStatus === "active" || rawStatus === "live") {
        if (createdByRole === "admin" && !creatorSubmitted) {
            return resolution(input, "admin_created", {
                creatorStatusLabel: "Added by admin",
                adminStatusLabel: publicVisible ? "Live" : "Approved",
                statusTone: publicVisible ? "success" : "info",
                now,
            });
        }

        return resolution(input, "approved_live", {
            creatorStatusLabel: publicVisible ? "Live" : "Approved",
            adminStatusLabel: publicVisible ? "Live" : "Approved",
            statusTone: publicVisible ? "success" : "info",
            now,
        });
    }

    if (creatorSubmitted) {
        return resolution(input, "creator_submitted", {
            creatorStatusLabel: "Submitted",
            adminStatusLabel: "Submitted",
            statusTone: "info",
            now,
        });
    }

    return resolution(input, "unavailable", {
        creatorStatusLabel: "Unavailable",
        adminStatusLabel: "Unavailable",
        statusTone: "muted",
        now,
    });
}
