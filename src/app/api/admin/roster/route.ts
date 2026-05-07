import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/server/firebase-admin";
import { normalizeCreatorApplication } from "@/lib/creator-application";
import { DEFAULT_CREATOR_RESTRICTIONS, DEFAULT_CREATOR_SETTINGS, CREATOR_COLLECTIONS, isCreatorRole } from "@/lib/creator-experiences";
import type {
    CreatorAgreementDispatchStatus,
    CreatorAgreementSource,
} from "@/lib/creator-agreement-documents";
import {
    buildCreatorOnboardingCanonicalRecord,
    type CreatorOnboardingBlockingReason,
    type CreatorOnboardingApprovalStatus,
    type CreatorContractDocumentStatus,
    type CreatorContractSignatureStatus,
    type CreatorOnboardingIdStatus,
    type CreatorOnboardingLegalStatus,
    type CreatorOnboardingSegmentStatus,
    type CreatorOnboardingSubmissionStatus,
    type CreatorReviewQueueBucket,
} from "@/lib/creator-onboarding";
import { handleApiError } from "@/lib/server/auth";
import { CREATOR_MASTER_SERVICE_AGREEMENT_VERSION, DEFAULT_CREATOR_TEMPLATE_ID, DEFAULT_CREATOR_TEMPLATE_LABEL } from "@/lib/creator-contract";
import {
    buildCreatorOnboardingHistoryEntry,
    buildCreatorOnboardingStatusChangeHistoryEntries,
    ensureCreatorOnboardingSubmission,
    CREATOR_REVIEW_QUEUE_COLLECTION,
    isCreatorOwnerEmail,
    PRIMARY_CREATOR_OWNER_EMAIL,
    recordCreatorOnboardingHistoryEntries,
    syncCreatorOnboardingDocuments,
} from "@/lib/server/creator-onboarding";
import { trackServerEvent } from "@/lib/server/analytics";
import { ADMIN } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import { generateUniqueUsernameSuggestion } from "@/lib/server/username-suggestions";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
    actorMarkerToTelemetryPayload,
    assertKnownActor,
    buildAdminOnBehalfMarker,
    type ActorMarker,
} from "@/lib/identity/actor-markers";
import {
    buildSyntheticCreatorMarker,
    normalizeSyntheticLegalEvidenceMode,
    normalizeSyntheticCreatorType,
    sanitizeSyntheticReason,
    type SyntheticLegalEvidenceMode,
    type SyntheticCreatorType,
} from "@/lib/admin/synthetic-creators-view-as";
import { deriveCreatorVisibleStatus } from "@/lib/creator-onboarding-projection";
import {
    buildCreatorLaneRosterWarnings,
    type CreatorLaneRosterWarning,
} from "@/lib/server/creator-onboarding-diagnostics";

// Legacy projection read boundary: roster payloads may normalize
// users/{uid}.creatorApplication only as fallback/debug context. Review queue
// materialization and creator_onboarding remain the admin lifecycle truth.
type RosterRole = "user" | "creator" | "admin";
type RosterStatus = "active" | "suspended" | "banned";

type RosterEntry = {
    uid: string;
    displayName: string;
    email: string;
    username: string;
    photoURL: string | null;
    role: RosterRole;
    status: RosterStatus;
    isSyntheticCreator?: boolean;
    syntheticCreatorType?: SyntheticCreatorType;
    syntheticCreatedByUid?: string;
    syntheticCreatedAt?: number;
    syntheticReason?: string;
    humanOperatorRequired?: boolean;
    publicDisclosureMode?: string;
    syntheticLegalEvidenceMode?: SyntheticLegalEvidenceMode;
    isVerified: boolean;
    createdAt: number;
};

const ADMIN_ROSTER_USER_LIMIT = 5_000;
const ADMIN_ROSTER_CREATOR_OPS_LIMIT = 5_000;
const ADMIN_ROSTER_QUEUE_LIMIT = 1_000;

type CreatorReviewQueueRosterEntry = RosterEntry & {
    creatorDisplayName: string;
    queueBucket: CreatorReviewQueueBucket;
    queuePosition: number;
    submissionStatus: CreatorOnboardingSubmissionStatus;
    approvalStatus: CreatorOnboardingApprovalStatus;
    legalStatus: CreatorOnboardingLegalStatus;
    idVerificationStatus: CreatorOnboardingIdStatus;
    segmentationStatus: CreatorOnboardingSegmentStatus;
    contractDocumentStatus: CreatorContractDocumentStatus;
    creatorSignatureStatus: CreatorContractSignatureStatus;
    adminSignatureStatus: CreatorContractSignatureStatus;
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
    blockingReasons: CreatorOnboardingBlockingReason[];
    introAcknowledgedAt?: number;
    ownerOverrideActive?: boolean;
    isSyntheticCreator?: boolean;
    syntheticCreatorType?: SyntheticCreatorType;
    syntheticCreatedByUid?: string;
    syntheticCreatedAt?: number;
    syntheticReason?: string;
    humanOperatorRequired?: boolean;
    publicDisclosureMode?: string;
    syntheticLegalEvidenceMode?: SyntheticLegalEvidenceMode;
    readyForApproval: boolean;
    creatorReviewQueueVisible: boolean;
    submittedAt: number;
    updatedAt: number;
    legalDocumentUrl?: string;
    legalDocumentSentAt?: number;
    contractVersion?: string;
    agreementTemplateId?: string;
    agreementTitle?: string;
    agreementHash?: string;
    agreementSource?: CreatorAgreementSource;
    agreementDispatchId?: string;
    agreementDispatchStatus?: CreatorAgreementDispatchStatus;
    segmentLabel?: string;
    idDocumentFileName?: string;
    idDocumentFrontFileName?: string;
    idDocumentBackFileName?: string;
    idDocumentFrontContentType?: string;
    idDocumentBackContentType?: string;
    idDocumentFaceFileName?: string;
    idDocumentVideoFileName?: string;
    idDocumentFaceContentType?: string;
    idDocumentVideoContentType?: string;
    idDocumentCount: number;
    creatorTemplateId?: string;
    creatorTemplateLabel?: string;
    kycDueAt?: number;
    reapplyAvailableAt?: number;
    adminNotes?: string;
    reviewedBy?: string;
    primaryAction?: string;
    rosterBucket?: "needs_review" | "waiting" | "approved";
    visibleStatusLabels?: ReturnType<typeof deriveCreatorVisibleStatus>["visibleStatusLabels"];
    normalizedProjectionDebug?: ReturnType<typeof deriveCreatorVisibleStatus>["debug"];
    queueMaterializedAt?: number;
    sourceOnboardingUpdatedAt?: number;
    projectionLagMs?: number;
    queueParityOk?: boolean;
    queueParityDelta?: Array<Record<string, unknown>>;
    ownerOverrideReason?: string;
    creatorLaneWarnings?: CreatorLaneRosterWarning[];
};

