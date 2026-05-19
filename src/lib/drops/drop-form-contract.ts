export const ADMIN_DROP_FORM_FIELDS = [
    "title",
    "description",
    "imageUrl",
    "contentUrl",
    "contentUrls",
    "unlockCost",
    "validFrom",
    "validUntil",
    "autoQueueOnExpire",
    "status",
    "type",
    "tags",
    "ctaText",
    "actionUrl",
    "accentColor",
    "fileMetadata",
    "mediaCounts",
    "creatorId",
    "coverFileName",
    "contentFileNames",
    "approvalStatus",
    "approvalReviewedAt",
    "approvalReviewedBy",
    "approvalNote",
    "submittedByCreatorId",
    "submittedByUserId",
    "reviewStatus",
    "reviewedByAdminId",
    "reviewedAt",
    "reviewNote",
    "createdByRole",
    "sourceTruth",
    "publicDiscovery",
    "rotationEligibility",
    "requiresActiveSubscription",
] as const;

export const CREATOR_DROP_SUBMISSION_FIELDS = [
    "title",
    "description",
    "imageUrl",
    "contentUrl",
    "contentUrls",
    "unlockCost",
    "validFrom",
    "validUntil",
    "autoQueueOnExpire",
    "type",
    "tags",
    "ctaText",
    "actionUrl",
    "accentColor",
    "fileMetadata",
    "mediaCounts",
    "coverFileName",
    "contentFileNames",
    "requiresActiveSubscription",
] as const;

export const CREATOR_DROP_REQUIRED_FIELDS = [
    "title",
    "description",
    "imageUrl",
    "unlockCost",
    "validFrom",
    "type",
] as const;

export const CREATOR_DROP_ADMIN_ONLY_FIELDS = [
    "creatorId",
    "submittedByCreatorId",
    "submittedByUserId",
    "approvalStatus",
    "approvalReviewedAt",
    "approvalReviewedBy",
    "approvalNote",
    "reviewStatus",
    "reviewedByAdminId",
    "reviewedAt",
    "reviewNote",
    "createdByRole",
    "sourceTruth",
    "status",
    "publicDiscovery",
    "rotationEligibility",
    "published",
    "approved",
    "live",
] as const;

export type AdminDropFormField = typeof ADMIN_DROP_FORM_FIELDS[number];
export type CreatorDropSubmissionField = typeof CREATOR_DROP_SUBMISSION_FIELDS[number];
export type CreatorDropAdminOnlyField = typeof CREATOR_DROP_ADMIN_ONLY_FIELDS[number];

const CREATOR_FIELD_SET = new Set<string>(CREATOR_DROP_SUBMISSION_FIELDS);
const ADMIN_ONLY_FIELD_SET = new Set<string>(CREATOR_DROP_ADMIN_ONLY_FIELDS);

export function getAdminDropFormFields() {
    return [...ADMIN_DROP_FORM_FIELDS];
}

export function getCreatorDropSubmissionFields() {
    return [...CREATOR_DROP_SUBMISSION_FIELDS];
}

export function isCreatorAllowedDropField(field: string) {
    return CREATOR_FIELD_SET.has(field);
}

export function stripAdminOnlyDropFields(input: Record<string, unknown>) {
    const stripped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
        if (!ADMIN_ONLY_FIELD_SET.has(key)) {
            stripped[key] = value;
        }
    }
    return stripped;
}
