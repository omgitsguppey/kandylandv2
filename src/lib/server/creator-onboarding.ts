import "server-only";

import type { Transaction } from "firebase-admin/firestore";

import { PRIMARY_CREATOR_OWNER_EMAIL, isCreatorOwnerEmail } from "@/lib/creator-admin";
import {
    buildActorMarker,
    buildActorMarkerDebugFields,
    type ActorMarker,
} from "@/lib/identity/actor-markers";
import { adminDb } from "@/lib/server/firebase-admin";
import { normalizeCreatorApplication, resolveCreatorQueuePosition } from "@/lib/creator-application";
import {
    buildDefaultCreatorFanExperienceSettings,
    CREATOR_DEFAULT_BOOKING_UNAVAILABLE_REASON,
} from "@/lib/creator-experiences";
import { CREATOR_INTAKE_STEPS, type CreatorIntakeFields } from "@/lib/creator-intake-flow";
import { getActiveCreatorAgreementTemplate } from "@/lib/server/creator-agreement-templates";
import {
    buildCreatorOnboardingCanonicalRecord,
    buildCreatorOnboardingUserProjection,
    hasCreatorApprovalPrerequisites,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
    type CreatorOnboardingHistoryEventType,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import {
    CREATOR_ONBOARDING_COLLECTION,
    CREATOR_REVIEW_QUEUE_COLLECTION,
    materializeCreatorReviewQueueEntryForTransaction,
} from "@/lib/server/creator-review-queue";
import { mapLegacyCreatorApplicationToCanonical } from "@/lib/server/creator-onboarding-legacy-adapter";
import type { CreatorApplication, UserProfile } from "@/types/db";

export const CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION = "history";
export { CREATOR_ONBOARDING_COLLECTION, CREATOR_REVIEW_QUEUE_COLLECTION };

export type CreatorOnboardingActor = {
    id: string;
    role: "user" | "creator" | "admin" | "owner_admin" | "system";
    label: string;
    marker?: ActorMarker;
};

export { PRIMARY_CREATOR_OWNER_EMAIL, isCreatorOwnerEmail };

// Canonical bridge boundary: this server module is allowed to rebuild the
// users/{uid}.creatorApplication projection only after canonical
// creator_onboarding state is constructed. Do not add page-local projection
// writes or treat the user nested blob as lifecycle truth.
function stripUndefinedDeep<T>(value: T): T {
    if (value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map((entry) => stripUndefinedDeep(entry))
            .filter((entry) => entry !== undefined) as T;
    }

    if (!value || typeof value !== "object") {
        return value;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        return value;
    }

    const sanitizedEntries = Object.entries(value as Record<string, unknown>)
        .flatMap(([key, entry]) => {
            if (entry === undefined) {
                return [];
            }

            return [[key, stripUndefinedDeep(entry)]];
        });

    return Object.fromEntries(sanitizedEntries) as T;
}

function readString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function readOptionalTimestamp(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : undefined;
}

function readRole(value: unknown): UserProfile["role"] {
    return value === "creator" || value === "admin" || value === "user"
        ? value
        : "user";
}

function readMetadataString(metadata: Record<string, unknown> | undefined, ...keys: string[]) {
    if (!metadata) {
        return "";
    }

    for (const key of keys) {
        const value = metadata[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return "";
}

export function buildCreatorOnboardingHistoryEntry(input: {
    eventType: CreatorOnboardingHistoryEventType;
    actor: CreatorOnboardingActor;
    timestamp: number;
    summary: string;
    detail?: string;
    metadata?: Record<string, unknown>;
    targetUserId?: string;
    targetCreatorId?: string;
    agreementVersion?: string;
    agreementHash?: string;
    ip?: string | null;
    userAgent?: string | null;
}) {
    const metadata = input.actor.marker
        ? {
            ...(input.metadata ?? {}),
            ...buildActorMarkerDebugFields(input.actor.marker),
        }
        : input.metadata;

    return stripUndefinedDeep({
        eventType: input.eventType,
        actorId: input.actor.id,
        actorRole: input.actor.role,
        actorLabel: input.actor.label,
        timestamp: input.timestamp,
        summary: input.summary,
        detail: input.detail,
        metadata,
        actorMarker: input.actor.marker,
        targetUserId: readString(input.targetUserId)
            || input.actor.marker?.targetUserId
            || readMetadataString(metadata, "targetUserId", "target_user_id")
            || undefined,
        targetCreatorId: readString(input.targetCreatorId)
            || input.actor.marker?.targetCreatorId
            || readMetadataString(metadata, "targetCreatorId", "target_creator_id")
            || undefined,
        agreementVersion: readString(input.agreementVersion)
            || readMetadataString(metadata, "agreementVersion", "contractVersion")
            || undefined,
        agreementHash: readString(input.agreementHash)
            || readMetadataString(metadata, "agreementHash")
            || undefined,
        ip: readString(input.ip) || readMetadataString(metadata, "ip", "signerIp") || undefined,
        userAgent: readString(input.userAgent) || readMetadataString(metadata, "userAgent", "signerUserAgent") || undefined,
    } satisfies CreatorOnboardingHistoryEntry);
}

export function buildCreatorOnboardingInitialHistoryEntries(input: {
    actor: CreatorOnboardingActor;
    timestamp: number;
    intakeFields?: CreatorIntakeFields | null;
}) {
    return [
        {
            id: "intake_started",
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "intake_started",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator intake started",
                metadata: {
                    intakeVersion: input.intakeFields?.intakeVersion ?? null,
                    intakeSource: input.intakeFields?.intakeSource ?? null,
                },
            }),
        },
        ...CREATOR_INTAKE_STEPS.map((step) => ({
            id: `intake_step_completed_${step.key}`,
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "intake_step_completed" as const,
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator intake step completed",
                detail: step.title,
                metadata: {
                    stepKey: step.key,
                    intakeVersion: input.intakeFields?.intakeVersion ?? null,
                    intakeSource: input.intakeFields?.intakeSource ?? null,
                },
            }),
        })),
        {
            id: "intake_submitted",
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "intake_submitted",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator intake submitted",
                metadata: {
                    selectedGoals: input.intakeFields?.creatorMonetizationGoals ?? [],
                    creatorRecommendedSetup: input.intakeFields?.creatorRecommendedSetup ?? null,
                    intakeVersion: input.intakeFields?.intakeVersion ?? null,
                    intakeSource: input.intakeFields?.intakeSource ?? null,
                },
            }),
        },
        {
            id: "onboarding_started",
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "onboarding_started",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator onboarding started",
            }),
        },
        {
            id: "onboarding_submitted",
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "onboarding_submitted",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator onboarding submitted",
            }),
        },
        {
            id: "awaiting_manual_review",
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "awaiting_manual_review",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator onboarding is waiting for manual review",
            }),
        },
        {
            id: "admin_queue_materialized",
            entry: buildCreatorOnboardingHistoryEntry({
                eventType: "admin_queue_materialized",
                actor: {
                    id: "system",
                    role: "system",
                    label: "System",
                    marker: input.actor.marker
                        ? buildActorMarker({
                            actorType: "system",
                            actorUid: "system",
                            actorRole: "system",
                            targetUserId: input.actor.marker.targetUserId,
                            targetCreatorId: input.actor.marker.targetCreatorId,
                            performedAs: "system_job",
                            surface: input.actor.marker.surface,
                            route: "creator_onboarding/materializer",
                            actionKey: "admin_queue_materialized",
                            occurredAt: input.timestamp,
                            dedupeKey: `admin_queue_materialized:${input.actor.marker.targetUserId ?? input.actor.marker.targetCreatorId ?? "unknown"}`,
                            source: "creator_onboarding_materializer",
                        })
                        : undefined,
                },
                timestamp: input.timestamp,
                summary: "Creator review queue record materialized",
            }),
        },
    ] as const;
}

