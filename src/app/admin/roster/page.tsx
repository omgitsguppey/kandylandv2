"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ChevronRight,
    PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import {
    CreatorAccountControlsPanel,
    type CreatorAccountControlResult,
    type CreatorAccountControlsTarget,
} from "@/components/Admin/CreatorAccountControlsPanel";
import { AdminCreatorViewAsControls } from "@/components/Admin/AdminCreatorViewAsControls";
import { CreatorAuditTrailPanel } from "@/components/Admin/CreatorAuditTrailPanel";
import {
    CreatorFanExperienceSettingsPanel,
    type CreatorFanExperienceSettingsTarget,
} from "@/components/Admin/CreatorFanExperienceSettingsPanel";
import {
    SyntheticCreatorCreateFields,
    type SyntheticCreatorCreateValue,
} from "@/components/Admin/SyntheticCreatorCreateFields";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import type { CreatorAccountControlCommand } from "@/lib/admin/creator-account-controls";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { sanitizeErrorForUser } from "@/lib/errors/resolve-human-error";
import type {
    CreatorAgreementSource,
    CreatorAgreementTemplateAdminView,
} from "@/lib/creator-agreement-documents";
import {
    CREATOR_CONTRACT_SUMMARY_BULLETS,
    CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS,
} from "@/lib/creator-contract";
import type { CreatorFanExperienceSettingsCommand } from "@/lib/admin/creator-fan-experience-settings";
import type { SyntheticCreatorType, SyntheticLegalEvidenceMode } from "@/lib/admin/synthetic-creators-view-as";
import type { CreatorRestrictions, CreatorSettings } from "@/lib/creator-experiences";
import {
    describeCreatorOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
    type CreatorContractDocumentStatus,
    type CreatorContractSignatureStatus,
    type CreatorOnboardingApprovalStatus,
    type CreatorOnboardingBlockingReason,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
    type CreatorOnboardingIdStatus,
    type CreatorOnboardingLegalStatus,
    type CreatorOnboardingSegmentStatus,
    type CreatorOnboardingSubmissionStatus,
} from "@/lib/creator-onboarding";
import { PRIMARY_CREATOR_OWNER_EMAIL } from "@/lib/creator-admin";
import { useAuth } from "@/context/AuthContext";
import { isAdminUiTestSessionUser } from "@/lib/admin/admin-ui-test-session";
import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { trackEvent } from "@/lib/telemetry";
import {
    buildCreatorAdminHref,
    buildCreatorReviewHref,
} from "@/lib/creator-profile-routing";
import {
    ROSTER_DECISION_TABS,
    ROSTER_DETAIL_SECTION_KEYS,
    buildPrimaryActionLabel,
    buildRosterTelemetryPayload,
    classifyRosterDecisionEntry,
    formatAgreementStatus,
    formatApprovalStatus,
    formatIdStatus,
    formatIntakeStatus,
    type RosterDetailSectionKey,
    type RosterTab,
} from "./decision-queue";
import { deriveCreatorVisibleStatus } from "@/lib/creator-onboarding-projection";

type CreatorAdminRosterAction =
    | "send_agreement"
    | "send_updated_agreement"
    | "countersign_agreement"
    | "request_id"
    | "mark_id_verified"
    | "mark_id_rejected"
    | "approve_creator"
    | "reject_creator"
    | "request_changes"
    | "apply_owner_override"
    | "clear_owner_override"
    | "activate_creator_role"
    | "update_admin_notes"
    | "mark_synthetic_creator";

type CreatorReviewQueueEntry = {
    uid: string;
    displayName: string;
    email: string;
    role: "user" | "creator" | "admin";
    creatorDisplayName: string;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    queueBucket: string;
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus?: CreatorOnboardingSegmentStatus;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    blockingReasons: CreatorOnboardingBlockingReason[];
    readyForApproval: boolean;
    ownerOverrideActive?: boolean;
    isSyntheticCreator?: boolean;
    syntheticCreatorType?: SyntheticCreatorType;
    syntheticCreatedByUid?: string;
    syntheticCreatedAt?: number;
    syntheticReason?: string;
    humanOperatorRequired?: boolean;
    publicDisclosureMode?: string;
    syntheticLegalEvidenceMode?: SyntheticLegalEvidenceMode;
    introAcknowledgedAt?: number;
    submittedAt: number;
    updatedAt: number;
    idDocumentCount: number;
    creatorTemplateLabel?: string;
    kycDueAt?: number;
    reapplyAvailableAt?: number;
    adminNotes?: string;
    idDocumentFrontFileName?: string;
    idDocumentBackFileName?: string;
    idDocumentFaceFileName?: string;
    idDocumentVideoFileName?: string;
    contractVersion?: string;
    legalDocumentSentAt?: number;
    agreementTemplateId?: string;
    agreementTitle?: string;
    agreementHash?: string;
    agreementSource?: CreatorAgreementSource;
    agreementDispatchId?: string;
    agreementDispatchStatus?: "sent" | "viewed" | "signed" | "superseded";
    queueMaterializedAt?: number;
    sourceOnboardingUpdatedAt?: number;
    projectionLagMs?: number;
    queueParityOk?: boolean;
    queueParityDelta?: Array<Record<string, unknown>>;
    creatorLaneWarnings?: string[];
};

type RosterUser = {
    uid: string;
    displayName: string;
    email: string;
    username: string;
    role: "user" | "creator" | "admin";
    status: "active" | "suspended" | "banned";
    isSyntheticCreator?: boolean;
    syntheticCreatorType?: SyntheticCreatorType;
    humanOperatorRequired?: boolean;
    syntheticLegalEvidenceMode?: SyntheticLegalEvidenceMode;
    isVerified: boolean;
};

type CreatorRosterResponse = {
    success: boolean;
    rosterUsers: RosterUser[];
    creatorReviewQueue: CreatorReviewQueueEntry[];
    summary: {
        creatorCount: number;
        reviewQueueCount: number;
        readyForApprovalCount: number;
        waitingOnIdCount: number;
        waitingOnLegalCount: number;
        needsChangesCount: number;
        rejectedCount: number;
    };
};

type CreatorDetailResponse = {
    success: boolean;
    user: {
        uid: string;
        displayName: string;
        email: string;
        username?: string;
        role: "user" | "creator" | "admin";
        status: "active" | "suspended" | "banned";
        isSyntheticCreator?: boolean;
        syntheticCreatorType?: SyntheticCreatorType;
        humanOperatorRequired?: boolean;
        syntheticLegalEvidenceMode?: SyntheticLegalEvidenceMode;
        notificationSettings?: {
            inAppEnabled?: boolean;
            browserPushEnabled?: boolean;
            newDropAlerts?: boolean;
            expiringSoonAlerts?: boolean;
        };
        adminAccountControlDebug?: {
            lastAdminAccountActionAt?: number;
            lastAdminAccountActionBy?: string;
            accountControlWarnings?: string[];
            passwordActionMode?: string;
            emailUpdateServerConfirmed?: boolean;
            roleUpdateServerConfirmed?: boolean;
        } | null;
        creatorSettings?: CreatorSettings;
        creatorRestrictions?: CreatorRestrictions;
        creatorFanExperienceSettingsDebug?: {
            creatorSettingsSource?: string;
            settingsNormalized?: boolean;
            settingsValidationWarnings?: string[];
            lastSettingsUpdatedAt?: number;
            lastSettingsUpdatedBy?: string;
            changedKeys?: string[];
        } | null;
        adminViewAsDebug?: {
            activeViewAsUserId?: string;
            activeViewAsRole?: string;
            viewAsStartedAt?: number;
            viewAsActorUid?: string;
            viewAsReturnHref?: string;
            syntheticCreatorMarkerPresent?: boolean;
            destructiveActionsBlockedInViewAs?: boolean;
        } | null;
        creatorApplication?: CreatorOnboardingCanonicalRecord | null;
    };
    creatorOnboardingCanonical?: CreatorOnboardingCanonicalRecord | null;
    creatorOnboardingHistory?: CreatorOnboardingHistoryEntry[];
};

