import type {
    CreatorApplication,
    CreatorApplicationStatus,
    CreatorIdVerificationStatus,
    CreatorLegalDocumentStatus,
    CreatorSegmentationStatus,
    UserProfile,
} from "@/types/db";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";

export const CREATOR_APPLICATION_PATH = "/creators/apply";
export const CREATOR_WAITLIST_PATH = "/creators/waitlist";

export type CreatorNavigationState = "creator_waitlist";

const VALID_CREATOR_APPLICATION_STATUSES = new Set<CreatorApplicationStatus>(["waitlist", "review", "approved", "declined"]);
const VALID_CREATOR_LEGAL_DOCUMENT_STATUSES = new Set<CreatorLegalDocumentStatus>(["not_sent", "sent", "opened", "signed"]);
const VALID_CREATOR_ID_VERIFICATION_STATUSES = new Set<CreatorIdVerificationStatus>(["not_requested", "requested", "submitted", "verified", "rejected"]);
const VALID_CREATOR_SEGMENTATION_STATUSES = new Set<CreatorSegmentationStatus>(["pending", "in_review", "segmented"]);

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

function normalizeCreatorApplicationStatus(value: unknown): CreatorApplicationStatus {
    return VALID_CREATOR_APPLICATION_STATUSES.has(value as CreatorApplicationStatus)
        ? value as CreatorApplicationStatus
        : "waitlist";
}

function normalizeCreatorLegalDocumentStatus(value: unknown): CreatorLegalDocumentStatus {
    return VALID_CREATOR_LEGAL_DOCUMENT_STATUSES.has(value as CreatorLegalDocumentStatus)
        ? value as CreatorLegalDocumentStatus
        : "not_sent";
}

function normalizeCreatorIdVerificationStatus(value: unknown): CreatorIdVerificationStatus {
    return VALID_CREATOR_ID_VERIFICATION_STATUSES.has(value as CreatorIdVerificationStatus)
        ? value as CreatorIdVerificationStatus
        : "not_requested";
}

function normalizeCreatorSegmentationStatus(value: unknown): CreatorSegmentationStatus {
    return VALID_CREATOR_SEGMENTATION_STATUSES.has(value as CreatorSegmentationStatus)
        ? value as CreatorSegmentationStatus
        : "pending";
}

export function generateCreatorQueuePosition() {
    const minimum = 1200;
    const maximum = 14850;
    const span = maximum - minimum + 1;

    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return minimum + (buffer[0] % span);
    }

    throw new Error("Cryptographically secure random number generation is not available in this environment.");
}

export function buildInitialCreatorApplication(input: {
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    queuePosition?: number;
    submittedAt?: number;
}): CreatorApplication {
    const submittedAt = typeof input.submittedAt === "number" && Number.isFinite(input.submittedAt)
        ? Math.trunc(input.submittedAt)
        : Date.now();

    return {
        signupType: "creator",
        status: "waitlist",
        queuePosition: typeof input.queuePosition === "number" && Number.isFinite(input.queuePosition)
            ? Math.trunc(input.queuePosition)
            : generateCreatorQueuePosition(),
        submittedAt,
        updatedAt: submittedAt,
        creatorDisplayName: input.creatorDisplayName.trim(),
        creatorPrimaryPlatform: readString(input.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(input.creatorContentFocus) || undefined,
        bypassFanOnboarding: true,
        legalDocumentStatus: "not_sent",
        idVerificationStatus: "not_requested",
        segmentationStatus: "pending",
    };
}

export function normalizeCreatorApplication(value: unknown): CreatorApplication | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const source = value as Record<string, unknown>;
    const creatorDisplayName = readString(source.creatorDisplayName);
    if (!creatorDisplayName) {
        return undefined;
    }

    const submittedAt = readOptionalTimestamp(source.submittedAt) ?? Date.now();
    const updatedAt = readOptionalTimestamp(source.updatedAt) ?? submittedAt;

    return {
        signupType: "creator",
        status: normalizeCreatorApplicationStatus(source.status),
        queuePosition: typeof source.queuePosition === "number" && Number.isFinite(source.queuePosition) && source.queuePosition > 0
            ? Math.trunc(source.queuePosition)
            : generateCreatorQueuePosition(),
        submittedAt,
        updatedAt,
        creatorDisplayName,
        creatorPrimaryPlatform: readString(source.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(source.creatorContentFocus) || undefined,
        bypassFanOnboarding: source.bypassFanOnboarding !== false,
        legalDocumentStatus: normalizeCreatorLegalDocumentStatus(source.legalDocumentStatus),
        legalDocumentUrl: readString(source.legalDocumentUrl) || undefined,
        legalDocumentSentAt: readOptionalTimestamp(source.legalDocumentSentAt),
        legalDocumentSignedAt: readOptionalTimestamp(source.legalDocumentSignedAt),
        idVerificationStatus: normalizeCreatorIdVerificationStatus(source.idVerificationStatus),
        idVerificationRequestedAt: readOptionalTimestamp(source.idVerificationRequestedAt),
        idVerificationSubmittedAt: readOptionalTimestamp(source.idVerificationSubmittedAt),
        idVerificationReviewedAt: readOptionalTimestamp(source.idVerificationReviewedAt),
        segmentationStatus: normalizeCreatorSegmentationStatus(source.segmentationStatus),
        segmentLabel: readString(source.segmentLabel) || undefined,
        segmentedAt: readOptionalTimestamp(source.segmentedAt),
        reviewedBy: readString(source.reviewedBy) || undefined,
        adminNotes: readString(source.adminNotes) || undefined,
    };
}

export function sanitizeCreatorApplicationUpdate(
    value: unknown,
    options?: {
        nowMs?: number;
        reviewedBy?: string | null;
    },
): CreatorApplication | undefined {
    const normalized = normalizeCreatorApplication(value);
    if (!normalized) {
        return undefined;
    }

    const nowMs = typeof options?.nowMs === "number" && Number.isFinite(options.nowMs)
        ? Math.trunc(options.nowMs)
        : Date.now();

    return {
        ...normalized,
        updatedAt: nowMs,
        reviewedBy: readString(options?.reviewedBy) || normalized.reviewedBy,
    };
}

export function getCreatorNavigationState(value: CreatorApplication | null | undefined): CreatorNavigationState | null {
    if (!value) {
        return null;
    }

    if (value.bypassFanOnboarding && value.status !== "approved" && value.status !== "declined") {
        return "creator_waitlist";
    }

    return null;
}

export function shouldBypassFanOnboarding(profile: Pick<UserProfile, "role" | "creatorApplication"> | null | undefined) {
    if (!profile) {
        return false;
    }

    return profile.role === "creator"
        || profile.role === "admin"
        || profile.creatorApplication?.bypassFanOnboarding === true;
}

export function getPreferredAuthenticatedPathForProfile(
    profile: Pick<UserProfile, "role" | "creatorApplication"> | null | undefined,
    ownerId?: string | null,
) {
    if (getCreatorNavigationState(profile?.creatorApplication) === "creator_waitlist") {
        return CREATOR_WAITLIST_PATH;
    }

    return readPreferredAuthenticatedPath(profile?.role ?? "user", ownerId);
}