export function recordCreatorOnboardingHistoryEntries(
    transaction: Transaction,
    userId: string,
    entries: Array<{ id: string; entry: CreatorOnboardingHistoryEntry }>,
) {
    const historyCollection = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId).collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION);
    entries.forEach(({ id, entry }) => {
        transaction.set(historyCollection.doc(id), stripUndefinedDeep(entry), { merge: true });
    });
}

export type CreatorLifecycleHistoryGapRepairResult = {
    success: true;
    userId: string;
    eventType: Extract<CreatorOnboardingHistoryEventType, "id_requested">;
    dryRun: boolean;
    historyWritten: boolean;
    alreadyPresent: boolean;
    historyDocId: string;
    sourceStatus: "id_requested";
    originalSourceTimestamp: number;
    repairedAtUtc: string;
    approvalStatus: CreatorOnboardingCanonicalRecord["approvalStatus"];
    queueBucket: string | null;
    queueParityOk: boolean | null;
    doesNotChangeCreatorState: true;
};

export type CreatorDefaultSettingsRepairResult = {
    success: true;
    userId: string;
    dryRun: boolean;
    settingsWritten: boolean;
    alreadyPresent: boolean;
    historyWritten: boolean;
    historyDocId: string;
    normalizedBy: "admin_debug_self_heal";
    schemaVersion: number;
    bookingUnavailableReason: typeof CREATOR_DEFAULT_BOOKING_UNAVAILABLE_REASON;
    approvalStatus: CreatorOnboardingCanonicalRecord["approvalStatus"] | "unknown";
    userRole: UserProfile["role"] | "unknown";
    queueBucket: string | null;
    creatorExperienceActivityCount: number;
    syntheticCreator: boolean;
    repairedAtUtc: string;
    doesNotChangeApproval: true;
    doesNotOverwriteExistingSettings: true;
};

function readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function hasRecord(value: unknown) {
    return Boolean(readRecord(value));
}

export async function repairMissingLiveCreatorSettings(input: {
    userId: string;
    actor?: CreatorOnboardingActor;
    dryRun?: boolean;
    nowMs?: number;
    creatorExperienceActivityCount?: number;
}): Promise<CreatorDefaultSettingsRepairResult> {
    if (!adminDb) {
        throw new Error("Database not available");
    }

    const userId = readString(input.userId);
    if (!userId) {
        throw new Error("Creator user ID is required.");
    }

    const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
        ? Math.trunc(input.nowMs)
        : Date.now();
    const repairedAtUtc = new Date(nowMs).toISOString();
    const actor = input.actor ?? {
        id: "system_debug_repair",
        role: "system",
        label: "Debug parity repair",
    } satisfies CreatorOnboardingActor;
    const userRef = adminDb.collection("users").doc(userId);
    const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);
    const queueRef = adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(userId);
    const historyDocId = "debug_parity_default_settings_created";
    const historyRef = onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(historyDocId);

    return adminDb.runTransaction(async (transaction) => {
        const [userSnap, onboardingSnap, queueSnap, existingHistorySnap] = await transaction.getAll(
            userRef,
            onboardingRef,
            queueRef,
            historyRef,
        );
        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const queueData = (queueSnap.data() as Record<string, unknown> | undefined) ?? {};
        const userRole = readRole(userData.role);
        const approvalStatus = canonical?.approvalStatus ?? "unknown";
        const queueBucket = readString(queueData.queueBucket) || null;
        const creatorExperienceActivityCount = typeof input.creatorExperienceActivityCount === "number" && Number.isFinite(input.creatorExperienceActivityCount)
            ? Math.max(0, Math.trunc(input.creatorExperienceActivityCount))
            : 0;
        const liveCreator =
            userRole === "creator"
            || approvalStatus === "creator_approved"
            || queueBucket === "approved"
            || creatorExperienceActivityCount > 0;
        const syntheticCreator = userData.isSyntheticCreator === true
            || canonical?.isSyntheticCreator === true
            || queueData.isSyntheticCreator === true;

        if (!userSnap.exists) {
            throw new Error("Creator user profile is missing; default settings repair requires user source evidence.");
        }
        if (!liveCreator) {
            throw new Error("Default settings repair requires live/approved creator source evidence.");
        }

        const alreadyPresent = hasRecord(userData.creatorSettings);
        const defaultSettings = buildDefaultCreatorFanExperienceSettings(userId, {
            id: actor.id,
            role: actor.role,
            label: actor.label,
            normalizedBy: "admin_debug_self_heal",
            source: "creator_lane_debug_parity",
            nowMs,
        });
        const result: CreatorDefaultSettingsRepairResult = {
            success: true,
            userId,
            dryRun: input.dryRun !== false,
            settingsWritten: false,
            alreadyPresent,
            historyWritten: false,
            historyDocId,
            normalizedBy: "admin_debug_self_heal",
            schemaVersion: defaultSettings.schemaVersion,
            bookingUnavailableReason: CREATOR_DEFAULT_BOOKING_UNAVAILABLE_REASON,
            approvalStatus,
            userRole,
            queueBucket,
            creatorExperienceActivityCount,
            syntheticCreator,
            repairedAtUtc,
            doesNotChangeApproval: true,
            doesNotOverwriteExistingSettings: true,
        };

        if (result.dryRun || alreadyPresent) {
            return result;
        }

        const debugPatch = {
            creatorSettingsSource: "creator_lane_debug_parity",
            settingsNormalized: true,
            settingsValidationWarnings: [],
            lastSettingsUpdatedAt: nowMs,
            lastSettingsUpdatedBy: actor.id,
            changedKeys: ["creatorSettings"],
            normalizedBy: "admin_debug_self_heal",
            schemaVersion: defaultSettings.schemaVersion,
            defaultSettingsRepair: true,
            syntheticCreator,
            repairedAtUtc,
            doesNotChangeApproval: true,
        };

        transaction.set(userRef, stripUndefinedDeep({
            creatorSettings: defaultSettings,
            creatorFanExperienceSettingsDebug: debugPatch,
            updatedAt: nowMs,
            updatedBy: actor.id,
        }), { merge: true });
        transaction.set(onboardingRef, stripUndefinedDeep({
            creatorFanExperienceSettingsDebug: debugPatch,
        }), { merge: true });
        transaction.set(queueRef, stripUndefinedDeep({
            creatorFanExperienceSettingsDebug: debugPatch,
        }), { merge: true });

        if (!existingHistorySnap.exists) {
            transaction.set(historyRef, buildCreatorOnboardingHistoryEntry({
                eventType: "creator_default_settings_created",
                actor,
                timestamp: nowMs,
                summary: "Default fan experience settings created",
                detail: "Approved/live creator was missing normalized fan experience settings; safe defaults were created from canonical settings.",
                targetUserId: userId,
                targetCreatorId: userId,
                metadata: {
                    creatorId: userId,
                    userId,
                    repairReason: "missing_live_creator_settings",
                    source: "creator_lane_debug_parity",
                    provenance: "creator_lane_debug_parity",
                    normalizedBy: "admin_debug_self_heal",
                    schemaVersion: defaultSettings.schemaVersion,
                    bookingUnavailableReason: CREATOR_DEFAULT_BOOKING_UNAVAILABLE_REASON,
                    approvalStatus,
                    userRole,
                    queueBucket,
                    creatorExperienceActivityCount,
                    syntheticCreator,
                    repairedAtUtc,
                    doesNotChangeApproval: true,
                    doesNotOverwriteExistingSettings: true,
                },
            }), { merge: true });
        }

        return {
            ...result,
            settingsWritten: true,
            historyWritten: !existingHistorySnap.exists,
        };
    });
}

