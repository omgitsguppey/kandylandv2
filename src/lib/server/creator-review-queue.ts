import "server-only";

import type { Transaction } from "firebase-admin/firestore";

import {
    buildCreatorReviewQueueEntry,
    normalizeCreatorOnboardingCanonicalRecord,
    type CreatorOnboardingCanonicalRecord,
    type CreatorReviewQueueEntry,
} from "@/lib/creator-onboarding";
import { adminDb } from "@/lib/server/firebase-admin";

export const CREATOR_REVIEW_QUEUE_COLLECTION = "creator_review_queue";
export const CREATOR_ONBOARDING_COLLECTION = "creator_onboarding";

export type CreatorReviewQueueParityDelta = {
    field: string;
    expected: unknown;
    actual: unknown;
};

export type MaterializedCreatorReviewQueueEntry = CreatorReviewQueueEntry & {
    queueMaterializedAt: number;
    sourceOnboardingUpdatedAt: number;
    projectionLagMs: number;
    queueParityOk: true;
    queueParityDelta: CreatorReviewQueueParityDelta[];
};

export type CreatorReviewQueueParityResult = {
    userId: string;
    onboardingExists: boolean;
    queueExists: boolean;
    queueParityOk: boolean;
    queueParityDelta: CreatorReviewQueueParityDelta[];
    queueBucket?: string;
    sourceOnboardingUpdatedAt?: number;
    queueMaterializedAt?: number;
    projectionLagMs?: number;
};

const REQUIRED_QUEUE_FIELDS = [
    "userId",
    "onboardingRefPath",
    "queueBucket",
    "queueSortAt",
    "queuePosition",
    "displayName",
    "creatorDisplayName",
    "creatorPrimaryPlatform",
    "creatorContentFocus",
    "email",
    "username",
    "photoURL",
    "role",
    "submissionStatus",
    "approvalStatus",
    "legalStatus",
    "idVerificationStatus",
    "segmentationStatus",
    "contractDocumentStatus",
    "creatorSignatureStatus",
    "adminSignatureStatus",
    "agreementBasis",
    "readyForApproval",
    "creatorReviewQueueVisible",
    "blockingReasons",
    "submittedAt",
    "updatedAt",
    "adminNotes",
    "idDocumentCount",
] as const;

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

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => (
            entry === undefined ? [] : [[key, stripUndefinedDeep(entry)]]
        )),
    ) as T;
}

function assertAdminDb() {
    if (!adminDb) {
        throw new Error("Database not available");
    }

    return adminDb;
}

function valuesMatch(expected: unknown, actual: unknown) {
    return JSON.stringify(expected ?? null) === JSON.stringify(actual ?? null);
}

export function buildMaterializedCreatorReviewQueueEntry(input: {
    canonical: CreatorOnboardingCanonicalRecord;
    displayName?: string;
    nowMs?: number;
}): MaterializedCreatorReviewQueueEntry {
    const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
        ? Math.trunc(input.nowMs)
        : Date.now();
    const sourceOnboardingUpdatedAt = input.canonical.updatedAt || input.canonical.submittedAt || nowMs;
    const queueEntry = buildCreatorReviewQueueEntry({
        canonical: input.canonical,
        displayName: input.displayName,
    });

    return stripUndefinedDeep({
        ...queueEntry,
        queueMaterializedAt: nowMs,
        sourceOnboardingUpdatedAt,
        projectionLagMs: Math.max(0, nowMs - sourceOnboardingUpdatedAt),
        queueParityOk: true,
        queueParityDelta: [],
    });
}

export function materializeCreatorReviewQueueEntryForTransaction(
    transaction: Pick<Transaction, "set">,
    input: {
        userId: string;
        canonical: CreatorOnboardingCanonicalRecord;
        displayName?: string;
        nowMs?: number;
    },
) {
    const db = assertAdminDb();
    const queueRef = db.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(input.userId);
    const queueEntry = buildMaterializedCreatorReviewQueueEntry({
        canonical: input.canonical,
        displayName: input.displayName,
        nowMs: input.nowMs,
    });

    transaction.set(queueRef, stripUndefinedDeep(queueEntry), { merge: true });

    return {
        queueEntry,
        queueRef,
    };
}

