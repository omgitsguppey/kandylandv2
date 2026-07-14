import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { sanitizeFirestorePayload } from "@/lib/server/firestore-sanitize";
import { mergeUserJourneyIndexLifetime } from "@/lib/user-indexes/user-index-normalizer";
import {
  isUserIndexMaterializerActivationReady,
  USER_INDEX_COLLECTIONS,
  USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID,
  USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
  USER_INDEX_MATERIALIZER_MAX_ATTEMPTS,
  USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
  USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN,
  USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS,
  USER_INDEX_MATERIALIZER_SHADOW_RETENTION_MS,
  USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE,
  USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS,
  type GuestTrackingIndex,
  type UserIndexMaterializerActivationState,
  type UserIndexMaterializerOutboxRequest,
  type UserIndexMaterializerWindowReceipt,
  type UserIndexPublicationBundle,
  type UserIndexShadowPublication,
  type UserContentConsumptionIndex,
  type UserEntityAffinityIndex,
  type UserJourneyIndex,
  type UserNotificationIndex,
  type UserTrackingIndex,
  type UserValueIndex,
} from "@/lib/user-indexes/user-tracking-index-contract";

export async function writeUserTrackingIndex(index: UserTrackingIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userTrackingIndexes).doc(index.userId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeGuestTrackingIndex(index: GuestTrackingIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.guestTrackingIndexes).doc(index.anonymousVisitorId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserEntityAffinityIndex(index: UserEntityAffinityIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userEntityAffinityIndexes).doc(index.userId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserValueIndex(index: UserValueIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userValueIndexes).doc(index.userId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserJourneyIndex(index: UserJourneyIndex) {
  const docId = index.userId || index.anonymousVisitorId;
  if (!docId) return;
  await adminDb.collection(USER_INDEX_COLLECTIONS.userJourneyIndexes).doc(docId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserNotificationIndex(index: UserNotificationIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userNotificationIndexes).doc(index.userId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function writeUserContentConsumptionIndex(index: UserContentConsumptionIndex) {
  await adminDb.collection(USER_INDEX_COLLECTIONS.userContentConsumptionIndexes).doc(index.userId).set({
    ...sanitizeFirestorePayload(index as unknown as Record<string, unknown>),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

const TERMINAL_NEXT_ATTEMPT_AT_MS = 8_640_000_000_000_000;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 15 * 60 * 1000;

export function withUserIndexMaterializerExpiration<T extends { expiresAtMs: number }>(
  value: T,
) {
  if (!Number.isFinite(value.expiresAtMs) || value.expiresAtMs <= 0) {
    throw new RangeError("user_index_materializer_expiration_invalid");
  }
  return {
    ...value,
    expiresAt: Timestamp.fromMillis(Math.trunc(value.expiresAtMs)),
  };
}

function requestExpiresAtMs(nowMs: number) {
  return nowMs + USER_INDEX_MATERIALIZER_REQUEST_RETENTION_MS;
}

export type UserIndexMaterializerClaimDecision =
  | { status: "claimed"; request: UserIndexMaterializerOutboxRequest }
  | { status: "not_due" | "terminal"; request: UserIndexMaterializerOutboxRequest }
  | { status: "superseded"; request: UserIndexMaterializerOutboxRequest };

export function computeUserIndexMaterializerRetryDelayMs(attemptCount: number) {
  const normalizedAttempt = Math.max(1, Math.min(Math.trunc(attemptCount), USER_INDEX_MATERIALIZER_MAX_ATTEMPTS));
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** (normalizedAttempt - 1)));
}

function promotePendingUserIndexMaterializerWindow(input: {
  request: UserIndexMaterializerOutboxRequest;
  nowMs: number;
  safeErrorCode: string;
}) {
  const pendingSourceWindowEndMs = input.request.pendingSourceWindowEndMs ?? 0;
  if (pendingSourceWindowEndMs <= input.request.sourceWindowEndMs) return null;
  return {
    ...input.request,
    state: "queued" as const,
    sourceWindowStartMs: Math.min(
      input.request.sourceWindowStartMs,
      input.request.pendingSourceWindowStartMs ?? input.request.sourceWindowStartMs,
    ),
    sourceWindowEndMs: pendingSourceWindowEndMs,
    attemptCount: 0,
    nextAttemptAtMs: input.nowMs,
    leaseOwner: null,
    leaseExpiresAtMs: null,
    pendingSourceWindowStartMs: null,
    pendingSourceWindowEndMs: null,
    completedAtMs: null,
    updatedAtMs: input.nowMs,
    lastSafeErrorCode: input.safeErrorCode,
    expiresAtMs: requestExpiresAtMs(input.nowMs),
  } satisfies UserIndexMaterializerOutboxRequest;
}

export function resolveUserIndexMaterializerClaim(input: {
  request: UserIndexMaterializerOutboxRequest;
  workerId: string;
  sourceFingerprint: string;
  nowMs: number;
  leaseMs: number;
}): UserIndexMaterializerClaimDecision {
  const request = input.request;
  if (
    request.sourceFingerprint !== input.sourceFingerprint
    || request.materializerVersion !== USER_INDEX_MATERIALIZER_CONTRACT_VERSION
  ) {
    return {
      status: "superseded",
      request: {
        ...request,
        state: "superseded",
        leaseOwner: null,
        leaseExpiresAtMs: null,
        nextAttemptAtMs: TERMINAL_NEXT_ATTEMPT_AT_MS,
        updatedAtMs: input.nowMs,
        completedAtMs: input.nowMs,
        lastSafeErrorCode: "source_fingerprint_superseded",
        expiresAtMs: requestExpiresAtMs(input.nowMs),
      },
    };
  }
  if (request.state === "completed" || request.state === "failed") {
    const promoted = promotePendingUserIndexMaterializerWindow({
      request,
      nowMs: input.nowMs,
      safeErrorCode: request.lastSafeErrorCode || "pending_window_recovered",
    });
    if (promoted) return resolveUserIndexMaterializerClaim({ ...input, request: promoted });
  }
  if (request.state === "completed" || request.state === "failed" || request.state === "superseded") {
    return { status: "terminal", request };
  }
  if (request.attemptCount >= USER_INDEX_MATERIALIZER_MAX_ATTEMPTS) {
    const promoted = promotePendingUserIndexMaterializerWindow({
      request,
      nowMs: input.nowMs,
      safeErrorCode: request.lastSafeErrorCode || "previous_generation_attempt_limit",
    });
    if (promoted) {
      return resolveUserIndexMaterializerClaim({ ...input, request: promoted });
    }
    return {
      status: "terminal",
      request: {
        ...request,
        state: "failed",
        leaseOwner: null,
        leaseExpiresAtMs: null,
        nextAttemptAtMs: TERMINAL_NEXT_ATTEMPT_AT_MS,
        updatedAtMs: input.nowMs,
        completedAtMs: input.nowMs,
        lastSafeErrorCode: request.lastSafeErrorCode || "attempt_limit_reached",
        expiresAtMs: requestExpiresAtMs(input.nowMs),
      },
    };
  }
  const leaseStillOwned = request.state === "leased"
    && typeof request.leaseExpiresAtMs === "number"
    && request.leaseExpiresAtMs > input.nowMs;
  if (leaseStillOwned || request.nextAttemptAtMs > input.nowMs) {
    return { status: "not_due", request };
  }
  const leaseMs = Math.max(1_000, Math.min(Math.trunc(input.leaseMs), 2 * 60 * 1000));
  return {
    status: "claimed",
    request: {
      ...request,
      state: "leased",
      attemptCount: request.attemptCount + 1,
      leaseOwner: input.workerId,
      leaseExpiresAtMs: input.nowMs + leaseMs,
      updatedAtMs: input.nowMs,
      lastSafeErrorCode: null,
      completedAtMs: null,
      expiresAtMs: requestExpiresAtMs(input.nowMs),
    },
  };
}

export function resolveUserIndexMaterializerFailure(input: {
  request: UserIndexMaterializerOutboxRequest;
  workerId: string;
  nowMs: number;
  safeErrorCode: string;
}) {
  if (input.request.state !== "leased" || input.request.leaseOwner !== input.workerId) return null;
  const terminal = input.safeErrorCode === USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE
    || input.request.attemptCount >= USER_INDEX_MATERIALIZER_MAX_ATTEMPTS;
  if (terminal) {
    const promoted = promotePendingUserIndexMaterializerWindow({
      request: input.request,
      nowMs: input.nowMs,
      safeErrorCode: input.safeErrorCode,
    });
    if (promoted) return promoted;
  }
  return {
    ...input.request,
    state: terminal ? "failed" as const : "retry_wait" as const,
    leaseOwner: null,
    leaseExpiresAtMs: null,
    nextAttemptAtMs: terminal
      ? TERMINAL_NEXT_ATTEMPT_AT_MS
      : input.nowMs + computeUserIndexMaterializerRetryDelayMs(input.request.attemptCount),
    updatedAtMs: input.nowMs,
    completedAtMs: terminal ? input.nowMs : null,
    lastSafeErrorCode: input.safeErrorCode,
    expiresAtMs: requestExpiresAtMs(input.nowMs),
  } satisfies UserIndexMaterializerOutboxRequest;
}

function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function hasValidUserIndexMaterializerReceiptShape(receipt: UserIndexMaterializerWindowReceipt) {
  const counters = [
    receipt.requestsClaimed,
    receipt.requestsCompleted,
    receipt.requestsFailed,
    receipt.leaseLostCount,
    receipt.factsRead,
    receipt.factsPublished,
    receipt.truncatedSubjectCount,
    ...Object.values(receipt.exclusions),
  ];
  return receipt.materializerVersion === USER_INDEX_MATERIALIZER_CONTRACT_VERSION
    && Boolean(receipt.sourceFingerprint.trim())
    && Number.isFinite(receipt.startedAtMs)
    && Number.isFinite(receipt.completedAtMs)
    && receipt.completedAtMs >= receipt.startedAtMs
    && receipt.expiresAtMs === receipt.completedAtMs + USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS
    && counters.every(isNonNegativeInteger)
    && receipt.requestsClaimed <= USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN
    && receipt.requestsCompleted + receipt.requestsFailed + receipt.leaseLostCount === receipt.requestsClaimed
    && receipt.factsRead <= receipt.requestsClaimed * USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT
    && receipt.factsPublished <= receipt.factsRead
    && receipt.truncatedSubjectCount <= receipt.requestsClaimed;
}

export function deriveUserIndexMaterializerWindowReceipt(
  receipt: UserIndexMaterializerWindowReceipt,
): UserIndexMaterializerWindowReceipt {
  const normalizedReceipt = {
    ...receipt,
    expiresAtMs: receipt.completedAtMs + USER_INDEX_MATERIALIZER_WINDOW_RETENTION_MS,
  };
  const validShape = hasValidUserIndexMaterializerReceiptShape(normalizedReceipt);
  return {
    ...normalizedReceipt,
    clean: validShape
      && normalizedReceipt.requestsClaimed > 0
      && normalizedReceipt.requestsCompleted === normalizedReceipt.requestsClaimed
      && normalizedReceipt.requestsFailed === 0
      && normalizedReceipt.leaseLostCount === 0
      && normalizedReceipt.truncatedSubjectCount === 0
      && !normalizedReceipt.runtimeCapReached,
  };
}

export function buildNextUserIndexMaterializerActivationState(input: {
  current: UserIndexMaterializerActivationState | null;
  receipt: UserIndexMaterializerWindowReceipt;
}) {
  const current = input.current;
  const receipt = deriveUserIndexMaterializerWindowReceipt(input.receipt);
  if (receipt.mode !== "shadow") return current;
  if (
    current
    && (
      receipt.completedAtMs < current.latestShadowCompletedAtMs
      || (
        receipt.completedAtMs === current.latestShadowCompletedAtMs
        && current.latestShadowWindowId
        && receipt.windowId.localeCompare(current.latestShadowWindowId) <= 0
      )
    )
  ) {
    return current;
  }
  const sameSource = current?.sourceFingerprint === receipt.sourceFingerprint
    && current.materializerVersion === receipt.materializerVersion;
  const previousCleanIds = sameSource
    && current?.latestShadowWindowClean
    && Array.isArray(current.consecutiveCleanShadowWindowIds)
    ? current.consecutiveCleanShadowWindowIds
    : [];
  const cleanIds = receipt.clean
    ? Array.from(new Set([...previousCleanIds, receipt.windowId])).slice(-2)
    : [];
  return {
    documentId: USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID,
    sourceFingerprint: receipt.sourceFingerprint,
    materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    consecutiveCleanShadowWindowIds: cleanIds,
    latestShadowWindowId: receipt.windowId,
    latestShadowCompletedAtMs: receipt.completedAtMs,
    latestShadowWindowClean: receipt.clean,
    updatedAtMs: receipt.completedAtMs,
  } satisfies UserIndexMaterializerActivationState;
}

function requireMaterializerDatabase() {
  if (!adminDb) throw new Error("user_index_materializer_database_unavailable");
  return adminDb;
}

export function coalesceUserIndexMaterializerOutboxRequest(
  existing: UserIndexMaterializerOutboxRequest,
  incoming: UserIndexMaterializerOutboxRequest,
) {
  const sourceWindowStartMs = Math.min(existing.sourceWindowStartMs, incoming.sourceWindowStartMs);
  const sourceWindowEndMs = Math.max(existing.sourceWindowEndMs, incoming.sourceWindowEndMs);
  const hasNewSourceWindow = sourceWindowEndMs > (existing.processedThroughMs ?? 0);
  const preserveLease = existing.state === "leased"
    && typeof existing.leaseExpiresAtMs === "number"
    && existing.leaseExpiresAtMs > incoming.updatedAtMs;
  if (preserveLease && hasNewSourceWindow) {
    const pendingSourceWindowStartMs = Math.min(
      existing.pendingSourceWindowStartMs ?? incoming.sourceWindowStartMs,
      incoming.sourceWindowStartMs,
    );
    const pendingSourceWindowEndMs = Math.max(
      existing.pendingSourceWindowEndMs ?? existing.sourceWindowEndMs,
      incoming.sourceWindowEndMs,
    );
    return {
      request: {
        ...existing,
        maxFacts: Math.min(existing.maxFacts, incoming.maxFacts),
        pendingSourceWindowStartMs,
        pendingSourceWindowEndMs,
        updatedAtMs: incoming.updatedAtMs,
        expiresAtMs: Math.max(existing.expiresAtMs || 0, incoming.expiresAtMs),
      },
      requeued: false,
    };
  }
  if (!hasNewSourceWindow) {
    return {
      request: {
        ...existing,
        sourceWindowStartMs,
        sourceWindowEndMs,
        maxFacts: Math.min(existing.maxFacts, incoming.maxFacts),
        updatedAtMs: incoming.updatedAtMs,
        expiresAtMs: Math.max(existing.expiresAtMs || 0, incoming.expiresAtMs),
      },
      requeued: false,
    };
  }
  return {
    request: {
      ...existing,
      sourceWindowStartMs,
      sourceWindowEndMs,
      maxFacts: Math.min(existing.maxFacts, incoming.maxFacts),
      state: "queued" as const,
      attemptCount: 0,
      nextAttemptAtMs: incoming.nextAttemptAtMs,
      leaseOwner: null,
      leaseExpiresAtMs: null,
      pendingSourceWindowStartMs: null,
      pendingSourceWindowEndMs: null,
      completedAtMs: null,
      lastSafeErrorCode: null,
      updatedAtMs: incoming.updatedAtMs,
      expiresAtMs: Math.max(existing.expiresAtMs || 0, incoming.expiresAtMs),
    },
    requeued: true,
  };
}

export async function enqueueUserIndexMaterializerRequests(
  requests: readonly UserIndexMaterializerOutboxRequest[],
) {
  if (requests.length === 0) return { created: 0, requeued: 0, coalesced: 0 };
  if (requests.length > USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN) {
    throw new RangeError("user_index_materializer_request_batch_too_large");
  }
  const db = requireMaterializerDatabase();
  return db.runTransaction(async (transaction) => {
    const refs = requests.map((request) =>
      db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests).doc(request.requestId));
    const snapshots = [];
    for (const ref of refs.slice(0, USER_INDEX_MATERIALIZER_MAX_REQUESTS_PER_RUN)) {
      snapshots.push(await transaction.get(ref));
    }
    let created = 0;
    let requeued = 0;
    let coalesced = 0;
    snapshots.forEach((snapshot, index) => {
      const incoming = requests[index];
      if (!snapshot.exists) {
        transaction.create(refs[index], withUserIndexMaterializerExpiration(incoming));
        created += 1;
        return;
      }
      const existing = snapshot.data() as UserIndexMaterializerOutboxRequest;
      const next = coalesceUserIndexMaterializerOutboxRequest(existing, incoming);
      transaction.set(refs[index], withUserIndexMaterializerExpiration(next.request), { merge: true });
      if (next.requeued) requeued += 1;
      else coalesced += 1;
    });
    return { created, requeued, coalesced };
  });
}

export async function claimUserIndexMaterializerRequest(input: {
  requestId: string;
  workerId: string;
  sourceFingerprint: string;
  nowMs: number;
  leaseMs: number;
}) {
  const db = requireMaterializerDatabase();
  const ref = db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests).doc(input.requestId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const decision = resolveUserIndexMaterializerClaim({
      request: snapshot.data() as UserIndexMaterializerOutboxRequest,
      workerId: input.workerId,
      sourceFingerprint: input.sourceFingerprint,
      nowMs: input.nowMs,
      leaseMs: input.leaseMs,
    });
    if (decision.status === "claimed" || decision.status === "superseded") {
      transaction.set(ref, withUserIndexMaterializerExpiration(decision.request), { merge: true });
    } else if (
      decision.status === "terminal"
      && decision.request.state === "failed"
      && snapshot.data()?.state !== "failed"
    ) {
      transaction.set(ref, withUserIndexMaterializerExpiration(decision.request), { merge: true });
    }
    return decision.status === "claimed" ? decision.request : null;
  });
}

export function isUserIndexMaterializerLeasePublishable(input: {
  request: UserIndexMaterializerOutboxRequest;
  workerId: string;
  publishedAtMs: number;
}) {
  return input.request.state === "leased"
    && input.request.leaseOwner === input.workerId
    && typeof input.request.leaseExpiresAtMs === "number"
    && Number.isFinite(input.request.leaseExpiresAtMs)
    && input.request.leaseExpiresAtMs > input.publishedAtMs;
}

export function isUserIndexPublicationBundleBound(input: {
  request: UserIndexMaterializerOutboxRequest;
  bundle: UserIndexPublicationBundle;
}) {
  if (
    input.bundle.subjectKind !== input.request.subjectKind
    || input.bundle.subjectId !== input.request.subjectId
  ) return false;
  if (input.bundle.subjectKind === "guest") {
    return input.bundle.guestTrackingIndex.anonymousVisitorId === input.request.subjectId
      && input.bundle.journeyIndex.anonymousVisitorId === input.request.subjectId
      && !input.bundle.journeyIndex.userId;
  }
  return input.bundle.trackingIndex.userId === input.request.subjectId
    && input.bundle.entityAffinityIndex.userId === input.request.subjectId
    && input.bundle.valueIndex.userId === input.request.subjectId
    && input.bundle.journeyIndex.userId === input.request.subjectId
    && !input.bundle.journeyIndex.anonymousVisitorId
    && input.bundle.notificationIndex.userId === input.request.subjectId
    && input.bundle.contentConsumptionIndex.userId === input.request.subjectId;
}

function setActivePublication(
  transaction: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  bundle: UserIndexPublicationBundle,
  materializerMetadata: Record<string, unknown>,
  currentJourneyIndex: UserJourneyIndex | null,
) {
  const value = (index: Record<string, unknown>) => ({
    ...sanitizeFirestorePayload(index),
    materializer: materializerMetadata,
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (bundle.subjectKind === "guest") {
    const journeyIndex = mergeUserJourneyIndexLifetime(currentJourneyIndex, bundle.journeyIndex);
    transaction.set(
      db.collection(USER_INDEX_COLLECTIONS.guestTrackingIndexes).doc(bundle.subjectId),
      value(bundle.guestTrackingIndex as unknown as Record<string, unknown>),
      { merge: false },
    );
    transaction.set(
      db.collection(USER_INDEX_COLLECTIONS.userJourneyIndexes).doc(bundle.subjectId),
      value(journeyIndex as unknown as Record<string, unknown>),
      { merge: false },
    );
    return;
  }
  const journeyIndex = mergeUserJourneyIndexLifetime(currentJourneyIndex, bundle.journeyIndex);
  transaction.set(
    db.collection(USER_INDEX_COLLECTIONS.userTrackingIndexes).doc(bundle.subjectId),
    value(bundle.trackingIndex as unknown as Record<string, unknown>),
    { merge: false },
  );
  transaction.set(
    db.collection(USER_INDEX_COLLECTIONS.userEntityAffinityIndexes).doc(bundle.subjectId),
    value(bundle.entityAffinityIndex as unknown as Record<string, unknown>),
    { merge: false },
  );
  transaction.set(
    db.collection(USER_INDEX_COLLECTIONS.userValueIndexes).doc(bundle.subjectId),
    value(bundle.valueIndex as unknown as Record<string, unknown>),
    { merge: false },
  );
  transaction.set(
    db.collection(USER_INDEX_COLLECTIONS.userJourneyIndexes).doc(bundle.subjectId),
    value(journeyIndex as unknown as Record<string, unknown>),
    { merge: false },
  );
  transaction.set(
    db.collection(USER_INDEX_COLLECTIONS.userNotificationIndexes).doc(bundle.subjectId),
    value(bundle.notificationIndex as unknown as Record<string, unknown>),
    { merge: false },
  );
  transaction.set(
    db.collection(USER_INDEX_COLLECTIONS.userContentConsumptionIndexes).doc(bundle.subjectId),
    value(bundle.contentConsumptionIndex as unknown as Record<string, unknown>),
    { merge: false },
  );
}

export async function publishUserIndexMaterializerBundle(input: {
  request: UserIndexMaterializerOutboxRequest;
  workerId: string;
  mode: "shadow" | "active";
  factsRead: number;
  factsPublished: number;
  isPotentiallyTruncated: boolean;
  exclusions: UserIndexShadowPublication["exclusions"];
  bundle: UserIndexPublicationBundle;
}) {
  if (input.mode === "active" && input.isPotentiallyTruncated) {
    throw new Error(USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE);
  }
  const db = requireMaterializerDatabase();
  const requestRef = db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests).doc(input.request.requestId);
  const activationRef = db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerState)
    .doc(USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID);
  return db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists) return false;
    const currentRequest = requestSnapshot.data() as UserIndexMaterializerOutboxRequest;
    if (currentRequest.state !== "leased" || currentRequest.leaseOwner !== input.workerId) return false;
    if (
      currentRequest.subjectKind !== input.request.subjectKind
      || currentRequest.subjectId !== input.request.subjectId
      || currentRequest.sourceFingerprint !== input.request.sourceFingerprint
      || currentRequest.materializerVersion !== USER_INDEX_MATERIALIZER_CONTRACT_VERSION
      || currentRequest.sourceWindowStartMs !== input.request.sourceWindowStartMs
      || currentRequest.sourceWindowEndMs !== input.request.sourceWindowEndMs
    ) return false;
    if (!isUserIndexPublicationBundleBound({ request: currentRequest, bundle: input.bundle })) return false;

    let currentJourneyIndex: UserJourneyIndex | null = null;
    if (input.mode === "active") {
      const activationSnapshot = await transaction.get(activationRef);
      const activationState = activationSnapshot.exists
        ? activationSnapshot.data() as UserIndexMaterializerActivationState
        : null;
      if (!isUserIndexMaterializerActivationReady({
        state: activationState,
        sourceFingerprint: currentRequest.sourceFingerprint,
      })) {
        throw new Error("user_index_materializer_activation_gate_missing");
      }
      const journeySnapshot = await transaction.get(
        db.collection(USER_INDEX_COLLECTIONS.userJourneyIndexes).doc(currentRequest.subjectId),
      );
      currentJourneyIndex = journeySnapshot.exists
        ? journeySnapshot.data() as UserJourneyIndex
        : null;
    }

    const publishedAtMs = Date.now();
    if (!isUserIndexMaterializerLeasePublishable({
      request: currentRequest,
      workerId: input.workerId,
      publishedAtMs,
    })) return false;

    const materializerMetadata = {
      requestId: currentRequest.requestId,
      sourceFingerprint: currentRequest.sourceFingerprint,
      materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
      publishedAtMs,
    };
    if (input.mode === "shadow") {
      const publication: UserIndexShadowPublication = {
        requestId: currentRequest.requestId,
        subjectKind: currentRequest.subjectKind,
        subjectId: currentRequest.subjectId,
        sourceFingerprint: currentRequest.sourceFingerprint,
        materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceWindowStartMs: currentRequest.sourceWindowStartMs,
        sourceWindowEndMs: currentRequest.sourceWindowEndMs,
        publishedAtMs,
        factsRead: input.factsRead,
        factsPublished: input.factsPublished,
        isPotentiallyTruncated: input.isPotentiallyTruncated,
        issueCodes: input.isPotentiallyTruncated
          ? [USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE]
          : [],
        exclusions: input.exclusions,
        bundle: input.bundle,
        expiresAtMs: publishedAtMs + USER_INDEX_MATERIALIZER_SHADOW_RETENTION_MS,
      };
      transaction.set(
        db.collection(USER_INDEX_COLLECTIONS.userIndexShadowPublications).doc(currentRequest.requestId),
        withUserIndexMaterializerExpiration({
          ...sanitizeFirestorePayload(publication as unknown as Record<string, unknown>),
          expiresAtMs: publication.expiresAtMs,
        }),
        { merge: false },
      );
    } else {
      setActivePublication(transaction, db, input.bundle, materializerMetadata, currentJourneyIndex);
    }

    const pendingSourceWindowEndMs = currentRequest.pendingSourceWindowEndMs ?? 0;
    const hasPendingWindow = pendingSourceWindowEndMs > currentRequest.sourceWindowEndMs;
    const requestUpdate = hasPendingWindow ? {
      state: "queued",
      sourceWindowStartMs: Math.min(
        currentRequest.pendingSourceWindowStartMs ?? currentRequest.sourceWindowStartMs,
        currentRequest.sourceWindowStartMs,
      ),
      sourceWindowEndMs: pendingSourceWindowEndMs,
      processedThroughMs: currentRequest.sourceWindowEndMs,
      pendingSourceWindowStartMs: null,
      pendingSourceWindowEndMs: null,
      completedAtMs: null,
      updatedAtMs: publishedAtMs,
      attemptCount: 0,
      nextAttemptAtMs: publishedAtMs,
      leaseOwner: null,
      leaseExpiresAtMs: null,
      lastSafeErrorCode: null,
      expiresAtMs: requestExpiresAtMs(publishedAtMs),
    } : {
      state: "completed",
      processedThroughMs: currentRequest.sourceWindowEndMs,
      pendingSourceWindowStartMs: null,
      pendingSourceWindowEndMs: null,
      completedAtMs: publishedAtMs,
      updatedAtMs: publishedAtMs,
      nextAttemptAtMs: TERMINAL_NEXT_ATTEMPT_AT_MS,
      leaseOwner: null,
      leaseExpiresAtMs: null,
      lastSafeErrorCode: null,
      expiresAtMs: requestExpiresAtMs(publishedAtMs),
    };
    transaction.set(requestRef, withUserIndexMaterializerExpiration(requestUpdate), { merge: true });
    return true;
  });
}

export async function failUserIndexMaterializerRequest(input: {
  requestId: string;
  workerId: string;
  nowMs: number;
  safeErrorCode: string;
}) {
  const db = requireMaterializerDatabase();
  const ref = db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests).doc(input.requestId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const next = resolveUserIndexMaterializerFailure({
      request: snapshot.data() as UserIndexMaterializerOutboxRequest,
      workerId: input.workerId,
      nowMs: input.nowMs,
      safeErrorCode: input.safeErrorCode,
    });
    if (!next) return false;
    transaction.set(ref, withUserIndexMaterializerExpiration(next), { merge: true });
    return true;
  });
}

export async function writeUserIndexMaterializerWindowReceipt(
  inputReceipt: UserIndexMaterializerWindowReceipt,
) {
  const receipt = deriveUserIndexMaterializerWindowReceipt(inputReceipt);
  if (!hasValidUserIndexMaterializerReceiptShape(receipt)) {
    throw new Error("invalid_user_index_materializer_window_receipt");
  }
  const db = requireMaterializerDatabase();
  const receiptRef = db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerWindows).doc(receipt.windowId);
  const activationRef = db.collection(USER_INDEX_COLLECTIONS.userIndexMaterializerState)
    .doc(USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID);
  await db.runTransaction(async (transaction) => {
    const activationSnapshot = receipt.mode === "shadow" ? await transaction.get(activationRef) : null;
    transaction.set(receiptRef, withUserIndexMaterializerExpiration(receipt), { merge: false });
    if (receipt.mode !== "shadow") return;
    const current = activationSnapshot?.exists
      ? activationSnapshot.data() as UserIndexMaterializerActivationState
      : null;
    const next = buildNextUserIndexMaterializerActivationState({ current, receipt });
    if (next && next !== current) transaction.set(activationRef, next, { merge: false });
  });
}
