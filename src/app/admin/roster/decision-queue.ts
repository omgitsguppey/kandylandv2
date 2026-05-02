import {
    CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS,
    deriveCreatorPrimaryAction,
    deriveCreatorRosterBucket,
    deriveCreatorVisibleStatus,
    type CreatorOnboardingDecisionRecord,
} from "@/lib/creator-onboarding-projection";

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

export type CreatorDecisionEntry = CreatorOnboardingDecisionRecord;

export function buildPrimaryActionLabel(entry: CreatorDecisionEntry) {
    return deriveCreatorPrimaryAction(entry);
}

export function classifyRosterDecisionEntry(entry: CreatorDecisionEntry): RosterDecisionTab {
    return deriveCreatorRosterBucket(entry);
}

export function formatIntakeStatus(entry: CreatorDecisionEntry) {
    return deriveCreatorVisibleStatus(entry).visibleStatusLabels.intakeStatus;
}

export function formatAgreementStatus(entry: CreatorDecisionEntry) {
    return deriveCreatorVisibleStatus(entry).visibleStatusLabels.agreementStatus;
}

export function formatIdStatus(status: CreatorDecisionEntry["idVerificationStatus"]) {
    return CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.idVerificationStatus[status];
}

export function formatApprovalStatus(status: CreatorDecisionEntry["approvalStatus"], role: CreatorDecisionEntry["role"]) {
    if (role === "creator" || status === "creator_approved") {
        return CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.approvalStatus.creator_approved;
    }

    return CREATOR_ONBOARDING_VISIBLE_STATUS_LABELS.approvalStatus[status];
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
    const performedAs = input.actionKey.startsWith("admin_view_as_creator")
        ? "admin_view_as_creator"
        : targetUserId
            ? "admin_on_behalf"
            : "own_account";

    return {
        actorType: input.isOwner ? "owner_admin" : "admin",
        actorUid: input.actorUid ?? "",
        actorEmail: input.actorEmail ?? "",
        actorRole: input.isOwner ? "owner_admin" : "admin",
        targetUserId,
        targetCreatorId: targetUserId,
        performedAs,
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
