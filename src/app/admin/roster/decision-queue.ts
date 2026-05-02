import type {
    CreatorContractDocumentStatus,
    CreatorContractSignatureStatus,
    CreatorOnboardingApprovalStatus,
    CreatorOnboardingIdStatus,
    CreatorOnboardingLegalStatus,
    CreatorOnboardingSubmissionStatus,
} from "@/lib/creator-onboarding";

export const ROSTER_DECISION_TABS = [
    { key: "needs_review", label: "Needs Review" },
    { key: "waiting", label: "Waiting" },
    { key: "approved", label: "Approved" },
    { key: "create", label: "Create" },
] as const;

export type RosterTab = (typeof ROSTER_DECISION_TABS)[number]["key"];
export type RosterDecisionTab = Exclude<RosterTab, "create">;

export const ROSTER_DETAIL_SECTION_KEYS = [
    "account_controls",
    "fan_experience_settings",
    "agreement_document",
    "id_files",
    "audit_trail",
    "admin_notes",
    "owner_controls",
    "agreement_templates",
] as const;

export type RosterDetailSectionKey = (typeof ROSTER_DETAIL_SECTION_KEYS)[number];

export type CreatorDecisionEntry = {
    uid?: string;
    role: "user" | "creator" | "admin";
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    readyForApproval: boolean;
    ownerOverrideActive?: boolean;
    introAcknowledgedAt?: number;
};

export function buildPrimaryActionLabel(entry: CreatorDecisionEntry) {
    if (!entry.introAcknowledgedAt) {
        return "Waiting for intro";
    }
    if (entry.idVerificationStatus === "id_not_requested" || entry.idVerificationStatus === "id_rejected") {
        return "Request ID upload";
    }
    if (entry.contractDocumentStatus !== "contract_sent") {
        return "Send agreement";
    }
    if (entry.creatorSignatureStatus === "signature_signed" && entry.adminSignatureStatus !== "signature_signed") {
        return "Countersign agreement";
    }
    if (entry.readyForApproval || entry.ownerOverrideActive) {
        return "Approve creator";
    }

    return "Review application";
}

export function classifyRosterDecisionEntry(entry: CreatorDecisionEntry): RosterDecisionTab {
    if (entry.role === "creator" || entry.approvalStatus === "creator_approved") {
        return "approved";
    }

    if (
        !entry.introAcknowledgedAt
        || entry.approvalStatus === "creator_needs_changes"
        || (entry.contractDocumentStatus === "contract_sent" && entry.creatorSignatureStatus !== "signature_signed")
        || entry.idVerificationStatus === "id_requested"
    ) {
        return "waiting";
    }

    return "needs_review";
}

export function formatIntakeStatus(entry: CreatorDecisionEntry) {
    if (!entry.introAcknowledgedAt) {
        return "Waiting for intro";
    }
    if (entry.submissionStatus === "awaiting_manual_review") {
        return "Ready for review";
    }
    return "Submitted";
}

export function formatAgreementStatus(entry: CreatorDecisionEntry) {
    if (entry.contractDocumentStatus !== "contract_sent") {
        return "Agreement not sent";
    }
    if (entry.creatorSignatureStatus !== "signature_signed") {
        return "Waiting for creator signature";
    }
    if (entry.adminSignatureStatus !== "signature_signed") {
        return "Needs countersignature";
    }
    return "Agreement signed";
}

export function formatIdStatus(status: CreatorOnboardingIdStatus) {
    if (status === "id_not_requested") {
        return "ID upload not requested";
    }
    if (status === "id_requested") {
        return "Waiting for ID upload";
    }
    if (status === "id_submitted") {
        return "ID ready for review";
    }
    if (status === "id_verified") {
        return "ID verified";
    }
    return "ID needs resubmission";
}

export function formatApprovalStatus(status: CreatorOnboardingApprovalStatus, role: CreatorDecisionEntry["role"]) {
    if (role === "creator" || status === "creator_approved") {
        return "Approved creator";
    }
    if (status === "creator_needs_changes") {
        return "Waiting for resubmission";
    }
    if (status === "creator_rejected") {
        return "Not approved";
    }
    return "Needs review";
}

export function buildRosterTelemetryPayload(input: {
    isOwner: boolean;
    actorUid?: string | null;
    actorEmail?: string | null;
    targetUserId?: string | null;
    tab: RosterTab;
    actionKey: string;
    sectionKey?: string;
}) {
    const occurredAt = new Date().toISOString();
    const targetUserId = input.targetUserId || "";

    return {
        actorType: input.isOwner ? "owner_admin" : "admin",
        actorUid: input.actorUid ?? "",
        actorEmail: input.actorEmail ?? "",
        actorRole: input.isOwner ? "owner_admin" : "admin",
        targetUserId,
        targetCreatorId: targetUserId,
        performedAs: targetUserId ? "admin_on_behalf" : "own_account",
        surface: "admin_roster",
        route: "/admin/roster",
        tab: input.tab,
        actionKey: input.actionKey,
        sectionKey: input.sectionKey ?? "",
        occurredAt,
        dedupeKey: `admin_roster:${input.actionKey}:${targetUserId || "none"}:${occurredAt.slice(0, 19)}`,
        source: "admin_roster_decision_queue",
        actorMarkerPresent: true,
        rosterMode: "decision_queue",
    };
}