type CreateCreatorFormState = {
    displayName: string;
    email: string;
    handle: string;
    platform: string;
    contentType: string;
    password: string;
    creatorPath: "intake" | "live_override";
    compliancePath: "required" | "bypass";
    ownerOverrideReason: string;
} & SyntheticCreatorCreateValue;

type AgreementTemplateFormState = {
    agreementVersion: string;
    agreementTitle: string;
    agreementSource: CreatorAgreementSource;
    summaryBullets: string;
    supersedesVersion: string;
};

const DEFAULT_CREATE_CREATOR_FORM: CreateCreatorFormState = {
    displayName: "",
    email: "",
    handle: "",
    platform: "",
    contentType: "",
    password: "",
    creatorPath: "intake",
    compliancePath: "required",
    ownerOverrideReason: "",
    isSyntheticCreator: false,
    syntheticCreatorType: "test_creator",
    syntheticReason: "",
    humanOperatorRequired: true,
};

const DEFAULT_AGREEMENT_TEMPLATE_FORM: AgreementTemplateFormState = {
    agreementVersion: "",
    agreementTitle: "KandyDrops Creator Service Agreement",
    agreementSource: "uploaded_pdf_snapshot",
    summaryBullets: "",
    supersedesVersion: "",
};

function formatTimestamp(value: number | undefined) {
    if (!value || !Number.isFinite(value)) {
        return "Not recorded";
    }

    return new Date(value).toLocaleString();
}

function countRealBlockers(entry: CreatorReviewQueueEntry) {
    return entry.blockingReasons.length;
}

function buildStage(entry: CreatorReviewQueueEntry) {
    return getCreatorOnboardingStatusSummary(entry).stage;
}

function formatBoolean(value: boolean) {
    return value ? "Yes" : "No";
}

function formatAgreementSource(value: CreatorAgreementSource | undefined) {
    if (value === "uploaded_pdf_snapshot") {
        return "Uploaded PDF";
    }
    if (value === "hybrid") {
        return "Uploaded source plus app summary";
    }
    return "Native full text";
}

function getAdminRosterSafeErrorMessage(error: unknown, fallback: string) {
    const safeError = sanitizeErrorForUser(error, "admin_truth", "admin_truth_unavailable");
    return safeError.errorKey === "unknown_error" ? fallback : safeError.operatorMessage;
}