export async function materializeCreatorReviewQueueEntry(userId: string) {
    const db = assertAdminDb();
    const onboardingRef = db.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);
    const userRef = db.collection("users").doc(userId);
    const queueRef = db.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(userId);
    const [onboardingSnap, userSnap] = await Promise.all([
        onboardingRef.get(),
        userRef.get(),
    ]);
    const canonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());

    if (!canonical) {
        await removeCreatorReviewQueueEntry(userId, "missing_canonical_onboarding");
        return null;
    }

    const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
    const displayName = typeof userData.displayName === "string" ? userData.displayName : canonical.creatorDisplayName;
    const queueEntry = buildMaterializedCreatorReviewQueueEntry({
        canonical,
        displayName,
    });

    await queueRef.set(stripUndefinedDeep(queueEntry), { merge: true });
    return queueEntry;
}

export async function removeCreatorReviewQueueEntry(userId: string, reason: string) {
    const db = assertAdminDb();
    const queueRef = db.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(userId);
    await queueRef.delete();

    return {
        userId,
        removed: true,
        reason,
    };
}

export async function rebuildCreatorReviewQueueForUser(userId: string) {
    return materializeCreatorReviewQueueEntry(userId);
}

export function compareCreatorOnboardingToQueueRecords(input: {
    userId: string;
    canonical: CreatorOnboardingCanonicalRecord | null | undefined;
    queue: Record<string, unknown> | null | undefined;
}): CreatorReviewQueueParityResult {
    const queueExists = Boolean(input.queue);

    if (!input.canonical) {
        return {
            userId: input.userId,
            onboardingExists: false,
            queueExists,
            queueParityOk: !queueExists,
            queueParityDelta: queueExists
                ? [{ field: "onboarding", expected: "missing", actual: "queue_exists" }]
                : [],
        };
    }

    if (!input.queue) {
        return {
            userId: input.userId,
            onboardingExists: true,
            queueExists: false,
            queueParityOk: false,
            queueParityDelta: [{ field: "queue", expected: "exists", actual: "missing" }],
            queueBucket: buildMaterializedCreatorReviewQueueEntry({ canonical: input.canonical }).queueBucket,
            sourceOnboardingUpdatedAt: input.canonical.updatedAt,
        };
    }

    const expected = buildMaterializedCreatorReviewQueueEntry({
        canonical: input.canonical,
        displayName: typeof input.queue.displayName === "string" ? input.queue.displayName : undefined,
        nowMs: typeof input.queue.queueMaterializedAt === "number" ? input.queue.queueMaterializedAt : input.canonical.updatedAt,
    });
    const delta = REQUIRED_QUEUE_FIELDS.flatMap((field) => (
        valuesMatch(expected[field], input.queue?.[field])
            ? []
            : [{
                field,
                expected: expected[field],
                actual: input.queue?.[field],
            }]
    ));

    return {
        userId: input.userId,
        onboardingExists: true,
        queueExists: true,
        queueParityOk: delta.length === 0,
        queueParityDelta: delta,
        queueBucket: typeof input.queue.queueBucket === "string" ? input.queue.queueBucket : undefined,
        sourceOnboardingUpdatedAt: typeof input.queue.sourceOnboardingUpdatedAt === "number"
            ? input.queue.sourceOnboardingUpdatedAt
            : undefined,
        queueMaterializedAt: typeof input.queue.queueMaterializedAt === "number"
            ? input.queue.queueMaterializedAt
            : undefined,
        projectionLagMs: typeof input.queue.projectionLagMs === "number"
            ? input.queue.projectionLagMs
            : undefined,
    };
}

export async function compareOnboardingToQueue(userId: string) {
    const db = assertAdminDb();
    const [onboardingSnap, queueSnap] = await Promise.all([
        db.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId).get(),
        db.collection(CREATOR_REVIEW_QUEUE_COLLECTION).doc(userId).get(),
    ]);

    return compareCreatorOnboardingToQueueRecords({
        userId,
        canonical: normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data()),
        queue: queueSnap.exists ? (queueSnap.data() as Record<string, unknown>) : null,
    });
}
