import {
    CREATOR_DROP_ADMIN_ONLY_FIELDS,
    CREATOR_DROP_SUBMISSION_FIELDS,
    getAdminDropFormFields,
    stripAdminOnlyDropFields,
} from "@/lib/drops/drop-form-contract";
import { sanitizeDropData } from "@/lib/server/drop-mutations";

const DANGEROUS_CREATOR_FIELD_VALUES: Record<string, readonly unknown[]> = {
    approvalStatus: ["approved", "rejected"],
    reviewStatus: ["approved", "admin_approved", "published", "live"],
    approved: [true, "true", 1],
    published: [true, "true", 1],
    live: [true, "true", 1],
    publicDiscovery: [true, "true", 1],
    rotationEligibility: [true, "true", 1],
};

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function hasDangerousAdminOnlyValue(input: Record<string, unknown>) {
    return Object.entries(DANGEROUS_CREATOR_FIELD_VALUES).find(([field, dangerousValues]) => {
        if (!(field in input)) {
            return false;
        }
        return dangerousValues.includes(input[field]);
    });
}

export function sanitizeAdminDropPayload(input: Record<string, unknown>, _adminId: string) {
    return sanitizeDropData(input, getAdminDropFormFields());
}

export function assertCreatorDropSubmissionSafe(payload: Record<string, unknown>) {
    const dangerousField = hasDangerousAdminOnlyValue(payload);
    if (dangerousField) {
        throw new Error(`Creator drop submission includes admin-only field: ${dangerousField[0]}`);
    }
}

export function sanitizeCreatorDropSubmission(input: Record<string, unknown>, creatorId: string, userId: string) {
    assertCreatorDropSubmissionSafe(input);
    const stripped = stripAdminOnlyDropFields(input);
    const sanitized = sanitizeDropData(stripped, CREATOR_DROP_SUBMISSION_FIELDS);
    const normalizedCreatorId = readString(creatorId);
    const normalizedUserId = readString(userId);

    return {
        ...sanitized,
        creatorId: normalizedCreatorId,
        submittedByCreatorId: normalizedCreatorId,
        submittedByUserId: normalizedUserId,
        createdByRole: "creator",
        approvalStatus: "pending_review",
        approvalReviewedAt: null,
        approvalReviewedBy: null,
        approvalNote: null,
        reviewStatus: "pending_admin_approval",
        reviewedByAdminId: null,
        reviewedAt: null,
        reviewNote: null,
        publicDiscovery: false,
        rotationEligibility: false,
        status: "scheduled",
        sourceTruth: "creator_submission_pending_admin_approval",
    };
}

export function buildCreatorPendingDropPayload(input: Record<string, unknown>, creatorId: string, userId: string) {
    return sanitizeCreatorDropSubmission(input, creatorId, userId);
}

export { stripAdminOnlyDropFields };
export { isCreatorAllowedDropField } from "@/lib/drops/drop-form-contract";

export function getCreatorAdminOnlyDropFields() {
    return [...CREATOR_DROP_ADMIN_ONLY_FIELDS];
}