export default function AdminRosterPage() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { debug: viewAsDebug } = useAdminViewAs();
    const [tab, setTab] = useState<RosterTab>("needs_review");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [roster, setRoster] = useState<CreatorRosterResponse | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [detail, setDetail] = useState<CreatorDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [ownerOverrideReason, setOwnerOverrideReason] = useState("");
    const [createCreatorForm, setCreateCreatorForm] = useState<CreateCreatorFormState>(DEFAULT_CREATE_CREATOR_FORM);
    const [agreementTemplate, setAgreementTemplate] = useState<CreatorAgreementTemplateAdminView | null>(null);
    const [agreementTemplateForm, setAgreementTemplateForm] = useState<AgreementTemplateFormState>(DEFAULT_AGREEMENT_TEMPLATE_FORM);
    const [agreementTemplateFile, setAgreementTemplateFile] = useState<File | null>(null);
    const [agreementSaving, setAgreementSaving] = useState<string | null>(null);
    const [accountSaving, setAccountSaving] = useState<string | null>(null);
    const [fanExperienceSaving, setFanExperienceSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<RosterDetailSectionKey, boolean>>({
        account_controls: false,
        fan_experience_settings: false,
        agreement_document: false,
        id_files: false,
        audit_trail: false,
        admin_notes: false,
        owner_controls: false,
        agreement_templates: false,
    });

    const isOwner = user?.email?.toLowerCase() === PRIMARY_CREATOR_OWNER_EMAIL;
    const isLocalAdminUiTestSession = isAdminUiTestSessionUser(user);
    const creatorMutationDisabled = isLocalAdminUiTestSession;
    const focusUserId = searchParams.get("focus");

    const intakeEntries = roster?.creatorReviewQueue ?? [];
    const liveCreators = (roster?.rosterUsers ?? []).filter((entry) => entry.role === "creator");
    const selectedEntry = intakeEntries.find((entry) => entry.uid === selectedUserId) ?? null;
    const selectedCanonical = detail?.creatorOnboardingCanonical ?? null;
    const selectedHistory = detail?.creatorOnboardingHistory ?? [];
    const selectedAgreementVersion = selectedCanonical?.contractVersion || selectedEntry?.contractVersion || agreementTemplate?.agreementVersion || "";
    const selectedAgreementTitle = selectedCanonical?.agreementTitle || selectedEntry?.agreementTitle || agreementTemplate?.agreementTitle || "Agreement not set";
    const selectedAgreementHash = selectedCanonical?.agreementHash || selectedEntry?.agreementHash || "";
    const selectedAgreementSource = selectedCanonical?.agreementSource || selectedEntry?.agreementSource || agreementTemplate?.agreementSource;
    const selectedAgreementDispatchStatus = selectedCanonical?.agreementDispatchStatus || selectedEntry?.agreementDispatchStatus;
    const selectedSyntheticCreatorType = selectedCanonical?.syntheticCreatorType
        ?? selectedEntry?.syntheticCreatorType
        ?? detail?.user.syntheticCreatorType;
    const selectedReviewHref = buildCreatorReviewHref(selectedUserId);
    const selectedAdminHref = buildCreatorAdminHref({
        uid: selectedUserId,
        userId: selectedUserId,
    });
    const selectedAccountTarget: CreatorAccountControlsTarget | null = detail?.user && selectedUserId ? {
        uid: selectedUserId,
        displayName: detail.user.displayName || selectedCanonical?.creatorDisplayName || selectedEntry?.creatorDisplayName || "",
        email: detail.user.email || selectedEntry?.email || "",
        username: detail.user.username || "",
        role: detail.user.role,
        status: detail.user.status || "active",
        approvalStatus: selectedCanonical?.approvalStatus || selectedEntry?.approvalStatus || detail.user.creatorApplication?.approvalStatus || "creator_pending",
        notificationSettings: detail.user.notificationSettings,
    } : null;
    const selectedFanExperienceTarget: CreatorFanExperienceSettingsTarget | null = detail?.user && selectedUserId ? {
        uid: selectedUserId,
        displayName: detail.user.displayName || selectedCanonical?.creatorDisplayName || selectedEntry?.creatorDisplayName || "",
        creatorSettings: detail.user.creatorSettings,
        creatorRestrictions: detail.user.creatorRestrictions,
    } : null;
    // ⚡ Bolt: Single-pass iteration to categorize entries instead of multiple O(N) filters
    const entriesByDecision = useMemo(() => {
        const result = {
            needs_review: [] as typeof intakeEntries,
            waiting: [] as typeof intakeEntries,
            approved: [] as typeof intakeEntries,
        };
        for (const entry of intakeEntries) {
            const bucket = classifyRosterDecisionEntry(entry);
            if (bucket === "needs_review") result.needs_review.push(entry);
            else if (bucket === "waiting") result.waiting.push(entry);
            else if (bucket === "approved") result.approved.push(entry);
        }
        return result;
    }, [intakeEntries]);
    const approvedQueueIds = useMemo(() => new Set(entriesByDecision.approved.map((entry) => entry.uid)), [entriesByDecision.approved]);
    const approvedLiveCreators = liveCreators.filter((entry) => !approvedQueueIds.has(entry.uid));
    const visibleDecisionEntries = tab === "create" ? [] : entriesByDecision[tab];
    const collapsedSections = ROSTER_DETAIL_SECTION_KEYS.filter((sectionKey) => !expandedSections[sectionKey]);
    const selectedVisibleStatus = selectedCanonical
        ? deriveCreatorVisibleStatus(selectedCanonical, {
            source: {
                userId: selectedCanonical.userId,
                submissionStatus: selectedCanonical.submissionStatus,
                approvalStatus: selectedCanonical.approvalStatus,
                legalStatus: selectedCanonical.legalStatus,
                idVerificationStatus: selectedCanonical.idVerificationStatus,
                segmentationStatus: selectedCanonical.segmentationStatus,
                contractDocumentStatus: selectedCanonical.contractDocumentStatus,
                creatorSignatureStatus: selectedCanonical.creatorSignatureStatus,
                adminSignatureStatus: selectedCanonical.adminSignatureStatus,
            },
            context: { source: "canonical" },
        })
        : selectedEntry
            ? deriveCreatorVisibleStatus(selectedEntry, {
                source: {
                    userId: selectedEntry.uid,
                    queueBucket: selectedEntry.queueBucket,
                    submissionStatus: selectedEntry.submissionStatus,
                    approvalStatus: selectedEntry.approvalStatus,
                    legalStatus: selectedEntry.legalStatus,
                    idVerificationStatus: selectedEntry.idVerificationStatus,
                    segmentationStatus: selectedEntry.segmentationStatus,
                    contractDocumentStatus: selectedEntry.contractDocumentStatus,
                    creatorSignatureStatus: selectedEntry.creatorSignatureStatus,
                    adminSignatureStatus: selectedEntry.adminSignatureStatus,
                },
                context: { source: "projection" },
            })
            : null;
    const selectedPrimaryAction = selectedVisibleStatus?.primaryAction ?? "";
    const selectedCreatorLaneWarnings = selectedEntry?.creatorLaneWarnings ?? [];

    useEffect(() => {
        let cancelled = false;

        async function loadRoster() {
            if (isLocalAdminUiTestSession) {
                setRoster(null);
                setSelectedUserId(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (query.trim().length >= 2) {
                    params.set("q", query.trim());
                }
                const response = await authFetch(`/api/admin/roster${params.size ? `?${params}` : ""}`);
                const result = await response.json() as CreatorRosterResponse & { error?: string };
                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Failed to load creator roster.");
                }
                if (!cancelled) {
                    setRoster(result);
                    if (focusUserId && !selectedUserId) {
                        setSelectedUserId(focusUserId);
                    }
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    severity: "error",
                    message: "Admin creator roster failed to load",
                    error,
                    detail: {
                        adminView: "creator_roster",
                    },
                    consoleLabel: "[Admin Roster] load failed",
                });
                if (!cancelled) {
                    toast.error(getAdminRosterSafeErrorMessage(error, "Failed to load creator roster."));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadRoster();
        return () => {
            cancelled = true;
        };
    }, [focusUserId, isLocalAdminUiTestSession, query, selectedUserId]);

    useEffect(() => {
        if (isLocalAdminUiTestSession) {
            setDetail(null);
            setDetailLoading(false);
            return;
        }

        if (!selectedUserId) {
            setDetail(null);
            return;
        }

        let cancelled = false;

        async function loadDetail() {
            try {
                setDetailLoading(true);
                const response = await authFetch(`/api/admin/user/${selectedUserId}`);
                const result = await response.json() as CreatorDetailResponse & { error?: string };
                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Failed to load creator intake detail.");
                }
                if (!cancelled) {
                    setDetail(result);
                    setOwnerOverrideReason(result.creatorOnboardingCanonical?.ownerOverrideReason || "");
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    severity: "error",
                    message: "Admin creator intake detail failed to load",
                    error,
                    detail: {
                        adminView: "creator_roster_detail",
                        userId: selectedUserId,
                    },
                    consoleLabel: "[Admin Roster] detail load failed",
                });
                if (!cancelled) {
                    toast.error(getAdminRosterSafeErrorMessage(error, "Failed to load creator intake detail."));
                }
            } finally {
                if (!cancelled) {
                    setDetailLoading(false);
                }
            }
        }

        void loadDetail();
        return () => {
            cancelled = true;
        };
    }, [isLocalAdminUiTestSession, selectedUserId]);

    useEffect(() => {
        if (isLocalAdminUiTestSession) {
            setAgreementTemplate(null);
            setAgreementTemplateForm(DEFAULT_AGREEMENT_TEMPLATE_FORM);
            return;
        }

        let cancelled = false;

        async function loadAgreementTemplate() {
            try {
                const response = await authFetch("/api/admin/creator-agreements");
                const result = await response.json() as { success?: boolean; activeTemplate?: CreatorAgreementTemplateAdminView; error?: string };
                if (!response.ok || !result.success || !result.activeTemplate) {
                    throw new Error(result.error || "Failed to load agreement template.");
                }
                if (!cancelled) {
                    setAgreementTemplate(result.activeTemplate);
                    setAgreementTemplateForm((current) => ({
                        ...current,
                        agreementVersion: current.agreementVersion || result.activeTemplate?.agreementVersion || "",
                        agreementTitle: current.agreementTitle || result.activeTemplate?.agreementTitle || DEFAULT_AGREEMENT_TEMPLATE_FORM.agreementTitle,
                        agreementSource: result.activeTemplate?.agreementSource || current.agreementSource,
                        summaryBullets: current.summaryBullets || (result.activeTemplate?.summaryBullets ?? []).join("\n"),
                        supersedesVersion: current.supersedesVersion || result.activeTemplate?.agreementVersion || "",
                    }));
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    severity: "warn",
                    message: "Admin creator agreement template failed to load",
                    error,
                    detail: {
                        adminView: "creator_roster_agreement_templates",
                    },
                    consoleLabel: "[Admin Roster] agreement template load failed",
                });
            }
        }

        void loadAgreementTemplate();
        return () => {
            cancelled = true;
        };
    }, [isLocalAdminUiTestSession]);

    const refreshSelectedDetail = async () => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        if (!selectedUserId) {
            return;
        }

        const response = await authFetch(`/api/admin/user/${selectedUserId}`);
        const result = await response.json() as CreatorDetailResponse & { error?: string };
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to refresh creator intake detail.");
        }
        setDetail(result);
        setOwnerOverrideReason(result.creatorOnboardingCanonical?.ownerOverrideReason || "");
    };

    const refreshRoster = async () => {
        if (isLocalAdminUiTestSession) {
            return;
        }

        const params = new URLSearchParams();
        if (query.trim().length >= 2) {
            params.set("q", query.trim());
        }
        const response = await authFetch(`/api/admin/roster${params.size ? `?${params}` : ""}`);
        const result = await response.json() as CreatorRosterResponse & { error?: string };
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Failed to refresh creator roster.");
        }
        setRoster(result);
    };

    const refreshAgreementTemplate = async () => {
        if (isLocalAdminUiTestSession) {
            throw new Error("source_missing: agreement template source is not loaded in this fixture.");
        }

        const response = await authFetch("/api/admin/creator-agreements");
        const result = await response.json() as { success?: boolean; activeTemplate?: CreatorAgreementTemplateAdminView; error?: string };
        if (!response.ok || !result.success || !result.activeTemplate) {
            throw new Error(result.error || "Failed to refresh agreement template.");
        }
        setAgreementTemplate(result.activeTemplate);
        return result.activeTemplate;
    };

    const submitCreatorAction = async (
        action: CreatorAdminRosterAction,
        payload: Record<string, unknown> = {},
        savingKey: string = action,
    ) => {
        if (creatorMutationDisabled) {
            return;
        }

        if (!selectedUserId) {
            return;
        }

        try {
            setSaving(savingKey);
            const response = await authFetch(`/api/admin/creators/${selectedUserId}/action`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    action,
                    payload,
                    expectedVersion: selectedCanonical?.sourceVersion ? String(selectedCanonical.sourceVersion) : undefined,
                    idempotencyKey: `admin_roster:${action}:${selectedUserId}:${Date.now()}`,
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Failed to update creator intake.");
            }
            await Promise.all([refreshRoster(), refreshSelectedDetail()]);
            toast.success("Creator intake updated.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Admin creator intake update failed",
                error,
                detail: {
                    adminView: "creator_roster",
                    action,
                    userId: selectedUserId,
                },
                consoleLabel: "[Admin Roster] update failed",
            });
            toast.error(getAdminRosterSafeErrorMessage(error, "Failed to update creator intake."));
        } finally {
            setSaving(null);
        }
    };

    const handleCreateCreator = async () => {
        if (creatorMutationDisabled) {
            return;
        }

        try {
            setCreating(true);
            const creatorPath = isOwner ? createCreatorForm.creatorPath : "intake";
            const compliancePath = isOwner ? createCreatorForm.compliancePath : "required";
            const response = await authFetch("/api/admin/roster", {
                method: "POST",
                body: JSON.stringify({
                    ...createCreatorForm,
                    creatorPath,
                    compliancePath,
                    ownerOverrideReason: creatorPath === "live_override" ? createCreatorForm.ownerOverrideReason : "",
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string; userId?: string };
            if (!response.ok || !result.userId) {
                throw new Error(result.error || "Failed to create creator.");
            }

            await refreshRoster();
            setSelectedUserId(result.userId);
            setTab(creatorPath === "live_override" ? "approved" : "needs_review");
            setCreateCreatorForm(DEFAULT_CREATE_CREATOR_FORM);
            toast.success("Creator account created.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Direct creator creation failed",
                error,
                detail: {
                    adminView: "creator_roster_create",
                },
                consoleLabel: "[Admin Roster] direct create failed",
            });
            toast.error(getAdminRosterSafeErrorMessage(error, "Failed to create creator."));
        } finally {
            setCreating(false);
        }
    };

    const buildTelemetryPayload = (input: {
        targetUserId?: string | null;
        actionKey: string;
        sectionKey?: string;
        tabOverride?: RosterTab;
    }) => buildRosterTelemetryPayload({
        isOwner,
        actorUid: user?.uid,
        actorEmail: user?.email,
        targetUserId: input.targetUserId ?? selectedUserId,
        tab: input.tabOverride ?? tab,
        actionKey: input.actionKey,
        sectionKey: input.sectionKey,
    });

    const handleTabChange = (nextTab: RosterTab) => {
        setTab(nextTab);
        trackEvent("admin_roster_tab_changed", buildTelemetryPayload({
            actionKey: "admin_roster_tab_changed",
            tabOverride: nextTab,
        }));
    };

    const handleOpenCreatorRecord = (targetUserId: string) => {
        setSelectedUserId(targetUserId);
        trackEvent("admin_creator_record_opened", buildTelemetryPayload({
            targetUserId,
            actionKey: "admin_creator_record_opened",
        }));
    };

    const handlePrimaryActionClick = (actionKey: CreatorAdminRosterAction, payload: Record<string, unknown> = {}, savingKey: string = actionKey) => {
        trackEvent("admin_creator_primary_action_clicked", buildTelemetryPayload({
            actionKey,
        }));
        void submitCreatorAction(actionKey, payload, savingKey);
    };

    const handleAccountControlSubmit = async (command: CreatorAccountControlCommand): Promise<CreatorAccountControlResult | void> => {
        if (creatorMutationDisabled) {
            return;
        }

        try {
            setAccountSaving(command.action);
            trackEvent("admin_creator_primary_action_clicked", buildTelemetryPayload({
                actionKey: command.action,
            }));
            const response = await authFetch("/api/admin/creator-account-controls", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(command),
            });
            const result = await response.json().catch(() => ({})) as { error?: string; passwordResetLink?: string };
            if (!response.ok) {
                throw new Error(result.error || "Account update failed.");
            }
            await Promise.all([refreshRoster(), refreshSelectedDetail()]);
            toast.success(command.action === "create_password_reset_link" ? "Reset link created." : "Account controls updated.");
            return { passwordResetLink: result.passwordResetLink };
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Admin creator account control update failed",
                error,
                detail: {
                    adminView: "creator_roster_account_controls",
                    action: command.action,
                    userId: command.targetUserId,
                },
                consoleLabel: "[Admin Roster] account control update failed",
            });
            toast.error(getAdminRosterSafeErrorMessage(error, "Account update failed."));
        } finally {
            setAccountSaving(null);
        }
    };

    const handleAccountApprovalStatusChange = async (approvalStatus: CreatorOnboardingApprovalStatus) => {
        if (creatorMutationDisabled) {
            return;
        }

        if (approvalStatus === "creator_approved") {
            await submitCreatorAction("approve_creator", {}, "account-approval-status");
            return;
        }
        if (approvalStatus === "creator_rejected") {
            await submitCreatorAction("reject_creator", {}, "account-approval-status");
            return;
        }
        if (approvalStatus === "creator_needs_changes") {
            await submitCreatorAction("request_changes", {}, "account-approval-status");
            return;
        }

        toast.error("Choose approve, return for changes, or reject for creator review.");
    };

    const handleFanExperienceSettingsSubmit = async (command: CreatorFanExperienceSettingsCommand): Promise<void> => {
        if (creatorMutationDisabled) {
            return;
        }

        try {
            setFanExperienceSaving(true);
            trackEvent("admin_creator_primary_action_clicked", buildTelemetryPayload({
                actionKey: "admin_creator_experience_settings_saved",
            }));
            const response = await authFetch("/api/admin/creator-fan-experience-settings", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(command),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Fan experience settings update failed.");
            }
            await Promise.all([refreshRoster(), refreshSelectedDetail()]);
            toast.success("Fan experience settings updated.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Admin creator fan experience settings update failed",
                error,
                detail: {
                    adminView: "creator_roster_fan_experience_settings",
                    userId: command.targetUserId,
                },
                consoleLabel: "[Admin Roster] fan experience settings update failed",
            });
            toast.error(getAdminRosterSafeErrorMessage(error, "Fan experience settings update failed."));
        } finally {
            setFanExperienceSaving(false);
        }
    };

    const handleCreatorAgreementAction = async (actionKey: "send_agreement" | "send_updated_agreement" | "countersign_agreement") => {
        if (creatorMutationDisabled) {
            return;
        }

        if (!selectedUserId) {
            return;
        }

        try {
            setAgreementSaving(actionKey);
            trackEvent("admin_creator_primary_action_clicked", buildTelemetryPayload({
                actionKey,
            }));
            const response = await authFetch(`/api/admin/creators/${selectedUserId}/action`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    action: actionKey,
                    payload: {},
                    expectedVersion: selectedCanonical?.sourceVersion ? String(selectedCanonical.sourceVersion) : undefined,
                    idempotencyKey: `admin_roster:${actionKey}:${selectedUserId}:${Date.now()}`,
                }),
            });
            const result = await response.json().catch(() => ({})) as { error?: string };
            if (!response.ok) {
                throw new Error(result.error || "Agreement action failed.");
            }
            await Promise.all([refreshRoster(), refreshSelectedDetail(), refreshAgreementTemplate()]);
            toast.success(actionKey === "send_updated_agreement" ? "Updated agreement sent." : actionKey === "countersign_agreement" ? "Agreement countersigned." : "Agreement sent.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Admin creator agreement action failed",
                error,
                detail: {
                    adminView: "creator_roster_agreement_document",
                    action: actionKey,
                    userId: selectedUserId,
                },
                consoleLabel: "[Admin Roster] agreement action failed",
            });
            toast.error(getAdminRosterSafeErrorMessage(error, "Agreement action failed."));
        } finally {
            setAgreementSaving(null);
        }
    };

    const handleAgreementTemplateSubmit = async (actionKey: "create_template" | "activate_template") => {
        if (creatorMutationDisabled) {
            return;
        }

        try {
            setAgreementSaving(actionKey);
            const formData = new FormData();
            formData.set("action", actionKey);
            formData.set("agreementVersion", agreementTemplateForm.agreementVersion);
            formData.set("agreementTitle", agreementTemplateForm.agreementTitle);
            formData.set("agreementSource", agreementTemplateForm.agreementSource);
            formData.set("summaryBullets", agreementTemplateForm.summaryBullets);
            formData.set("supersedesVersion", agreementTemplateForm.supersedesVersion);
            if (agreementTemplateFile) {
                formData.set("agreementFile", agreementTemplateFile);
            }

            const response = await authFetch("/api/admin/creator-agreements", {
                method: "POST",
                body: formData,
            });
            const result = await response.json().catch(() => ({})) as { error?: string; activeTemplate?: CreatorAgreementTemplateAdminView };
            if (!response.ok) {
                throw new Error(result.error || "Agreement template update failed.");
            }
            const nextTemplate = result.activeTemplate ?? await refreshAgreementTemplate();
            setAgreementTemplate(nextTemplate);
            setAgreementTemplateFile(null);
            toast.success(actionKey === "activate_template" ? "Agreement template activated." : "Agreement template saved.");
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "error",
                message: "Admin creator agreement template update failed",
                error,
                detail: {
                    adminView: "creator_roster_agreement_templates",
                    action: actionKey,
                },
                consoleLabel: "[Admin Roster] agreement template update failed",
            });
            toast.error(getAdminRosterSafeErrorMessage(error, "Agreement template update failed."));
        } finally {
            setAgreementSaving(null);
        }
    };

    const handleViewAgreement = () => {
        if (selectedCanonical?.legalDocumentUrl) {
            window.open(selectedCanonical.legalDocumentUrl, "_blank", "noopener,noreferrer");
            return;
        }
        if (agreementTemplate?.agreementSource === "uploaded_pdf_snapshot" || agreementTemplate?.agreementSource === "hybrid") {
            window.open(`/api/admin/creator-agreements?download=1&templateId=${encodeURIComponent(agreementTemplate.templateId)}`, "_blank", "noopener,noreferrer");
            return;
        }
    };

    const handleSectionToggle = (sectionKey: RosterDetailSectionKey, open: boolean) => {
        setExpandedSections((current) => ({ ...current, [sectionKey]: open }));
        if (open) {
            trackEvent("admin_creator_section_expanded", buildTelemetryPayload({
                actionKey: "admin_creator_section_expanded",
                sectionKey,
            }));
            if (sectionKey === "audit_trail") {
                trackEvent("admin_creator_audit_trail_opened", buildTelemetryPayload({
                    actionKey: "admin_creator_audit_trail_opened",
                    sectionKey,
                }));
            }
            if (sectionKey === "fan_experience_settings") {
                trackEvent("admin_creator_experience_settings_opened", buildTelemetryPayload({
                    actionKey: "admin_creator_experience_settings_opened",
                    sectionKey,
                }));
            }
        }
    };

    const handleAuditEventExpanded = (entry: CreatorOnboardingHistoryEntry) => {
        trackEvent("admin_creator_audit_event_expanded", {
            ...buildTelemetryPayload({
                actionKey: "admin_creator_audit_event_expanded",
                sectionKey: "audit_trail",
            }),
            eventType: entry.eventType,
            eventTimestamp: entry.timestamp,
            agreementVersion: entry.agreementVersion ?? "",
        });
    };

    const rosterDebugMetadata = {
        rosterMode: "decision_queue",
        selectedTab: tab,
        selectedCreatorId: selectedUserId ?? "",
        primaryAction: selectedPrimaryAction,
        collapsedSections: collapsedSections.join(","),
        ownerControlsVisible: Boolean(isOwner && expandedSections.owner_controls),
        actorMarkerPresent: true,
        actorType: isOwner ? "owner_admin" : "admin",
        performedAs: selectedUserId ? "admin_on_behalf" : "own_account",
        activeAgreementVersion: agreementTemplate?.agreementVersion ?? "",
        activeAgreementHash: agreementTemplate?.agreementHash ?? "",
        selectedCreatorAgreementVersion: selectedAgreementVersion,
        selectedCreatorAgreementHash: selectedAgreementHash,
        dispatchStatus: selectedAgreementDispatchStatus ?? "",
        signatureEvidenceComplete: Boolean(selectedAgreementHash && selectedCanonical?.creatorSignatureStatus === "signature_signed" && selectedCanonical?.adminSignatureStatus === "signature_signed"),
        priorAgreementPreserved: Boolean(selectedCanonical?.agreementDispatchId && selectedAgreementHash),
        requiresResign: selectedCanonical?.creatorSignatureStatus === "signature_pending" && selectedCanonical?.contractDocumentStatus === "contract_sent",
        normalizedFromLegacy: selectedVisibleStatus?.debug.normalizedFromLegacy === true,
        canonicalSourceUsed: selectedVisibleStatus?.debug.canonicalSourceUsed === true,
        projectionSourceUsed: selectedVisibleStatus?.debug.projectionSourceUsed === true,
        rawStatusValues: selectedVisibleStatus ? JSON.stringify(selectedVisibleStatus.debug.rawStatusValues) : "",
        visibleStatusLabels: selectedVisibleStatus ? JSON.stringify(selectedVisibleStatus.visibleStatusLabels) : "",
        queueMaterializedAt: selectedEntry?.queueMaterializedAt ?? 0,
        queueBucket: selectedEntry?.queueBucket ?? "",
        sourceOnboardingUpdatedAt: selectedEntry?.sourceOnboardingUpdatedAt ?? selectedCanonical?.updatedAt ?? 0,
        projectionLagMs: selectedEntry?.projectionLagMs ?? 0,
        queueParityOk: selectedEntry?.queueParityOk === true,
        queueParityDelta: JSON.stringify(selectedEntry?.queueParityDelta ?? []),
        creatorLaneWarnings: selectedCreatorLaneWarnings.join(", "),
        creatorLaneParityStatus: selectedCreatorLaneWarnings.length > 0 ? "needs_review" : "ok",
        accountControlsVisible: Boolean(expandedSections.account_controls),
        ...viewAsDebug,
        syntheticCreatorMarkerPresent: Boolean(selectedCanonical?.isSyntheticCreator || detail?.user.isSyntheticCreator || detail?.user.adminViewAsDebug?.syntheticCreatorMarkerPresent),
        viewAsReturnHref: viewAsDebug.viewAsReturnHref || detail?.user.adminViewAsDebug?.viewAsReturnHref || "",
        destructiveActionsBlockedInViewAs: viewAsDebug.destructiveActionsBlockedInViewAs || detail?.user.adminViewAsDebug?.destructiveActionsBlockedInViewAs === true,
        lastAdminAccountActionAt: detail?.user.adminAccountControlDebug?.lastAdminAccountActionAt ?? 0,
        lastAdminAccountActionBy: detail?.user.adminAccountControlDebug?.lastAdminAccountActionBy ?? "",
        accountControlWarnings: detail?.user.adminAccountControlDebug?.accountControlWarnings?.join(", ") ?? "",
        passwordActionMode: detail?.user.adminAccountControlDebug?.passwordActionMode ?? "",
        emailUpdateServerConfirmed: detail?.user.adminAccountControlDebug?.emailUpdateServerConfirmed === true,
        roleUpdateServerConfirmed: detail?.user.adminAccountControlDebug?.roleUpdateServerConfirmed === true,
        fanExperienceSettingsVisible: Boolean(expandedSections.fan_experience_settings),
        creatorSettingsSource: detail?.user.creatorFanExperienceSettingsDebug?.creatorSettingsSource ?? "",
        settingsNormalized: detail?.user.creatorFanExperienceSettingsDebug?.settingsNormalized === true,
        settingsValidationWarnings: detail?.user.creatorFanExperienceSettingsDebug?.settingsValidationWarnings?.join(", ") ?? "",
        lastSettingsUpdatedAt: detail?.user.creatorFanExperienceSettingsDebug?.lastSettingsUpdatedAt ?? 0,
        lastSettingsUpdatedBy: detail?.user.creatorFanExperienceSettingsDebug?.lastSettingsUpdatedBy ?? "",
        changedKeys: detail?.user.creatorFanExperienceSettingsDebug?.changedKeys?.join(", ") ?? "",
    };

    return (
        <main className="min-h-screen bg-black px-4 pb-24 pt-24 text-white sm:px-6" data-roster-mode="decision_queue" data-admin-debug-metadata={JSON.stringify(rosterDebugMetadata)}>
            <PageViewEvent eventName="admin_roster_viewed" eventParams={{ component_name: "admin_roster_page", roster_mode: "decision_queue", actorMarkerPresent: true, actorType: isOwner ? "owner_admin" : "admin", performedAs: "own_account" }} />
            <div className="mx-auto max-w-7xl">
                <AdminPageHeader
                    eyebrow="Creator Operations"
                    title="Creator Review"
                    subtitle="Review applications, send agreements, verify identity, and activate approved creators."
                    compact
                    actions={(
                        <div className="flex max-w-full flex-wrap gap-1 rounded-2xl border border-white/10 bg-zinc-950/80 p-1" role="tablist" aria-label="Creator review views">
                            {ROSTER_DECISION_TABS.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === item.key}
                                    onClick={() => handleTabChange(item.key)}
                                    className={`min-h-10 rounded-full px-3 text-sm font-semibold transition-colors ${tab === item.key ? "bg-white text-black" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                />
                {creatorMutationDisabled ? (
                    <div
                        className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-zinc-200"
                        data-admin-roster-fixture-boundary="true"
                        data-admin-roster-fixture-state="source_missing"
                    >
                        <span className="font-bold text-white">source_missing fixture.</span> source_missing: creator roster source is not loaded in this fixture. Protected reads and writes stay blocked until verified admin access provides the source.
                    </div>
                ) : null}
                <section className="grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Needs admin</p>
                                <p className="mt-2 text-2xl font-black text-white">{isLocalAdminUiTestSession ? "No source" : entriesByDecision.needs_review.length}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">Creators waiting for your next action.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Waiting on creator</p>
                                <p className="mt-2 text-2xl font-black text-white">{isLocalAdminUiTestSession ? "No source" : entriesByDecision.waiting.length}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">Agreement, ID, or intake steps still missing.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Live creators</p>
                                <p className="mt-2 text-2xl font-black text-white">{isLocalAdminUiTestSession ? "No source" : roster?.summary.creatorCount ?? approvedLiveCreators.length}</p>
                                <p className="mt-1 text-xs leading-5 text-zinc-400">Approved creators with active access.</p>
                            </div>
                        </div>

                        {tab !== "create" ? (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-white">{ROSTER_DECISION_TABS.find((item) => item.key === tab)?.label}</h2>
                                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                                            Each row shows the next decision needed. Open a creator only when you need the full record.
                                        </p>
                                    </div>
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search name or email"
                                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60 sm:max-w-xs"
                                    />
                                </div>

                                {loading ? (
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-sm text-zinc-400">Loading creator roster...</div>
                                ) : tab === "approved" ? (
                                    <div className="mt-4 space-y-3">
                                        {visibleDecisionEntries.length === 0 && approvedLiveCreators.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-5 text-sm text-zinc-400">
                                                {isLocalAdminUiTestSession ? "No approved creator source is loaded in local UI review." : "No approved creators match this view right now."}
                                            </div>
                                        ) : visibleDecisionEntries.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => handleOpenCreatorRecord(entry.uid)}
                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/50 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white">{entry.creatorDisplayName}</p>
                                                        <p className="mt-1 truncate text-sm text-zinc-400">{formatApprovalStatus(entry.approvalStatus, entry.role)} - {entry.email}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                                                        Review
                                                        <ChevronRight className="h-4 w-4 text-brand-purple" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        {approvedLiveCreators.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => handleOpenCreatorRecord(entry.uid)}
                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/50 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white">{entry.displayName}</p>
                                                        <p className="mt-1 truncate text-sm text-zinc-400">@{entry.username || "creator"} - {entry.email}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                                                        Open
                                                        <ChevronRight className="h-4 w-4 text-brand-purple" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {visibleDecisionEntries.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-5 text-sm text-zinc-400">
                                                {isLocalAdminUiTestSession ? "No creator decision queue source is loaded in local UI review." : "No creators match this decision queue right now."}
                                            </div>
                                        ) : visibleDecisionEntries.map((entry) => (
                                            <button
                                                key={entry.uid}
                                                type="button"
                                                onClick={() => handleOpenCreatorRecord(entry.uid)}
                                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedUserId === entry.uid ? "border-brand-purple/50 bg-brand-purple/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white">{entry.creatorDisplayName}</p>
                                                        <p className="mt-1 truncate text-sm text-zinc-400">{buildStage(entry)} - {entry.email}</p>
                                                        <p className="mt-1 text-xs text-zinc-500">{countRealBlockers(entry)} review notes</p>
                                                        {(entry.creatorLaneWarnings ?? []).length > 0 ? (
                                                            <p className="mt-1 text-xs font-semibold text-brand-purple">
                                                                {(entry.creatorLaneWarnings ?? []).slice(0, 2).join(" / ")}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
                                                        <span>{buildPrimaryActionLabel(entry)}</span>
                                                        <ChevronRight className="h-4 w-4 text-brand-purple" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                                <div className="flex items-center gap-2 text-lg font-black text-white">
                                    <PlusCircle className="h-5 w-5 text-brand-purple" />
                                    Create
                                </div>
                                <p className="mt-2 text-sm leading-6 text-gray-400">
                                    Direct creation supports either a draft intake shell or a live creator path with owner-controlled compliance bypass.
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <input value={createCreatorForm.displayName} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Name" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.email} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.handle} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, handle: event.target.value }))} placeholder="Handle" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.platform} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, platform: event.target.value }))} placeholder="Platform" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.contentType} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, contentType: event.target.value }))} placeholder="Content type" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <input value={createCreatorForm.password} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" type="password" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none" />
                                    <label className="space-y-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Creator path</span>
                                        <select value={createCreatorForm.creatorPath} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, creatorPath: event.target.value as CreateCreatorFormState["creatorPath"] }))} disabled={!isOwner} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none disabled:opacity-60">
                                            <option value="intake">Draft intake shell</option>
                                            {isOwner ? <option value="live_override">Live creator path</option> : null}
                                        </select>
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Compliance path</span>
                                        <select value={createCreatorForm.compliancePath} onChange={(event) => setCreateCreatorForm((current) => ({ ...current, compliancePath: event.target.value as CreateCreatorFormState["compliancePath"] }))} disabled={!isOwner} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none disabled:opacity-60">
                                            <option value="required">Require compliance intake</option>
                                            {isOwner ? <option value="bypass">Bypass compliance intake</option> : null}
                                        </select>
                                    </label>
                                    {createCreatorForm.creatorPath === "live_override" ? (
                                        <textarea
                                            value={createCreatorForm.ownerOverrideReason}
                                            onChange={(event) => setCreateCreatorForm((current) => ({ ...current, ownerOverrideReason: event.target.value }))}
                                            rows={3}
                                            placeholder="Internal owner override reason"
                                            className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none sm:col-span-2"
                                        />
                                    ) : null}
                                </div>
                                {!isOwner ? (
                                    <p className="mt-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs leading-6 text-zinc-300">
                                        Direct creator creation is available to all admins, but live creator path and compliance bypass stay owner-only because they bypass standard onboarding locks.
                                    </p>
                                ) : null}
                                {isOwner ? (
                                    <SyntheticCreatorCreateFields
                                        value={{
                                            isSyntheticCreator: createCreatorForm.isSyntheticCreator,
                                            syntheticCreatorType: createCreatorForm.syntheticCreatorType,
                                            syntheticReason: createCreatorForm.syntheticReason,
                                            humanOperatorRequired: createCreatorForm.humanOperatorRequired,
                                        }}
                                        onChange={(nextSyntheticValue) => setCreateCreatorForm((current) => ({
                                            ...current,
                                            ...nextSyntheticValue,
                                        }))}
                                    />
                                ) : null}
                                <div className="mt-4 flex justify-end">
                                    <button type="button" onClick={() => void handleCreateCreator()} disabled={creatorMutationDisabled || creating} className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
                                        {creatorMutationDisabled ? "Create needs admin" : creating ? "Creating..." : "Create account"}
                                    </button>
                                </div>
                                <details className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("agreement_templates", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Agreement templates</summary>
                                    <div className="mt-4 space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Current creator agreement version</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{agreementTemplate?.agreementVersion || "No active template loaded"}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Document title</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{agreementTemplate?.agreementTitle || DEFAULT_AGREEMENT_TEMPLATE_FORM.agreementTitle}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Full document available</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatBoolean(Boolean(agreementTemplate?.fullDocumentAvailable))}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Agreement hash available</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatBoolean(Boolean(agreementTemplate?.agreementHashAvailable))}</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <input value={agreementTemplateForm.agreementVersion} onChange={(event) => setAgreementTemplateForm((current) => ({ ...current, agreementVersion: event.target.value }))} placeholder="Agreement version" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60" />
                                            <input value={agreementTemplateForm.agreementTitle} onChange={(event) => setAgreementTemplateForm((current) => ({ ...current, agreementTitle: event.target.value }))} placeholder="Document title" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60" />
                                            <label className="space-y-2">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Agreement source</span>
                                                <select value={agreementTemplateForm.agreementSource} onChange={(event) => setAgreementTemplateForm((current) => ({ ...current, agreementSource: event.target.value as CreatorAgreementSource }))} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60">
                                                    <option value="native_full_text">Native full text</option>
                                                    <option value="uploaded_pdf_snapshot">Uploaded PDF</option>
                                                    <option value="hybrid">Uploaded source plus app summary</option>
                                                </select>
                                            </label>
                                            <input value={agreementTemplateForm.supersedesVersion} onChange={(event) => setAgreementTemplateForm((current) => ({ ...current, supersedesVersion: event.target.value }))} placeholder="Supersedes version" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60" />
                                            <label className="space-y-2 sm:col-span-2">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Upload or replace agreement source</span>
                                                <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" onChange={(event) => setAgreementTemplateFile(event.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black" />
                                            </label>
                                            <textarea value={agreementTemplateForm.summaryBullets} onChange={(event) => setAgreementTemplateForm((current) => ({ ...current, summaryBullets: event.target.value }))} rows={4} placeholder="Summary bullets, one per line" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60 sm:col-span-2" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={() => void handleAgreementTemplateSubmit("create_template")} disabled={creatorMutationDisabled || agreementSaving === "create_template"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Save template source</button>
                                            <button type="button" onClick={() => void handleAgreementTemplateSubmit("activate_template")} disabled={creatorMutationDisabled || !isOwner || agreementSaving === "activate_template"} className="rounded-full border border-brand-purple/40 bg-brand-purple/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Mark as active for new creators</button>
                                        </div>
                                        {!isOwner ? (
                                            <p className="text-xs leading-5 text-zinc-500">Only the primary owner can activate a template for new creators.</p>
                                        ) : null}
                                        <details className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <summary className="cursor-pointer list-none text-sm font-semibold text-white">Preview active agreement</summary>
                                            <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
                                                {CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.map((section) => (
                                                    <div key={section.heading}>
                                                        <p className="font-semibold text-white">{section.heading}</p>
                                                        <p className="mt-1">{section.body}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                        {!selectedUserId ? (
                            <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/25 px-6 text-center text-sm leading-7 text-zinc-400">
                                Select a creator to review their next step, agreement status, ID status, and audit trail.
                            </div>
                        ) : detailLoading ? (
                            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-black/25 px-6 text-sm text-zinc-400">
                                Loading creator record...
                            </div>
                        ) : !selectedCanonical ? (
                            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-black/25 px-6 text-sm text-zinc-400">
                                Creator detail is unavailable for this account.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-purple">Review step</p>
                                            <h2 className="mt-2 text-2xl font-black text-white">{selectedCanonical.creatorDisplayName}</h2>
                                            <p className="mt-2 text-sm leading-6 text-zinc-200">{getCreatorOnboardingStatusSummary(selectedCanonical).summary}</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{selectedPrimaryAction}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedReviewHref ? (
                                                <Link href={selectedReviewHref} className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white">
                                                    Focus link
                                                </Link>
                                            ) : null}
                                            {selectedAdminHref ? (
                                                <Link href={selectedAdminHref} className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-semibold text-white">
                                                    Open user record
                                                </Link>
                                            ) : null}
                                            <AdminCreatorViewAsControls
                                                targetUserId={selectedUserId}
                                                displayName={selectedCanonical.creatorDisplayName}
                                                username={selectedCanonical.username}
                                                syntheticCreatorType={selectedSyntheticCreatorType}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {!selectedCanonical.introAcknowledgedAt ? (
                                            <p className="text-sm text-zinc-300">Creator still needs to acknowledge the intro before review can move forward.</p>
                                        ) : null}
                                        {(selectedCanonical.idVerificationStatus === "id_not_requested" || selectedCanonical.idVerificationStatus === "id_rejected") ? (
                                            <button type="button" onClick={() => handlePrimaryActionClick("request_id", { kycDueAt: Date.now() + (7 * 24 * 60 * 60 * 1000) }, "request-id")} disabled={creatorMutationDisabled || saving === "request-id"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Request ID upload</button>
                                        ) : null}
                                        {selectedCanonical.contractDocumentStatus !== "contract_sent" && selectedCanonical.introAcknowledgedAt ? (
                                            <button type="button" onClick={() => void handleCreatorAgreementAction("send_agreement")} disabled={creatorMutationDisabled || agreementSaving === "send_agreement"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Send agreement</button>
                                        ) : null}
                                        {selectedCanonical.creatorSignatureStatus === "signature_signed" && selectedCanonical.adminSignatureStatus !== "signature_signed" ? (
                                            <button type="button" onClick={() => void handleCreatorAgreementAction("countersign_agreement")} disabled={creatorMutationDisabled || agreementSaving === "countersign_agreement"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Countersign agreement</button>
                                        ) : null}
                                        {(selectedCanonical.readyForApproval || selectedCanonical.ownerOverrideActive) ? (
                                            <button type="button" onClick={() => handlePrimaryActionClick("approve_creator", {}, "approve")} disabled={creatorMutationDisabled || saving === "approve"} className="rounded-full bg-brand-purple px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Approve creator</button>
                                        ) : null}
                                        <button type="button" onClick={() => void submitCreatorAction("request_changes", {}, "return")} disabled={creatorMutationDisabled || saving === "return"} className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Return for changes</button>
                                        <button type="button" onClick={() => void submitCreatorAction("reject_creator", {}, "reject")} disabled={creatorMutationDisabled || saving === "reject"} className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-50">Reject application</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Intake</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatIntakeStatus(selectedCanonical)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Agreement</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatAgreementStatus(selectedCanonical)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">ID</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatIdStatus(selectedCanonical.idVerificationStatus)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Approval</p>
                                        <p className="mt-2 text-sm font-bold text-white">{formatApprovalStatus(selectedCanonical.approvalStatus, selectedCanonical.role)}</p>
                                    </div>
                                </div>

                                {selectedCanonical.isSyntheticCreator ? (
                                    <div className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-3 text-sm leading-6 text-zinc-200">
                                        <p className="font-bold text-white">Synthetic creator</p>
                                        <p className="mt-1">Internal QA and creator experience actions require an admin operator.</p>
                                    </div>
                                ) : null}

                                {selectedCreatorLaneWarnings.length > 0 ? (
                                    <div className="rounded-2xl border border-brand-purple/25 bg-black/25 p-3 text-sm leading-6 text-zinc-200">
                                        <p className="font-bold text-white">Needs review</p>
                                        <div className="mt-2 space-y-1">
                                            {selectedCreatorLaneWarnings.map((warning) => (
                                                <p key={warning}>{warning}</p>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {selectedAccountTarget && creatorMutationDisabled ? (
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-200">
                                        permission_blocked: account controls require verified admin access.
                                    </div>
                                ) : selectedAccountTarget ? (
                                    <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("account_controls", event.currentTarget.open)}>
                                        <summary className="cursor-pointer list-none text-sm font-bold text-white">Account controls</summary>
                                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                                            Update profile, access, and notification settings. Login and role changes require confirmation and stay in the audit trail.
                                        </p>
                                        <CreatorAccountControlsPanel
                                            target={selectedAccountTarget}
                                            isOwner={isOwner}
                                            savingAction={accountSaving ?? saving}
                                            onSubmit={handleAccountControlSubmit}
                                            onApprovalStatusChange={handleAccountApprovalStatusChange}
                                        />
                                    </details>
                                ) : null}

                                {selectedFanExperienceTarget && creatorMutationDisabled ? (
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-200">
                                        permission_blocked: fan-experience settings require verified admin access.
                                    </div>
                                ) : selectedFanExperienceTarget ? (
                                    <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("fan_experience_settings", event.currentTarget.open)}>
                                        <summary className="cursor-pointer list-none text-sm font-bold text-white">Fan experience settings</summary>
                                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                                            Update Fan Pass, private chat, custom requests, live time, and creator restrictions. Pricing and pauses are validated before saving.
                                        </p>
                                        <CreatorFanExperienceSettingsPanel
                                            target={selectedFanExperienceTarget}
                                            saving={fanExperienceSaving}
                                            onSubmit={handleFanExperienceSettingsSubmit}
                                        />
                                    </details>
                                ) : null}

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("agreement_document", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Agreement document</summary>
                                    <div className="mt-4 space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Current agreement version</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{selectedAgreementVersion || "Not set"}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Document title</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{selectedAgreementTitle}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Last sent</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatTimestamp(selectedCanonical.legalDocumentSentAt)}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Creator signature</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{deriveCreatorVisibleStatus(selectedCanonical).visibleStatusLabels.creatorSignatureStatus}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Admin countersign</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{deriveCreatorVisibleStatus(selectedCanonical).visibleStatusLabels.adminSignatureStatus}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Full document available</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatBoolean(Boolean(selectedCanonical.legalDocumentUrl || agreementTemplate?.fullDocumentAvailable || CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.length > 0))}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Agreement hash available</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatBoolean(Boolean(selectedAgreementHash || agreementTemplate?.agreementHashAvailable))}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Source</p>
                                                <p className="mt-2 text-sm font-semibold text-white">{formatAgreementSource(selectedAgreementSource)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedCanonical.legalDocumentUrl || agreementTemplate?.agreementSource === "uploaded_pdf_snapshot" || agreementTemplate?.agreementSource === "hybrid") ? (
                                                <button type="button" onClick={handleViewAgreement} className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white">Open agreement source</button>
                                            ) : null}
                                            <button type="button" onClick={() => void handleCreatorAgreementAction("send_agreement")} disabled={creatorMutationDisabled || agreementSaving === "send_agreement"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Send agreement</button>
                                            <button type="button" onClick={() => void handleCreatorAgreementAction("send_updated_agreement")} disabled={creatorMutationDisabled || agreementSaving === "send_updated_agreement"} className="rounded-full border border-brand-purple/40 bg-brand-purple/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Send updated agreement</button>
                                            <button type="button" onClick={() => void handleCreatorAgreementAction("countersign_agreement")} disabled={creatorMutationDisabled || agreementSaving === "countersign_agreement" || selectedCanonical.creatorSignatureStatus !== "signature_signed"} className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Countersign agreement</button>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-sm font-semibold text-white">Plain-language agreement summary</p>
                                            <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                                                {(agreementTemplate?.summaryBullets?.length ? agreementTemplate.summaryBullets : CREATOR_CONTRACT_SUMMARY_BULLETS).map((bullet) => <p key={bullet}>- {bullet}</p>)}
                                            </div>
                                        </div>
                                        <details className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <summary className="cursor-pointer list-none text-sm font-semibold text-white">View full native agreement</summary>
                                            <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
                                                {CREATOR_MASTER_SERVICE_AGREEMENT_SECTIONS.map((section) => (
                                                    <div key={section.heading}>
                                                        <p className="font-semibold text-white">{section.heading}</p>
                                                        <p className="mt-1">{section.body}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                </details>

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("id_files", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">ID files</summary>
                                    <div className="mt-4 space-y-4">
                                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">KYC due</p>
                                            <p className="mt-2 text-sm font-semibold text-white">{formatTimestamp(selectedCanonical.kycDueAt)}</p>
                                            <p className="mt-1 text-xs text-zinc-500">{selectedEntry?.idDocumentCount ?? 0} of 4 files uploaded.</p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {[
                                                { label: "Front of ID", side: "front", fileName: selectedEntry?.idDocumentFrontFileName },
                                                { label: "Back of ID", side: "back", fileName: selectedEntry?.idDocumentBackFileName },
                                                { label: "Face with ID", side: "face_with_id", fileName: selectedEntry?.idDocumentFaceFileName },
                                                { label: "Video with ID", side: "video_with_id", fileName: selectedEntry?.idDocumentVideoFileName },
                                            ].map((document) => (
                                                <div key={document.side} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{document.label}</p>
                                                    <p className="mt-2 text-sm font-semibold text-white">{document.fileName || "Not uploaded"}</p>
                                                    {document.fileName ? (
                                                        <a href={`/api/admin/user/${selectedUserId}/creator-onboarding/id-document?side=${document.side}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-brand-purple">
                                                            Open file
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </details>

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("audit_trail", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Audit trail</summary>
                                    <CreatorAuditTrailPanel history={selectedHistory} onEventExpanded={handleAuditEventExpanded} />
                                </details>

                                <details className="rounded-2xl border border-white/10 bg-black/25 p-4" onToggle={(event) => handleSectionToggle("admin_notes", event.currentTarget.open)}>
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white">Admin notes</summary>
                                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">
                                        {selectedCanonical.adminNotes || "No admin notes recorded."}
                                    </div>
                                    {selectedCanonical.blockingReasons.length > 0 ? (
                                        <div className="mt-3 space-y-2 text-sm text-zinc-300">
                                            {selectedCanonical.blockingReasons.map((reason) => {
                                                const detailReason = describeCreatorOnboardingBlockingReason(reason);
                                                return <p key={reason}>- {detailReason.label}</p>;
                                            })}
                                        </div>
                                    ) : null}
                                </details>

                                {isOwner ? (
                                    <details className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-4" onToggle={(event) => handleSectionToggle("owner_controls", event.currentTarget.open)}>
                                        <summary className="cursor-pointer list-none text-sm font-bold text-white">Owner controls</summary>
                                        <p className="mt-3 text-sm leading-6 text-zinc-200">
                                            Owner override can bypass KYC, legal, approval, and role-activation locks. The reason stays internal and still writes to the audit trail.
                                        </p>
                                        <textarea
                                            value={ownerOverrideReason}
                                            onChange={(event) => setOwnerOverrideReason(event.target.value)}
                                            rows={3}
                                            placeholder="Internal override reason"
                                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/60"
                                        />
                                        <div className="mt-3 flex flex-wrap gap-3">
                                            <button type="button" onClick={() => void submitCreatorAction("apply_owner_override", { reason: ownerOverrideReason }, "owner-override-on")} disabled={creatorMutationDisabled || saving === "owner-override-on"} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-50">Apply owner override</button>
                                            <button type="button" onClick={() => void submitCreatorAction("clear_owner_override", {}, "owner-override-off")} disabled={creatorMutationDisabled || saving === "owner-override-off"} className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Clear override</button>
                                        </div>
                                    </details>
                                ) : null}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
