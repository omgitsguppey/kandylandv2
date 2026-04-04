import "server-only";

import type { Transaction } from "firebase-admin/firestore";

import { PRIMARY_CREATOR_OWNER_EMAIL, isCreatorOwnerEmail } from "@/lib/creator-admin";
import { adminDb } from "@/lib/server/firebase-admin";
import { normalizeCreatorApplication, resolveCreatorQueuePosition } from "@/lib/creator-application";
import {
    buildCreatorOnboardingCanonicalRecord,
    buildCreatorOnboardingUserProjection,
    buildCreatorReviewQueueEntry,
    hasCreatorApprovalPrerequisites,
    type CreatorOnboardingCanonicalRecord,
    type CreatorOnboardingHistoryEntry,
    type CreatorOnboardingHistoryEventType,
    normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import type { CreatorApplication, UserProfile } from "@/types/db";

export const CREATOR_ONBOARDING_COLLECTION = "creator_onboarding";
export const CREATOR_REVIEW_QUEUE_COLLECTION = "creator_review_queue";
export const CREATOR_ONBOARDING_HISTORY_SUBCOLLECTION = "history";

export type CreatorOnboardingActor = {
    id: string;
    role: "creator" | "admin" | "system";
    label: string;
};

export { PRIMARY_CREATOR_OWNER_EMAIL, isCreatorOwnerEmail };

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

function buildHistoryEntry(input: {
    eventType: CreatorOnboardingHistoryEventType;
    actor: CreatorOnboardingActor;
    timestamp: number;
    summary: string;
    detail?: string;
    metadata?: Record<string, unknown>;
}) {
    return {
        eventType: input.eventType,
        actorId: input.actor.id,
        actorRole: input.actor.role,
        actorLabel: input.actor.label,
        timestamp: input.timestamp,
        summary: input.summary,
        detail: input.detail,
        metadata: input.metadata,
    } satisfies CreatorOnboardingHistoryEntry;
}

export function buildCreatorOnboardingInitialHistoryEntries(input: {
    actor: CreatorOnboardingActor;
    timestamp: number;
}) {
    return [
        {
            id: "onboarding_started",
            entry: buildHistoryEntry({
                eventType: "onboarding_started",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator onboarding started",
            }),
        },
        {
            id: "onboarding_submitted",
            entry: buildHistoryEntry({
                eventType: "onboarding_submitted",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator onboarding submitted",
            }),
        },
        {
            id: "awaiting_manual_review",
            entry: buildHistoryEntry({
                eventType: "awaiting_manual_review",
                actor: input.actor,
                timestamp: input.timestamp,
                summary: "Creator onboarding is waiting for manual review",
            }),
        },
        {
            id: "admin_queue_materialized",
            entry: buildHistoryEntry({
                eventType: "admin_queue_materialized",
                actor: {
                    id: "system",
                    role: "system",
                    label: "System",
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
            entry: buildHistoryEntry({
                eventType,
                actor: input.actor,
                timestamp: input.timestamp,
                summary,
                detail,
                metadata,
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
        addEntry("legal_sent", "Legal documents sent to creator");
    }

    if (
        input.before.creatorSignatureStatus !== input.after.creatorSignatureStatus
        && input.after.creatorSignatureStatus === "signature_signed"
    ) {
        addEntry("creator_contract_signed", "Creator signed the agreement");
    }

    if (
        input.before.adminSignatureStatus !== input.after.adminSignatureStatus
        && input.after.adminSignatureStatus === "signature_signed"
    ) {
        addEntry("admin_contract_signed", "Admin countersigned the agreement");
    }

    if (input.before.legalStatus !== input.after.legalStatus && input.after.legalStatus === "legal_signed") {
        addEntry("legal_signed", "Legal documents fully signed");
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

    if (!input.before.legallyClearedAt && input.after.legallyClearedAt) {
        addEntry("creator_legally_cleared", "Creator marked legally cleared by owner", input.after.agreementBasis || "Manual override");
    }

    if (input.before.role !== "creator" && input.after.role === "creator") {
        addEntry("creator_role_activated", "Creator role activated");
    }

    if (input.after.approvalStatus === "creator_approved" && input.after.role !== "creator") {
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
    const queueRef = adminDb.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(input.userId);
    const userRef = adminDb.collection("users").doc(input.userId);
    const creatorApplication = buildCreatorOnboardingUserProjection(input.canonical);
    const queueEntry = buildCreatorReviewQueueEntry({
        canonical: input.canonical,
        displayName: input.displayName,
    });

    transaction.set(onboardingRef, stripUndefinedDeep(input.canonical), { merge: true });
    transaction.set(queueRef, stripUndefinedDeep(queueEntry), { merge: true });
    transaction.set(userRef, stripUndefinedDeep({
        creatorApplication,
    }), { merge: true });

    return {
        creatorApplication,
        queueEntry,
        onboardingRef,
        queueRef,
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
    creatorPrimaryPlatform?: string;
    creatorContentFocus?: string;
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
        role: "creator",
        label: readString(input.displayName) || readString(input.username) || input.userId,
    };

    return adminDb.runTransaction(async (transaction) => {
        const [userSnap, onboardingSnap] = await transaction.getAll(userRef, onboardingRef);
        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const existingCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const queuePosition = resolveCreatorQueuePosition(
            existingCanonical?.queuePosition ?? existingProjection?.queuePosition,
        );
        const canonical = buildCreatorOnboardingCanonicalRecord({
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
            creatorPrimaryPlatform: input.creatorPrimaryPlatform,
            creatorContentFocus: input.creatorContentFocus,
            nowMs,
            source: existingCanonical ?? existingProjection ?? {
                submissionStatus: "awaiting_manual_review",
                onboardingStartedAt: nowMs,
                submittedAt: nowMs,
                onboardingSubmittedAt: nowMs,
                awaitingManualReviewAt: nowMs,
                updatedAt: nowMs,
                idVerificationStatus: "id_not_requested",
            },
        });

        const synced = syncCreatorOnboardingDocuments(transaction, {
            userId: input.userId,
            displayName: readString(input.displayName) || readString(userData.displayName) || undefined,
            canonical,
        });

        if (!onboardingSnap.exists) {
            buildCreatorOnboardingInitialHistoryEntries({
                actor,
                timestamp: nowMs,
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
