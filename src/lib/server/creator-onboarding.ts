import "server-only";

import type { Transaction } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { generateCreatorQueuePosition, normalizeCreatorApplication } from "@/lib/creator-application";
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
        transaction.set(historyCollection.doc(id), entry, { merge: true });
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

    if (input.before.legalStatus !== input.after.legalStatus) {
        if (input.after.legalStatus === "legal_sent") {
            addEntry("legal_sent", "Legal documents sent to creator");
        } else if (input.after.legalStatus === "legal_signed") {
            addEntry("legal_signed", "Legal documents signed by creator");
        }
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
        || input.before.segmentLabel !== input.after.segmentLabel
    ) {
        if (input.after.segmentationStatus === "segment_assigned") {
            addEntry("segment_assigned", "Creator segment assigned", input.after.segmentLabel || undefined);
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

    transaction.set(onboardingRef, input.canonical, { merge: true });
    transaction.set(queueRef, queueEntry, { merge: true });
    transaction.set(userRef, {
        creatorApplication,
    }, { merge: true });

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
        const queuePosition = existingCanonical?.queuePosition
            ?? existingProjection?.queuePosition
            ?? generateCreatorQueuePosition();
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
                onboardingStartedAt: nowMs,
                submittedAt: nowMs,
                onboardingSubmittedAt: nowMs,
                awaitingManualReviewAt: nowMs,
                updatedAt: nowMs,
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
                    entry,
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