type CreatorOpsAggregate = {
    followerCount: number;

    notificationsEnabledCount: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
    pendingPayouts: number;
    openThreads: number;
    pendingDropSubmissions: number;
    totalAccruedGd: number;
    pendingCashoutGd: number;
};

function toTimestampNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        value
        && typeof value === "object"
        && "toMillis" in value
        && typeof (value as { toMillis: () => number }).toMillis === "function"
    ) {
        return (value as { toMillis: () => number }).toMillis();
    }

    return 0;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown) {
    return value === true;
}

function readStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];
}

function buildEmptyCreatorOpsAggregate(): CreatorOpsAggregate {
    return {
        followerCount: 0,

        notificationsEnabledCount: 0,
        activeSubscribers: 0,
        openRequests: 0,
        bookedCalls: 0,
        pendingPayouts: 0,
        openThreads: 0,
        pendingDropSubmissions: 0,
        totalAccruedGd: 0,
        pendingCashoutGd: 0,
    };
}

function serializeRosterEntry(id: string, raw: Record<string, unknown>): RosterEntry {
    return {
        uid: id,
        displayName: readString(raw.displayName) || "Unknown user",
        email: readString(raw.email),
        username: readString(raw.username),
        photoURL: typeof raw.photoURL === "string" ? raw.photoURL : null,
        role: raw.role === "creator" || raw.role === "admin" || raw.role === "user" ? raw.role : "user",
        status: raw.status === "suspended" || raw.status === "banned" || raw.status === "active" ? raw.status : "active",
        isSyntheticCreator: raw.isSyntheticCreator === true,
        syntheticCreatorType: raw.isSyntheticCreator === true ? normalizeSyntheticCreatorType(raw.syntheticCreatorType) : undefined,
        syntheticCreatedByUid: readString(raw.syntheticCreatedByUid) || undefined,
        syntheticCreatedAt: toTimestampNumber(raw.syntheticCreatedAt) || undefined,
        syntheticReason: readString(raw.syntheticReason) || undefined,
        humanOperatorRequired: raw.isSyntheticCreator === true ? raw.humanOperatorRequired !== false : undefined,
        publicDisclosureMode: readString(raw.publicDisclosureMode) || undefined,
        syntheticLegalEvidenceMode: raw.isSyntheticCreator === true
            ? normalizeSyntheticLegalEvidenceMode(raw.syntheticLegalEvidenceMode)
            : undefined,
        isVerified: raw.isVerified === true,
        createdAt: toTimestampNumber(raw.createdAt),
    };
}

