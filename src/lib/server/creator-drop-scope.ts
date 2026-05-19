export type CreatorDashboardDropCountScope = "creator_owned_or_assigned";

type DropScopeRecord = Record<string, unknown>;

function readString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function readStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => readString(entry))
        .filter((entry) => entry.length > 0);
}

function fieldMatchesCreator(drop: DropScopeRecord, creatorId: string) {
    const stringFields = [
        drop.creatorId,
        drop.submittedByCreatorId,
        drop.ownerCreatorId,
        drop.assignedCreatorId,
        drop.primaryCreatorId,
    ];
    if (stringFields.some((value) => readString(value) === creatorId)) {
        return true;
    }

    const arrayFields = [
        drop.assignedCreatorIds,
        drop.assignedCreators,
        drop.creatorIds,
        drop.eligibleCreatorIds,
    ];

    return arrayFields.some((value) => readStringArray(value).includes(creatorId));
}

function isAllCreatorDrop(drop: DropScopeRecord) {
    return drop.allCreators === true
        || drop.availableToAllCreators === true
        || drop.globalCreatorDrop === true
        || readString(drop.visibilityScope) === "all_creators"
        || readString(drop.creatorScope) === "all_creators";
}

function isPubliclyUnavailable(drop: DropScopeRecord, now: number) {
    const status = readString(drop.status);
    const approvalStatus = readString(drop.approvalStatus);
    const visibility = readString(drop.visibility);
    const visibilityScope = readString(drop.visibilityScope);
    const validFrom = typeof drop.validFrom === "number" ? drop.validFrom : null;
    const validUntil = typeof drop.validUntil === "number" ? drop.validUntil : null;

    return approvalStatus === "pending_review"
        || approvalStatus === "rejected"
        || status !== "active"
        || drop.archived === true
        || drop.isArchived === true
        || drop.unlisted === true
        || drop.isUnlisted === true
        || visibility === "private"
        || visibility === "unavailable"
        || visibilityScope === "private"
        || (validFrom !== null && validFrom > now)
        || (validUntil !== null && validUntil <= now);
}

export function getCreatorDashboardDropCountScope(): CreatorDashboardDropCountScope {
    return "creator_owned_or_assigned";
}

export function isDropOwnedOrAssignedToCreator(drop: DropScopeRecord, creatorId: string) {
    const normalizedCreatorId = readString(creatorId);
    if (!normalizedCreatorId) {
        return false;
    }

    if (fieldMatchesCreator(drop, normalizedCreatorId)) {
        return true;
    }

    return false;
}

export function shouldCountDropForCreatorDashboard(drop: DropScopeRecord, creatorId: string) {
    if (!isDropOwnedOrAssignedToCreator(drop, creatorId)) {
        return false;
    }

    if (isAllCreatorDrop(drop) && !fieldMatchesCreator(drop, creatorId)) {
        return false;
    }

    return true;
}

export function shouldShowDropInPublicDiscovery(drop: DropScopeRecord, viewerContext: { now?: number } = {}) {
    const now = viewerContext.now ?? Date.now();
    return !isPubliclyUnavailable(drop, now);
}
