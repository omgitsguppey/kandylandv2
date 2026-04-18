import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "./firebase-admin";
import {
  buildNotificationDispatchStableId,
  buildRuntimeWarningStableId,
  NOTIFICATION_DISPATCH_OUTCOME_COLLECTION,
  QUEUE_JOB_HEARTBEAT_COLLECTION,
  RUNTIME_WARNING_COLLECTION,
  type NotificationDispatchOutcome,
  type NotificationDispatchOutcomeStatus,
  type QueueJobHeartbeat,
  type QueueJobId,
  type QueueJobStatus,
  type RuntimeWarningExecutionLayer,
  type RuntimeWarningSeverity,
  type RuntimeWarningStatus,
} from "../../../shared/runtime/runtime-warning-contract";

function sanitizeDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(detail).slice(0, 20).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.slice(0, 500)];
      }

      if (typeof value === "number" || typeof value === "boolean" || value === null) {
        return [key, value];
      }

      try {
        return [key, JSON.stringify(value).slice(0, 500)];
      } catch {
        return [key, String(value).slice(0, 500)];
      }
    }),
  );
}

export async function recordRuntimeWarning(input: {
  code: string;
  severity: RuntimeWarningSeverity;
  surface: string;
  moduleKey?: string | null;
  executionLayer: RuntimeWarningExecutionLayer;
  status: RuntimeWarningStatus;
  detail?: Record<string, unknown>;
  freshnessKey?: string | null;
}) {
  if (!adminDb) {
    return;
  }

  const now = Date.now();
  const stableId = buildRuntimeWarningStableId(input);
  const ref = adminDb.collection(RUNTIME_WARNING_COLLECTION).doc(stableId);

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists ? snapshot.data() as Record<string, unknown> : {};
    transaction.set(ref, {
      stable_id: stableId,
      code: input.code,
      severity: input.severity,
      surface: input.surface,
      moduleKey: input.moduleKey ?? null,
      executionLayer: input.executionLayer,
      status: input.status,
      detail: sanitizeDetail(input.detail),
      freshnessKey: input.freshnessKey ?? null,
      firstSeenAt: Number(existing.firstSeenAt) > 0 ? Number(existing.firstSeenAt) : now,
      lastSeenAt: now,
      occurrenceCount: (Number(existing.occurrenceCount) || 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtMs: now,
    }, { merge: true });
  });
}

export async function recordQueueJobHeartbeat(input: {
  jobId: QueueJobId;
  executionLayer: RuntimeWarningExecutionLayer;
  surface: string;
  startedAt: number;
  completedAt: number | null;
  status: QueueJobStatus;
  durationMs: number;
  itemsScanned: number;
  itemsChanged: number;
  warnings: string[];
  lastErrorCode?: string | null;
  staleAfterMs: number;
}) {
  if (!adminDb) {
    return;
  }

  const heartbeat: QueueJobHeartbeat = {
    jobId: input.jobId,
    executionLayer: input.executionLayer,
    surface: input.surface,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    status: input.status,
    durationMs: input.durationMs,
    itemsScanned: input.itemsScanned,
    itemsChanged: input.itemsChanged,
    warnings: [...input.warnings],
    lastErrorCode: input.lastErrorCode ?? null,
    staleAfterMs: input.staleAfterMs,
    updatedAt: Date.now(),
  };

  await adminDb.collection(QUEUE_JOB_HEARTBEAT_COLLECTION).doc(input.jobId).set(heartbeat, { merge: true });
}

export async function recordNotificationDispatchOutcome(input: {
  activationKey: string;
  dropId: string;
  status: NotificationDispatchOutcomeStatus;
  errorCode?: string | null;
  detail?: Record<string, unknown>;
}) {
  if (!adminDb) {
    return;
  }

  const now = Date.now();
  const outcome: NotificationDispatchOutcome = {
    stable_id: buildNotificationDispatchStableId(input.activationKey),
    activationKey: input.activationKey,
    dropId: input.dropId,
    status: input.status,
    errorCode: input.errorCode ?? null,
    detail: sanitizeDetail(input.detail),
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.collection(NOTIFICATION_DISPATCH_OUTCOME_COLLECTION).doc(outcome.stable_id).set({
    ...outcome,
    updatedAtServer: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function listRuntimeWarnings(limitCount = 50) {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection(RUNTIME_WARNING_COLLECTION)
    .orderBy("lastSeenAt", "desc")
    .limit(limitCount)
    .get();
  return snapshot.docs.map((doc) => doc.data() as Record<string, unknown>);
}

export async function listQueueJobHeartbeats() {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection(QUEUE_JOB_HEARTBEAT_COLLECTION).get();
  return snapshot.docs.map((doc) => doc.data() as QueueJobHeartbeat);
}

export async function listNotificationDispatchOutcomes(limitCount = 50) {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection(NOTIFICATION_DISPATCH_OUTCOME_COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(limitCount)
    .get();
  return snapshot.docs.map((doc) => doc.data() as NotificationDispatchOutcome);
}