function serializeQueueEntry(
    raw: Record<string, unknown>,
    user: RosterEntry | undefined,
    creatorApplication: ReturnType<typeof normalizeCreatorApplication> | undefined,
    userRaw: Record<string, unknown> | undefined,
): CreatorReviewQueueRosterEntry | null {
    const uid = readString(raw.userId) || user?.uid || "";
    const creatorDisplayName = readString(raw.creatorDisplayName);
    if (!uid || !creatorDisplayName) {
        return null;
    }

    const entry: CreatorReviewQueueRosterEntry = {
        uid,
        displayName: user?.displayName || readString(raw.displayName) || creatorDisplayName,
        email: readString(raw.email) || user?.email || "",
        username: readString(raw.username) || user?.username || "",
        photoURL: typeof raw.photoURL === "string" ? raw.photoURL : user?.photoURL ?? null,
        role: user?.role ?? (raw.role === "creator" || raw.role === "admin" || raw.role === "user" ? raw.role : "user"),
        status: user?.status ?? "active",
        isSyntheticCreator: raw.isSyntheticCreator === true || user?.isSyntheticCreator === true,
        syntheticCreatorType: raw.isSyntheticCreator === true || user?.isSyntheticCreator === true
            ? normalizeSyntheticCreatorType(raw.syntheticCreatorType || user?.syntheticCreatorType)
            : undefined,
        syntheticCreatedByUid: readString(raw.syntheticCreatedByUid) || user?.syntheticCreatedByUid,
        syntheticCreatedAt: toTimestampNumber(raw.syntheticCreatedAt) || user?.syntheticCreatedAt,
        syntheticReason: readString(raw.syntheticReason) || user?.syntheticReason,
        isVerified: user?.isVerified ?? false,
        createdAt: user?.createdAt ?? 0,
        creatorDisplayName,
        queueBucket: raw.queueBucket === "waiting_on_legal"
            || raw.queueBucket === "waiting_on_id"
            || raw.queueBucket === "ready_for_approval"
            || raw.queueBucket === "needs_changes"
            || raw.queueBucket === "rejected"
            || raw.queueBucket === "approved"
            ? raw.queueBucket
            : "newest_submissions",
        queuePosition: typeof raw.queuePosition === "number" && Number.isFinite(raw.queuePosition)
            ? Math.trunc(raw.queuePosition)
            : 0,
        submissionStatus: raw.submissionStatus === "onboarding_started"
            || raw.submissionStatus === "onboarding_submitted"
            || raw.submissionStatus === "awaiting_manual_review"
            ? raw.submissionStatus
            : "awaiting_manual_review",
        approvalStatus: raw.approvalStatus === "creator_approved"
            || raw.approvalStatus === "creator_rejected"
            || raw.approvalStatus === "creator_needs_changes"
            ? raw.approvalStatus
            : "creator_pending",
        legalStatus: raw.legalStatus === "legal_sent" || raw.legalStatus === "legal_signed"
            ? raw.legalStatus
            : "legal_pending",
        idVerificationStatus: raw.idVerificationStatus === "id_requested"
            || raw.idVerificationStatus === "id_submitted"
            || raw.idVerificationStatus === "id_verified"
            || raw.idVerificationStatus === "id_rejected"
            ? raw.idVerificationStatus
            : "id_not_requested",
        segmentationStatus: raw.segmentationStatus === "segment_assigned"
            ? "segment_assigned"
            : "segment_unassigned",
        contractDocumentStatus: raw.contractDocumentStatus === "contract_sent" ? "contract_sent" : "contract_not_sent",
        creatorSignatureStatus: raw.creatorSignatureStatus === "signature_signed" ? "signature_signed" : "signature_pending",
        adminSignatureStatus: raw.adminSignatureStatus === "signature_signed" ? "signature_signed" : "signature_pending",
        creatorPrimaryPlatform: readString(raw.creatorPrimaryPlatform) || undefined,
        creatorContentFocus: readString(raw.creatorContentFocus) || undefined,
        blockingReasons: readStringArray(raw.blockingReasons) as CreatorOnboardingBlockingReason[],
        introAcknowledgedAt: toTimestampNumber(raw.introAcknowledgedAt) || undefined,
        ownerOverrideActive: raw.ownerOverrideActive === true,
        ownerOverrideReason: readString(raw.ownerOverrideReason) || undefined,
        humanOperatorRequired: raw.humanOperatorRequired === false ? false : raw.isSyntheticCreator === true ? true : user?.humanOperatorRequired,
        publicDisclosureMode: readString(raw.publicDisclosureMode) || user?.publicDisclosureMode,
        syntheticLegalEvidenceMode: raw.isSyntheticCreator === true || user?.isSyntheticCreator === true
            ? normalizeSyntheticLegalEvidenceMode(raw.syntheticLegalEvidenceMode || user?.syntheticLegalEvidenceMode)
            : undefined,
        readyForApproval: readBoolean(raw.readyForApproval),
        creatorReviewQueueVisible: raw.creatorReviewQueueVisible !== false,
        submittedAt: toTimestampNumber(raw.submittedAt),
        updatedAt: toTimestampNumber(raw.updatedAt),
        legalDocumentUrl: readString(raw.legalDocumentUrl) || undefined,
        legalDocumentSentAt: toTimestampNumber(raw.legalDocumentSentAt) || undefined,
        contractVersion: readString(raw.contractVersion) || undefined,
        agreementTemplateId: readString(raw.agreementTemplateId) || undefined,
        agreementTitle: readString(raw.agreementTitle) || undefined,
        agreementHash: readString(raw.agreementHash) || undefined,
        agreementSource: raw.agreementSource === "uploaded_pdf_snapshot" || raw.agreementSource === "hybrid" || raw.agreementSource === "native_full_text"
            ? raw.agreementSource
            : undefined,
        agreementDispatchId: readString(raw.agreementDispatchId) || undefined,
        agreementDispatchStatus: raw.agreementDispatchStatus === "sent" || raw.agreementDispatchStatus === "viewed" || raw.agreementDispatchStatus === "signed" || raw.agreementDispatchStatus === "superseded"
            ? raw.agreementDispatchStatus
            : undefined,
        segmentLabel: readString(raw.segmentLabel) || undefined,
        idDocumentFileName: readString(raw.idDocumentFileName)
            || creatorApplication?.idDocument?.fileName
            || undefined,
        idDocumentFrontFileName: readString(raw.idDocumentFrontFileName)
            || creatorApplication?.idDocuments?.front?.fileName
            || ((!creatorApplication?.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0)
                ? creatorApplication?.idDocument?.fileName
                : undefined)
            || undefined,
        idDocumentBackFileName: readString(raw.idDocumentBackFileName)
            || creatorApplication?.idDocuments?.back?.fileName
            || undefined,
        idDocumentFaceFileName: readString(raw.idDocumentFaceFileName)
            || creatorApplication?.idDocuments?.face_with_id?.fileName
            || undefined,
        idDocumentVideoFileName: readString(raw.idDocumentVideoFileName)
            || creatorApplication?.idDocuments?.video_with_id?.fileName
            || undefined,
        idDocumentFrontContentType: readString(raw.idDocumentFrontContentType)
            || creatorApplication?.idDocuments?.front?.contentType
            || ((!creatorApplication?.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0)
                ? creatorApplication?.idDocument?.contentType
                : undefined)
            || undefined,
        idDocumentBackContentType: readString(raw.idDocumentBackContentType)
            || creatorApplication?.idDocuments?.back?.contentType
            || undefined,
        idDocumentFaceContentType: readString(raw.idDocumentFaceContentType)
            || creatorApplication?.idDocuments?.face_with_id?.contentType
            || undefined,
        idDocumentVideoContentType: readString(raw.idDocumentVideoContentType)
            || creatorApplication?.idDocuments?.video_with_id?.contentType
            || undefined,
        idDocumentCount: typeof raw.idDocumentCount === "number" && Number.isFinite(raw.idDocumentCount)
            ? Math.max(0, Math.trunc(raw.idDocumentCount))
            : [
                creatorApplication?.idDocuments?.front ?? ((!creatorApplication?.idDocuments || Object.keys(creatorApplication.idDocuments).length === 0) ? creatorApplication?.idDocument : undefined),
                creatorApplication?.idDocuments?.back,
                creatorApplication?.idDocuments?.face_with_id,
                creatorApplication?.idDocuments?.video_with_id,
            ]
                .filter(Boolean)
                .length,
        creatorTemplateId: readString(raw.creatorTemplateId) || undefined,
        creatorTemplateLabel: readString(raw.creatorTemplateLabel) || undefined,
        kycDueAt: toTimestampNumber(raw.kycDueAt) || undefined,
        reapplyAvailableAt: toTimestampNumber(raw.reapplyAvailableAt) || undefined,
        adminNotes: readString(raw.adminNotes) || undefined,
        reviewedBy: readString(raw.reviewedBy) || undefined,
        queueMaterializedAt: toTimestampNumber(raw.queueMaterializedAt) || undefined,
        sourceOnboardingUpdatedAt: toTimestampNumber(raw.sourceOnboardingUpdatedAt) || undefined,
        projectionLagMs: typeof raw.projectionLagMs === "number" && Number.isFinite(raw.projectionLagMs)
            ? Math.max(0, Math.trunc(raw.projectionLagMs))
            : undefined,
        queueParityOk: raw.queueParityOk === true ? true : raw.queueParityOk === false ? false : undefined,
        queueParityDelta: Array.isArray(raw.queueParityDelta)
            ? raw.queueParityDelta.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
            : undefined,
    };

    const visibleStatus = deriveCreatorVisibleStatus(entry, {
        source: {
            ...raw,
            userId: uid,
        },
        context: {
            source: creatorApplication ? "legacy" : "projection",
        },
    });

    return {
        ...entry,
        primaryAction: visibleStatus.primaryAction,
        rosterBucket: visibleStatus.rosterBucket,
        visibleStatusLabels: visibleStatus.visibleStatusLabels,
        normalizedProjectionDebug: visibleStatus.debug,
        creatorLaneWarnings: buildCreatorLaneRosterWarnings({
            entry,
            userRaw,
        }),
    };
}