export async function repairCreatorLifecycleHistoryGap(input: {
    userId: string;
    missingHistoryEvent: Extract<CreatorOnboardingHistoryEventType, "id_requested">;
    sourceOnboardingUpdatedAt?: number | null;
    dryRun?: boolean;
    nowMs?: number;
}): Promise<CreatorLifecycleHistoryGapRepairResult> {
    if (!adminDb) {
        throw new Error("Database not available");
    }
    if (input.missingHistoryEvent !== "id_requested") {
        throw new Error("Only the canonical id_requested history repair is supported by this narrow debug parity path.");
    }

    const userId = readString(input.userId);
    if (!userId) {
        throw new Error("Creator user ID is required.");
    }

    const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
        ? Math.trunc(input.nowMs)
        : Date.now();
    const repairedAtUtc = new Date(nowMs).toISOString();
    const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);
    const queueRef = adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(userId);
    const historyDocId = "debug_parity_repair_id_requested";
    const historyRef = onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(historyDocId);

    return adminDb.runTransaction(async (transaction) => {
        const [onboardingSnap, queueSnap, existingHistorySnap] = await transaction.getAll(onboardingRef, queueRef, historyRef);
        const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        if (!canonical) {
            throw new Error("Canonical creator onboarding source is missing; history repair requires source evidence first.");
        }
        if (canonical.idVerificationStatus !== "id_requested") {
            throw new Error(`ID request history repair requires idVerificationStatus=id_requested; current status is ${canonical.idVerificationStatus}.`);
        }

        const queueData = queueSnap.exists ? queueSnap.data() as Record<string, unknown> : {};
        const sourceOnboardingUpdatedAt = readOptionalTimestamp(input.sourceOnboardingUpdatedAt)
            ?? canonical.idVerificationRequestedAt
            ?? canonical.updatedAt
            ?? nowMs;
        const result: CreatorLifecycleHistoryGapRepairResult = {
            success: true,
            userId,
            eventType: "id_requested",
            dryRun: input.dryRun !== false,
            historyWritten: false,
            alreadyPresent: existingHistorySnap.exists,
            historyDocId,
            sourceStatus: "id_requested",
            originalSourceTimestamp: sourceOnboardingUpdatedAt,
            repairedAtUtc,
            approvalStatus: canonical.approvalStatus,
            queueBucket: readString(queueData.queueBucket) || null,
            queueParityOk: typeof queueData.queueParityOk === "boolean" ? queueData.queueParityOk : null,
            doesNotChangeCreatorState: true,
        };

        if (result.dryRun || existingHistorySnap.exists) {
            return result;
        }

        transaction.set(historyRef, buildCreatorOnboardingHistoryEntry({
            eventType: "id_requested",
            actor: {
                id: "system_debug_repair",
                role: "system",
                label: "Debug parity repair",
            },
            timestamp: sourceOnboardingUpdatedAt,
            summary: "ID request history restored from source state",
            detail: "Creator source state had idVerificationStatus=id_requested but history was missing the matching lifecycle event.",
            targetUserId: userId,
            targetCreatorId: userId,
            metadata: {
                creatorId: userId,
                userId,
                repairReason: "missing_history_event",
                missingHistoryEvent: "id_requested",
                sourceStatus: "id_requested",
                sourceOnboardingUpdatedAt,
                approvalStatus: canonical.approvalStatus,
                queueBucket: result.queueBucket,
                queueParityOk: result.queueParityOk,
                provenance: "creator_lane_debug_parity",
                repairedAtUtc,
                originalSourceTimestamp: sourceOnboardingUpdatedAt,
                doesNotChangeCreatorState: true,
            },
        }), { merge: true });

        return {
            ...result,
            historyWritten: true,
        };
    });
}