function matchesQuery(entry: RosterEntry, query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    return entry.displayName.toLowerCase().includes(normalizedQuery)
        || entry.email.toLowerCase().includes(normalizedQuery)
        || entry.username.toLowerCase().includes(normalizedQuery)
        || entry.uid.toLowerCase().includes(normalizedQuery);
}

async function GET_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/roster",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        if (!adminDb) {
            return NextResponse.json({ error: "Database not available" }, { status: 500 });
        }

        const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
        const [
            usersSnapshot,
            creatorRelationshipsSnap,
            creatorSubscriptionsSnap,
            creatorRequestsSnap,
            creatorBookingsSnap,
            creatorPayoutsSnap,
            creatorThreadsSnap,
            creatorAccrualsSnap,
            pendingCreatorDropsSnap,
            initialQueueSnapshot,
        ] = await Promise.all([
            adminDb.collection("users").orderBy("createdAt", "desc").limit(ADMIN_ROSTER_USER_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.relationships).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.subscriptions).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.requests).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.bookings).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.messageThreads).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).limit(ADMIN_ROSTER_CREATOR_OPS_LIMIT).get(),
            adminDb.collection("drops").where("approvalStatus", "==", "pending_review").limit(ADMIN_ROSTER_QUEUE_LIMIT).get(),
            adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).orderBy("submittedAt", "desc").limit(ADMIN_ROSTER_QUEUE_LIMIT).get(),
        ]);

        const dataLimitWarnings = [
            usersSnapshot.size >= ADMIN_ROSTER_USER_LIMIT ? "User roster sample reached the admin read cap." : null,
            creatorRelationshipsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator relationship sample reached the admin read cap." : null,
            creatorSubscriptionsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator subscription sample reached the admin read cap." : null,
            creatorRequestsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator request sample reached the admin read cap." : null,
            creatorBookingsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator booking sample reached the admin read cap." : null,
            creatorPayoutsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator payout sample reached the admin read cap." : null,
            creatorThreadsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator thread sample reached the admin read cap." : null,
            creatorAccrualsSnap.size >= ADMIN_ROSTER_CREATOR_OPS_LIMIT ? "Creator accrual sample reached the admin read cap." : null,
            pendingCreatorDropsSnap.size >= ADMIN_ROSTER_QUEUE_LIMIT ? "Pending creator drop sample reached the admin read cap." : null,
            initialQueueSnapshot.size >= ADMIN_ROSTER_QUEUE_LIMIT ? "Creator review queue sample reached the admin read cap." : null,
        ].filter((entry): entry is string => Boolean(entry));

        const userDocs = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            raw: doc.data() as Record<string, unknown>,
        }));
        const allUsers = userDocs.map((doc) => serializeRosterEntry(doc.id, doc.raw));
        const userMap = new Map(allUsers.map((entry) => [entry.uid, entry]));
        const userRawMap = new Map(userDocs.map((doc) => [doc.id, doc.raw] as const));
        const creatorApplicationMap = new Map(
            userDocs.map((doc) => [doc.id, normalizeCreatorApplication(doc.raw.creatorApplication)] as const),
        );
        const queueIds = new Set(initialQueueSnapshot.docs.map((doc) => doc.id));
        const repairCandidates = userDocs
            .map((doc) => ({
                id: doc.id,
                raw: doc.raw,
                creatorApplication: normalizeCreatorApplication(doc.raw.creatorApplication),
            }))
            .filter((entry) => entry.creatorApplication)
            .filter((entry) => !queueIds.has(entry.id));

        if (repairCandidates.length > 0) {
            const repairResults = await Promise.allSettled(repairCandidates.map((entry) => {
                const marker = assertKnownActor(buildAdminOnBehalfMarker(
                    buildRosterActor({
                        uid: caller?.uid,
                        email: caller?.email,
                        isOwner: isCreatorOwnerEmail(caller?.email),
                    }),
                    entry.id,
                    {
                        surface: "admin_roster",
                        route: "/api/admin/roster",
                        actionKey: "legacy_creator_queue_backfill",
                        source: "admin_roster_get",
                        performedAs: "admin_on_behalf",
                        targetCreatorId: entry.id,
                    },
                ));

                return ensureCreatorOnboardingSubmission({
                    userId: entry.id,
                    email: typeof entry.raw.email === "string" ? entry.raw.email : null,
                    displayName: typeof entry.raw.displayName === "string" ? entry.raw.displayName : entry.creatorApplication?.creatorDisplayName,
                    username: typeof entry.raw.username === "string" ? entry.raw.username : null,
                    photoURL: typeof entry.raw.photoURL === "string" ? entry.raw.photoURL : null,
                    role: entry.raw.role === "creator" || entry.raw.role === "admin" || entry.raw.role === "user" ? entry.raw.role : "user",
                    createdAt: toTimestampNumber(entry.raw.createdAt),
                    creatorDisplayName: entry.creatorApplication?.creatorDisplayName || readString(entry.raw.displayName) || "Creator",
                    creatorPrimaryPlatform: entry.creatorApplication?.creatorPrimaryPlatform,
                    creatorContentFocus: entry.creatorApplication?.creatorContentFocus,
                    actor: buildCreatorOnboardingActorFromMarker(marker),
                });
            }));

            await Promise.allSettled(repairResults.map((result, index) => {
                const entry = repairCandidates[index];
                if (!entry) {
                    return Promise.resolve();
                }

                if (result.status === "rejected") {
                    return recordServerDiagnostic({
                        channel: "creator_onboarding",
                        severity: "error",
                        message: "Creator review queue backfill failed",
                        detail: {
                            userId: entry.id,
                            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                        },
                    });
                }

                if (!result.value.created) {
                    return Promise.resolve();
                }

                const marker = assertKnownActor(buildAdminOnBehalfMarker(
                    buildRosterActor({
                        uid: caller?.uid,
                        email: caller?.email,
                        isOwner: isCreatorOwnerEmail(caller?.email),
                    }),
                    entry.id,
                    {
                        surface: "admin_roster",
                        route: "/api/admin/roster",
                        actionKey: "legacy_creator_queue_backfill",
                        source: "admin_roster_get",
                        performedAs: "admin_on_behalf",
                        targetCreatorId: entry.id,
                    },
                ));

                return Promise.allSettled([
                    trackServerEvent("creator_admin_queue_materialized", {
                        page_path: "/admin/roster",
                        repair_source: "legacy_creator_application_projection",
                        ...actorMarkerToTelemetryPayload(marker),
                    }, entry.id),
                    recordServerDiagnostic({
                        channel: "creator_onboarding",
                        severity: "warn",
                        message: "Creator review queue was backfilled from a legacy creator projection",
                        detail: {
                            userId: entry.id,
                            creatorDisplayName: entry.creatorApplication?.creatorDisplayName || "Creator",
                        },
                    }),
                ]);
            }));
        }

        const queueSnapshot = repairCandidates.length > 0
            ? await adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).orderBy("submittedAt", "desc").limit(ADMIN_ROSTER_QUEUE_LIMIT).get()
            : initialQueueSnapshot;

        const creatorOpsByUser = new Map<string, CreatorOpsAggregate>();
        const readCreatorOps = (creatorId: string) => {
            const current = creatorOpsByUser.get(creatorId) ?? buildEmptyCreatorOpsAggregate();
            creatorOpsByUser.set(creatorId, current);
            return current;
        };

        creatorRelationshipsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }

            const current = readCreatorOps(creatorId);
            if (raw.following === true) {
                current.followerCount += 1;
            }

            if (raw.notificationsEnabled === true) {
                current.notificationsEnabledCount += 1;
            }
        });

        creatorSubscriptionsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "active") {
                readCreatorOps(creatorId).activeSubscribers += 1;
            }
        });

        creatorRequestsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "pending") {
                readCreatorOps(creatorId).openRequests += 1;
            }
        });

        creatorBookingsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "booked") {
                readCreatorOps(creatorId).bookedCalls += 1;
            }
        });

        creatorPayoutsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            if (raw.status === "pending") {
                const current = readCreatorOps(creatorId);
                current.pendingPayouts += 1;
                current.pendingCashoutGd += typeof raw.requestedGd === "number" ? Math.round(raw.requestedGd) : 0;
            }
        });

        creatorThreadsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            readCreatorOps(creatorId).openThreads += 1;
        });

        creatorAccrualsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            readCreatorOps(creatorId).totalAccruedGd += typeof raw.creatorShareGd === "number" ? Math.round(raw.creatorShareGd) : 0;
        });

        pendingCreatorDropsSnap.docs.forEach((doc) => {
            const raw = doc.data() as Record<string, unknown>;
            const creatorId = readString(raw.submittedByCreatorId) || readString(raw.creatorId);
            if (!creatorId) {
                return;
            }
            readCreatorOps(creatorId).pendingDropSubmissions += 1;
        });

        const rosterUsers = allUsers
            .filter((entry) => isCreatorRole(entry.role) || (entry.role === "admin" && entry.email.toLowerCase() === PRIMARY_CREATOR_OWNER_EMAIL))
            .sort((left, right) => {
                if (left.role !== right.role) {
                    return left.role === "admin" ? -1 : 1;
                }
                return left.displayName.localeCompare(right.displayName);
            });

        const creatorReviewQueue = queueSnapshot.docs
            .map((doc) => serializeQueueEntry(
                doc.data() as Record<string, unknown>,
                userMap.get(doc.id),
                creatorApplicationMap.get(doc.id),
                userRawMap.get(doc.id),
            ))
            .filter((entry): entry is CreatorReviewQueueRosterEntry => Boolean(entry))
            .filter((entry) => entry.creatorReviewQueueVisible)
            .sort((left, right) => right.submittedAt - left.submittedAt || right.updatedAt - left.updatedAt);

        const hiddenQueueUserIds = new Set(creatorReviewQueue.map((entry) => entry.uid));
        const rosterUserIds = new Set(rosterUsers.map((entry) => entry.uid));
        const creatorUsers = rosterUsers.filter((entry) => entry.role === "creator");
        const searchResults = query.length >= 2
            ? allUsers
                .filter((entry) => entry.role === "user")
                .filter((entry) => !rosterUserIds.has(entry.uid))
                .filter((entry) => !hiddenQueueUserIds.has(entry.uid))
                .filter((entry) => entry.status !== "banned")
                .filter((entry) => matchesQuery(entry, query))
                .slice(0, 8)
            : [];

        const creatorOpsValues = creatorUsers.map((entry) => creatorOpsByUser.get(entry.uid) ?? buildEmptyCreatorOpsAggregate());
        const summary = {
            creatorCount: creatorUsers.length,
            verifiedCreatorCount: creatorUsers.filter((entry) => entry.isVerified).length,
            activeCreatorCount: creatorUsers.filter((entry) => entry.status === "active").length,
            totalFollowers: creatorOpsValues.reduce((sum, entry) => sum + entry.followerCount, 0),

            totalAlertOptIns: creatorOpsValues.reduce((sum, entry) => sum + entry.notificationsEnabledCount, 0),
            activeSubscriptions: creatorOpsValues.reduce((sum, entry) => sum + entry.activeSubscribers, 0),
            openRequests: creatorOpsValues.reduce((sum, entry) => sum + entry.openRequests, 0),
            bookedCalls: creatorOpsValues.reduce((sum, entry) => sum + entry.bookedCalls, 0),
            pendingPayouts: creatorOpsValues.reduce((sum, entry) => sum + entry.pendingPayouts, 0),
            openThreads: creatorOpsValues.reduce((sum, entry) => sum + entry.openThreads, 0),
            pendingDropSubmissions: creatorOpsValues.reduce((sum, entry) => sum + entry.pendingDropSubmissions, 0),
            totalAccruedGd: creatorOpsValues.reduce((sum, entry) => sum + entry.totalAccruedGd, 0),
            pendingCashoutGd: creatorOpsValues.reduce((sum, entry) => sum + entry.pendingCashoutGd, 0),
            reviewQueueCount: creatorReviewQueue.length,
            readyForApprovalCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "ready_for_approval").length,
            waitingOnIdCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "waiting_on_id").length,
            waitingOnLegalCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "waiting_on_legal").length,
            needsChangesCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "needs_changes").length,
            rejectedCount: creatorReviewQueue.filter((entry) => entry.queueBucket === "rejected").length,
        };

        return NextResponse.json({
            success: true,
            rosterUsers,
            creatorReviewQueue,
            searchResults,
            creatorOpsByUser: Object.fromEntries(creatorOpsByUser),
            summary,
            dataLimitWarnings,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Roster.GET");
    }
}