export function buildCreatorOnboardingStatusChangeHistoryEntries(input: {
    before: CreatorOnboardingCanonicalRecord;
    after: CreatorOnboardingCanonicalRecord;
    actor: CreatorOnboardingActor;
    timestamp: number;
}) {
    const entries: Array<{ id: string; entry: CreatorOnboardingHistoryEntry }> = [];
    const addEntry = (
        eventType: CreatorOnboardingHistoryEventType,
        summary: string,
        detail?: string,
        metadata?: Record<string, unknown>,
    ) => {
        entries.push({
            id: `${eventType}_${input.timestamp}`,
            entry: buildCreatorOnboardingHistoryEntry({
                eventType,
                actor: input.actor,
                timestamp: input.timestamp,
                summary,
                detail,
                metadata,
                targetUserId: input.after.userId,
                targetCreatorId: input.after.userId,
            }),
        });
    };

    if (input.before.submissionStatus !== input.after.submissionStatus) {
        addEntry(
            input.after.submissionStatus,
            `Submission status changed to ${input.after.submissionStatus.replaceAll("_", " ")}`,
        );
    }

    if (!input.before.introAcknowledgedAt && input.after.introAcknowledgedAt) {
        addEntry("intro_acknowledged", "Creator intro acknowledged");
    }

    if (
        input.before.contractDocumentStatus !== input.after.contractDocumentStatus
        && input.after.contractDocumentStatus === "contract_sent"
    ) {
        addEntry("legal_sent", "Agreement sent", undefined, {
            agreementVersion: input.after.contractVersion,
            agreementHash: input.after.agreementHash,
            dispatchId: input.after.agreementDispatchId,
        });
    }

    if (
        input.before.creatorSignatureStatus !== input.after.creatorSignatureStatus
        && input.after.creatorSignatureStatus === "signature_signed"
    ) {
        addEntry("creator_contract_signed", "Creator signed agreement", undefined, {
            agreementVersion: input.after.contractVersion,
            agreementHash: input.after.agreementHash,
            dispatchId: input.after.agreementDispatchId,
            signerIp: input.after.creatorContractSignedIp,
            signerUserAgent: input.after.creatorContractSignedUserAgent,
        });
    }

    if (
        input.before.adminSignatureStatus !== input.after.adminSignatureStatus
        && input.after.adminSignatureStatus === "signature_signed"
    ) {
        addEntry("admin_contract_signed", "Admin countersigned agreement", undefined, {
            agreementVersion: input.after.contractVersion,
            agreementHash: input.after.agreementHash,
            dispatchId: input.after.agreementDispatchId,
            signerIp: input.after.adminContractSignedIp,
            signerUserAgent: input.after.adminContractSignedUserAgent,
        });
    }

    if (input.before.legalStatus !== input.after.legalStatus && input.after.legalStatus === "legal_signed") {
        addEntry("legal_signed", "Agreement complete", undefined, {
            agreementVersion: input.after.contractVersion,
            agreementHash: input.after.agreementHash,
            dispatchId: input.after.agreementDispatchId,
        });
    }

    if (input.before.idVerificationStatus !== input.after.idVerificationStatus) {
        if (input.after.idVerificationStatus === "id_requested") {
            addEntry("id_requested", "Creator ID requested");
        } else if (input.after.idVerificationStatus === "id_verified") {
            addEntry("id_verified", "Creator ID verified");
        } else if (input.after.idVerificationStatus === "id_rejected") {
            addEntry("id_rejected", "Creator ID rejected");
        }
    }

    if (
        input.before.segmentationStatus !== input.after.segmentationStatus
        && input.after.segmentationStatus === "segment_assigned"
    ) {
        addEntry("creator_segment_assigned", "Creator segment assigned", input.after.segmentLabel || undefined);
    }

    if (input.before.approvalStatus !== input.after.approvalStatus) {
        if (input.after.approvalStatus === "creator_approved") {
            addEntry("creator_approved", "Creator approved");
        } else if (input.after.approvalStatus === "creator_rejected") {
            addEntry("creator_rejected", "Creator rejected");
        } else if (input.after.approvalStatus === "creator_needs_changes") {
            addEntry("creator_needs_changes", "Creator changes requested");
        }
    }

    if (input.before.adminNotes !== input.after.adminNotes && readString(input.after.adminNotes)) {
        addEntry("admin_notes_updated", "Creator admin notes updated");
    }

    if (input.before.ownerOverrideActive !== input.after.ownerOverrideActive) {
        if (input.after.ownerOverrideActive) {
            addEntry("owner_override_applied", "Owner override applied", input.after.ownerOverrideReason || undefined);
        } else {
            addEntry("owner_override_cleared", "Owner override cleared");
        }
    }

    if (!input.before.isSyntheticCreator && input.after.isSyntheticCreator) {
        addEntry("synthetic_creator_marked", "Synthetic creator marked", input.after.syntheticReason, {
            syntheticCreatorType: input.after.syntheticCreatorType,
            syntheticLegalEvidenceMode: input.after.syntheticLegalEvidenceMode,
            humanOperatorRequired: input.after.humanOperatorRequired,
            doesNotChangeApproval: true,
        });
    }

    if (!input.before.legallyClearedAt && input.after.legallyClearedAt) {
        addEntry("creator_legally_cleared", "Creator marked legally cleared by owner", input.after.agreementBasis || "Manual override");
    }

    if (input.before.role !== "creator" && input.after.role === "creator") {
        addEntry("creator_role_activated", "Creator role activated");
    }

    if (
        input.after.approvalStatus === "creator_approved"
        && input.after.role !== "creator"
        && (input.before.approvalStatus !== "creator_approved" || input.before.role === "creator")
    ) {
        addEntry("creator_role_activation_blocked", "Creator approval is blocked from activating the public creator role");
    }

    return entries;
}