function readRoleLabel(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : "Admin";
}

function buildRosterActor(input: {
    uid?: string | null;
    email?: string | null;
    isOwner: boolean;
}) {
    return {
        uid: input.uid,
        email: input.email,
        role: input.isOwner ? "owner_admin" : "admin",
        isAdmin: true,
        isOwner: input.isOwner,
    };
}

function buildCreatorOnboardingActorFromMarker(marker: ActorMarker) {
    return {
        id: marker.actorUid ?? marker.actorType,
        role: marker.actorType === "owner_admin" ? "owner_admin" as const : "admin" as const,
        label: marker.actorEmail ?? marker.actorUid ?? "Admin",
        marker,
    };
}

async function POST_handler(request: NextRequest) {
    try {
        const caller = await guardApiRequest(request, {
            routeName: "admin/roster",
            rateLimit: ADMIN,
            requireTrustedOrigin: true,
            auth: "admin",
        });

        if (!adminDb || !adminAuth) {
            return NextResponse.json({ error: "Database or auth not available" }, { status: 500 });
        }

        const body = await request.json().catch(() => ({})) as Record<string, unknown>;
        const displayName = readString(body.displayName);
        const email = readString(body.email).toLowerCase();
        const preferredUsername = readString(body.handle);
        const creatorPrimaryPlatform = readString(body.platform);
        const creatorContentFocus = readString(body.contentType);
        const password = readString(body.password);
        const creatorPath = body.creatorPath === "live_override" ? "live_override" : "intake";
        const compliancePath = body.compliancePath === "bypass" ? "bypass" : "required";
        const ownerOverrideReason = readString(body.ownerOverrideReason)
            || (creatorPath === "live_override" ? "Direct creator creation owner override" : "");
        const isOwnerActor = isCreatorOwnerEmail(caller?.email);
        const isSyntheticCreator = body.isSyntheticCreator === true;
        const syntheticReason = sanitizeSyntheticReason(body.syntheticReason);

        if (
            displayName.length < 2
            || email.length < 5
            || creatorPrimaryPlatform.length < 2
            || creatorContentFocus.length < 2
            || password.length < 6
        ) {
            return NextResponse.json({ error: "Enter name, email, platform, handle, content type, and a password." }, { status: 400 });
        }

        if ((creatorPath === "live_override" || compliancePath === "bypass") && !isOwnerActor) {
            return NextResponse.json({
                error: "Only the primary owner can bypass creator onboarding locks during direct creator creation.",
            }, { status: 403 });
        }

        if (isSyntheticCreator && !isOwnerActor) {
            return NextResponse.json({
                error: "Only the primary owner can create synthetic creators.",
            }, { status: 403 });
        }

        if (creatorPath === "live_override" && ownerOverrideReason.length < 8) {
            return NextResponse.json({
                error: "Enter an internal owner override reason before creating a live creator path directly.",
            }, { status: 400 });
        }

        if (isSyntheticCreator && syntheticReason.length < 8) {
            return NextResponse.json({
                error: "Enter an internal reason before creating a synthetic creator.",
            }, { status: 400 });
        }

        const username = await generateUniqueUsernameSuggestion({
            preferredUsername,
            displayName,
            email,
            uid: "pending-direct-creator",
        });
        const nowMs = Date.now();
        const authUser = await adminAuth.createUser({
            email,
            password,
            displayName,
            emailVerified: false,
            disabled: false,
        });
        const syntheticMarker = isSyntheticCreator
            ? buildSyntheticCreatorMarker({
                syntheticCreatorType: body.syntheticCreatorType,
                syntheticCreatedByUid: caller?.uid ?? "unknown_admin",
                syntheticCreatedAt: nowMs,
                syntheticReason,
                humanOperatorRequired: body.humanOperatorRequired,
            })
            : null;
        const directCreateMarker = assertKnownActor(buildAdminOnBehalfMarker(
            buildRosterActor({
                uid: caller?.uid,
                email: caller?.email,
                isOwner: isOwnerActor,
            }),
            authUser.uid,
            {
                surface: "admin_roster",
                route: "/api/admin/roster",
                actionKey: creatorPath === "live_override" ? "admin_creator_created_live_override" : "admin_creator_created_intake",
                source: "admin_roster_post",
                performedAs: creatorPath === "live_override" || compliancePath === "bypass"
                    ? "owner_override"
                    : "admin_on_behalf",
                targetCreatorId: authUser.uid,
            },
        ));

        const role = creatorPath === "live_override" ? "creator" : "user";
        const userRef = adminDb.collection("users").doc(authUser.uid);
        await userRef.set({
            uid: authUser.uid,
            email,
            displayName,
            username,
            role,
            creator: role === "creator",
            status: "active",
            isVerified: false,
            gumDropsBalance: 0,
            gumDropsPurchasedBalance: 0,
            gumDropsRewardBalance: 0,
            unlockedContent: [],
            unlockedContentTimestamps: {},
            following: [],

            creatorNotificationPreferences: {},
            creatorSettings: DEFAULT_CREATOR_SETTINGS,
            creatorRestrictions: DEFAULT_CREATOR_RESTRICTIONS,
            ...(syntheticMarker ?? {}),
            createdAt: nowMs,
        }, { merge: true });

        const submission = await ensureCreatorOnboardingSubmission({
            userId: authUser.uid,
            email,
            displayName,
            username,
            photoURL: null,
            role,
            createdAt: nowMs,
            creatorDisplayName: displayName,
            creatorPrimaryPlatform,
            creatorContentFocus,
            nowMs,
            actor: {
                ...buildCreatorOnboardingActorFromMarker(directCreateMarker),
            },
        });

        const onboardingRef = adminDb.collection("creator_onboarding").doc(authUser.uid);
        const latestOnboardingSnap = await onboardingRef.get();
        const currentCanonical = submission.canonical;
        const latestCanonical = buildCreatorOnboardingCanonicalRecord({
            userId: authUser.uid,
            email,
            username,
            displayName,
            photoURL: null,
            role,
            createdAt: nowMs,
            queuePosition: currentCanonical.queuePosition,
            creatorDisplayName: displayName,
            creatorPrimaryPlatform,
            creatorContentFocus,
            nowMs,
            source: latestOnboardingSnap.data() as Record<string, unknown> | undefined,
        });

        await adminDb.runTransaction(async (transaction) => {
            const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId: authUser.uid,
                email,
                username,
                displayName,
                photoURL: null,
                role: creatorPath === "live_override" ? "creator" : role,
                createdAt: nowMs,
                queuePosition: latestCanonical.queuePosition,
                creatorDisplayName: displayName,
                creatorPrimaryPlatform,
                creatorContentFocus,
                nowMs,
                source: {
                    ...latestCanonical,
                    introAcknowledgedAt: nowMs,
                    introAcknowledgedVersion: "creator_intro_2026_v1",
                    introAcknowledgedByUid: authUser.uid,
                    introAcknowledgedByName: displayName,
                    creatorTemplateId: DEFAULT_CREATOR_TEMPLATE_ID,
                    creatorTemplateLabel: DEFAULT_CREATOR_TEMPLATE_LABEL,
                    ownerOverrideActive: creatorPath === "live_override",
                    ownerOverrideReason: creatorPath === "live_override" ? ownerOverrideReason : undefined,
                    ownerOverrideAt: creatorPath === "live_override" ? nowMs : undefined,
                    ownerOverrideBy: creatorPath === "live_override" ? readRoleLabel(caller?.email ?? caller?.uid) : undefined,
                    ...(syntheticMarker ?? {}),
                    idVerificationStatus: compliancePath === "bypass" ? "id_verified" : "id_requested",
                    idVerificationRequestedAt: nowMs,
                    idVerificationSubmittedAt: compliancePath === "bypass" ? nowMs : undefined,
                    idVerificationReviewedAt: compliancePath === "bypass" ? nowMs : undefined,
                    contractDocumentStatus: compliancePath === "bypass" ? "contract_sent" : "contract_not_sent",
                    creatorSignatureStatus: compliancePath === "bypass" ? "signature_signed" : "signature_pending",
                    adminSignatureStatus: compliancePath === "bypass" ? "signature_signed" : "signature_pending",
                    legalDocumentSentAt: compliancePath === "bypass" ? nowMs : undefined,
                    creatorContractSignedAt: compliancePath === "bypass" ? nowMs : undefined,
                    creatorContractSignedByName: compliancePath === "bypass" ? displayName : undefined,
                    adminContractSignedAt: compliancePath === "bypass" ? nowMs : undefined,
                    adminContractSignedByName: compliancePath === "bypass" ? readRoleLabel(caller?.email ?? caller?.uid) : undefined,
                    approvalStatus: creatorPath === "live_override" ? "creator_approved" : "creator_pending",
                    updatedAt: nowMs,
                },
            });

            syncCreatorOnboardingDocuments(transaction, {
                userId: authUser.uid,
                displayName,
                canonical: nextCanonical,
            });

            const statusHistoryEntries = buildCreatorOnboardingStatusChangeHistoryEntries({
                before: latestCanonical,
                after: nextCanonical,
                actor: {
                    ...buildCreatorOnboardingActorFromMarker(directCreateMarker),
                },
                timestamp: nowMs,
            });
            const syntheticHistoryEntries = syntheticMarker ? [{
                id: `synthetic_creator_created_${nowMs}`,
                entry: buildCreatorOnboardingHistoryEntry({
                    eventType: "synthetic_creator_created",
                    actor: {
                        ...buildCreatorOnboardingActorFromMarker(directCreateMarker),
                    },
                    timestamp: nowMs,
                    summary: "Synthetic creator created",
                    detail: syntheticReason,
                    metadata: {
                        syntheticCreatorType: syntheticMarker.syntheticCreatorType,
                        syntheticLegalEvidenceMode: syntheticMarker.syntheticLegalEvidenceMode,
                        humanOperatorRequired: syntheticMarker.humanOperatorRequired,
                    },
                    targetUserId: authUser.uid,
                    targetCreatorId: authUser.uid,
                }),
            }] : [];

            recordCreatorOnboardingHistoryEntries(
                transaction,
                authUser.uid,
                [...statusHistoryEntries, ...syntheticHistoryEntries],
            );
        });

        await Promise.allSettled([
            trackServerEvent("admin_creator_created_directly", {
            page_path: "/admin/roster",
            creator_path: creatorPath,
            compliance_path: compliancePath,
            onboarding_status: creatorPath === "live_override" ? "creator_approved" : "creator_pending",
            legal_status: compliancePath === "bypass" ? "legal_signed" : "legal_pending",
            agreement_version: latestCanonical.contractVersion ?? CREATOR_MASTER_SERVICE_AGREEMENT_VERSION,
            agreement_hash: latestCanonical.agreementHash ?? "",
            template_id: latestCanonical.agreementTemplateId ?? "",
            is_synthetic_creator: isSyntheticCreator,
            synthetic_creator_type: syntheticMarker?.syntheticCreatorType ?? "",
            ...actorMarkerToTelemetryPayload(directCreateMarker),
            }, authUser.uid),
            syntheticMarker ? trackServerEvent("admin_synthetic_creator_created", {
                page_path: "/admin/roster",
                syntheticCreatorType: syntheticMarker.syntheticCreatorType,
                synthetic_creator_type: syntheticMarker.syntheticCreatorType,
                synthetic_legal_evidence_mode: syntheticMarker.syntheticLegalEvidenceMode,
                humanOperatorRequired: syntheticMarker.humanOperatorRequired,
                reason: syntheticReason,
                ...actorMarkerToTelemetryPayload(directCreateMarker),
            }, authUser.uid) : Promise.resolve(undefined),
        ]).catch(() => undefined);

        return NextResponse.json({
            success: true,
            userId: authUser.uid,
            creatorPath,
            compliancePath,
            isSyntheticCreator,
            syntheticCreatorType: syntheticMarker?.syntheticCreatorType,
        });
    } catch (error) {
        return handleApiError(error, "Admin.Roster.POST");
    }
}

export let GET = withRouteRuntimeHealth("admin/roster:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/roster:POST", POST_handler);