export function shouldActivateCreatorRole(canonical: CreatorOnboardingCanonicalRecord) {
    return canonical.approvalStatus === "creator_approved"
        && hasCreatorApprovalPrerequisites(canonical);
}

export function syncCreatorOnboardingDocuments(
    transaction: Transaction,
    input: {
        userId: string;
        displayName?: string;
        canonical: CreatorOnboardingCanonicalRecord;
    },
) {
    const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.userId);
    const userRef = adminDb.collection("users").doc(input.userId);
    const creatorApplication = buildCreatorOnboardingUserProjection(input.canonical);

    transaction.set(onboardingRef, stripUndefinedDeep(input.canonical), { merge: true });
    transaction.set(userRef, stripUndefinedDeep({
        creatorApplication,
    }), { merge: true });
    const materializedQueue = materializeCreatorReviewQueueEntryForTransaction(transaction, {
        userId: input.userId,
        canonical: input.canonical,
        displayName: input.displayName,
        nowMs: input.canonical.updatedAt,
    });

    return {
        creatorApplication,
        queueEntry: materializedQueue.queueEntry,
        onboardingRef,
        queueRef: materializedQueue.queueRef,
        userRef,
    };
}

export async function ensureCreatorOnboardingSubmission(input: {
    userId: string;
    email: string | null;
    displayName?: string | null;
    username?: string | null;
    photoURL?: string | null;
    role?: UserProfile["role"] | null;
    createdAt?: number;
    creatorDisplayName: string;
    creatorMonetizationGoals?: CreatorIntakeFields["creatorMonetizationGoals"];
    creatorPrimaryPlatform?: string;
    creatorFollowerRange?: CreatorIntakeFields["creatorFollowerRange"];
    creatorPostingFrequency?: CreatorIntakeFields["creatorPostingFrequency"];
    creatorContentFocus?: string;
    fansAlreadyAskForAccess?: CreatorIntakeFields["fansAlreadyAskForAccess"];
    creatorRecommendedSetup?: CreatorIntakeFields["creatorRecommendedSetup"];
    intakeVersion?: string;
    intakeSubmittedAt?: number;
    intakeSource?: CreatorIntakeFields["intakeSource"];
    actor?: CreatorOnboardingActor;
    nowMs?: number;
}) {
    if (!adminDb) {
        throw new Error("Database not available");
    }

    const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
        ? Math.trunc(input.nowMs)
        : Date.now();
    const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.userId);
    const queueRef = adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(input.userId);
    const userRef = adminDb.collection("users").doc(input.userId);
    const actor = input.actor ?? {
        id: input.userId,
        role: input.role === "creator" ? "creator" : "user",
        label: readString(input.displayName) || readString(input.username) || input.userId,
    };
    const activeAgreementTemplate = await getActiveCreatorAgreementTemplate(nowMs);

    return adminDb.runTransaction(async (transaction) => {
        const [userSnap, onboardingSnap] = await transaction.getAll(userRef, onboardingRef);
        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const existingCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const legacyMapping = mapLegacyCreatorApplicationToCanonical({
            userId: input.userId,
            userDoc: userData,
            existingCanonical,
            nowMs,
        });
        const queuePosition = resolveCreatorQueuePosition(
            existingCanonical?.queuePosition ?? existingProjection?.queuePosition,
        );
        const canonicalSource = existingCanonical ?? legacyMapping.canonical ?? existingProjection ?? {
            submissionStatus: "awaiting_manual_review",
            onboardingStartedAt: nowMs,
            submittedAt: nowMs,
            onboardingSubmittedAt: nowMs,
            awaitingManualReviewAt: nowMs,
            updatedAt: nowMs,
            idVerificationStatus: "id_not_requested",
            contractVersion: activeAgreementTemplate.agreementVersion,
            agreementTemplateId: activeAgreementTemplate.templateId,
            agreementTitle: activeAgreementTemplate.agreementTitle,
            agreementHash: activeAgreementTemplate.agreementHash,
            agreementSource: activeAgreementTemplate.agreementSource,
        };
        const canonical = {
            ...buildCreatorOnboardingCanonicalRecord({
                userId: input.userId,
                email: input.email ?? (typeof userData.email === "string" ? userData.email : null),
                username: readString(input.username) || readString(userData.username) || undefined,
                displayName: readString(input.displayName) || readString(userData.displayName) || undefined,
                photoURL: typeof input.photoURL === "string"
                    ? input.photoURL
                    : typeof userData.photoURL === "string"
                        ? userData.photoURL
                        : null,
                role: readRole(input.role ?? userData.role),
                createdAt: input.createdAt
                    ?? readOptionalTimestamp(userData.createdAt)
                    ?? existingCanonical?.createdAt
                    ?? existingProjection?.submittedAt
                    ?? nowMs,
                queuePosition,
                creatorDisplayName: input.creatorDisplayName,
                creatorMonetizationGoals: input.creatorMonetizationGoals,
                creatorPrimaryPlatform: input.creatorPrimaryPlatform,
                creatorFollowerRange: input.creatorFollowerRange,
                creatorPostingFrequency: input.creatorPostingFrequency,
                creatorContentFocus: input.creatorContentFocus,
                fansAlreadyAskForAccess: input.fansAlreadyAskForAccess,
                creatorRecommendedSetup: input.creatorRecommendedSetup,
                intakeVersion: input.intakeVersion,
                intakeSubmittedAt: input.intakeSubmittedAt ?? nowMs,
                intakeSource: input.intakeSource,
                nowMs,
                source: canonicalSource,
            }),
            ...(!existingCanonical && legacyMapping.legacyCreatorApplicationDetected
                ? {
                    legacyCreatorApplicationDetected: true,
                    legacyCreatorApplicationMapped: legacyMapping.legacyCreatorApplicationMapped,
                    legacyCreatorApplicationSkipped: legacyMapping.legacyCreatorApplicationSkipped,
                    mappingConfidence: legacyMapping.mappingConfidence,
                    mappingWarnings: legacyMapping.mappingWarnings,
                    legacyConfidence: legacyMapping.legacyConfidence,
                    legacyMappedAt: legacyMapping.legacyMappedAt ?? nowMs,
                }
                : {}),
        } satisfies CreatorOnboardingCanonicalRecord & Record<string, unknown>;

        const synced = syncCreatorOnboardingDocuments(transaction, {
            userId: input.userId,
            displayName: readString(input.displayName) || readString(userData.displayName) || undefined,
            canonical,
        });

        if (!onboardingSnap.exists) {
            buildCreatorOnboardingInitialHistoryEntries({
                actor,
                timestamp: nowMs,
                intakeFields: {
                    creatorMonetizationGoals: input.creatorMonetizationGoals,
                    creatorFollowerRange: input.creatorFollowerRange,
                    creatorPostingFrequency: input.creatorPostingFrequency,
                    fansAlreadyAskForAccess: input.fansAlreadyAskForAccess,
                    creatorRecommendedSetup: input.creatorRecommendedSetup,
                    intakeVersion: input.intakeVersion,
                    intakeSubmittedAt: input.intakeSubmittedAt ?? nowMs,
                    intakeSource: input.intakeSource,
                },
            }).forEach(({ id, entry }) => {
                transaction.set(
                    onboardingRef.collection(CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION).doc(id),
                    stripUndefinedDeep(entry),
                    { merge: true },
                );
            });
        }

        return {
            created: !onboardingSnap.exists,
            canonical,
            creatorApplication: synced.creatorApplication as CreatorApplication,
            queueEntry: synced.queueEntry,
        };
    });
}
