import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import {
  buildNotifyActiveDropsLifecyclePlan,
  buildProcessQueueLifecyclePlan,
  type ActivationDropRuntime,
  type QueuedDropRuntime,
} from "../../../shared/runtime/queue-runtime";
import {
  QUEUE_RUNTIME_WARNING_CODES,
  type RuntimeWarningExecutionLayer,
} from "../../../shared/runtime/runtime-warning-contract";
import { getFiniteDropTimestamp } from "@/lib/drop-status";
import { mapWithConcurrency } from "@/lib/server/bounded-concurrency";
import { getResolvedQueueConfig } from "@/lib/server/drop-queue";
import { markDropsRuntimeChanged } from "@/lib/server/drop-runtime";
import { adminDb } from "@/lib/server/firebase-admin";
import { sendTargetedDropNotification } from "@/lib/server/push-notifications";
import { buildQueuedDropsMap } from "@/lib/server/process-queue-drops";
import {
  recordNotificationDispatchOutcome,
  recordQueueJobHeartbeat,
  recordRuntimeWarning,
} from "@/lib/server/runtime-warning-store";

const DROP_LIFECYCLE_DUE_LIMIT = 250;
const DROP_OWNER_EXCLUSION_SCAN_LIMIT = 5_000;
const DROP_OWNER_LOOKUP_CONCURRENCY = 8;
const dueNotificationRecipientMode = "due_only_idempotent_activation_key";

async function recordInvariantWarnings(input: {
  invariants: Array<{ code: string; severity: "warn" | "error"; message: string; dropId?: string; detail?: Record<string, unknown> }>;
  executionLayer: RuntimeWarningExecutionLayer;
  surface: string;
}) {
  await Promise.allSettled(
    input.invariants.map((invariant) =>
      recordRuntimeWarning({
        code: invariant.code,
        severity: invariant.severity,
        surface: input.surface,
        moduleKey: invariant.dropId ?? "queue",
        executionLayer: input.executionLayer,
        status: invariant.severity === "error" ? "failed" : "degraded",
        detail: {
          message: invariant.message,
          ...(invariant.detail ?? {}),
        },
      }),
    ),
  );
}

export async function processQueueLifecycleRuntime(input: {
  executionLayer: RuntimeWarningExecutionLayer;
  surface: string;
  staleAfterMs: number;
}) {
  const startedAt = Date.now();
  await recordQueueJobHeartbeat({
    jobId: "process_queue",
    executionLayer: input.executionLayer,
    surface: input.surface,
    startedAt,
    completedAt: null,
    status: "running",
    durationMs: 0,
    itemsScanned: 0,
    itemsChanged: 0,
    warnings: [],
    staleAfterMs: input.staleAfterMs,
  });

  try {
    if (!adminDb) {
      throw new Error("Database not available");
    }

    const config = await getResolvedQueueConfig();
    if (!config.queue || config.queue.length === 0) {
      const completedAt = Date.now();
      await recordQueueJobHeartbeat({
        jobId: "process_queue",
        executionLayer: input.executionLayer,
        surface: input.surface,
        startedAt,
        completedAt,
        status: "ok",
        durationMs: completedAt - startedAt,
        itemsScanned: 0,
        itemsChanged: 0,
        warnings: [],
        staleAfterMs: input.staleAfterMs,
      });
      return { message: "Queue is empty", updates: [], lifecycleReconciled: [], invariants: [] };
    }

    const dropsRef = adminDb.collection("drops");
    const dropsMap = await buildQueuedDropsMap({
      dropIds: config.queue,
      createRef: (dropId) => dropsRef.doc(dropId),
      getAll: (...refs) => adminDb.getAll(...refs),
      materialize: (doc): QueuedDropRuntime | null => {
        const data = doc.data();
        if (!data) {
          return null;
        }

        return {
          id: doc.id,
          validFrom: getFiniteDropTimestamp(data.validFrom),
          validUntil: getFiniteDropTimestamp(data.validUntil),
          activationCount: Number.isFinite(Number(data.activationCount)) ? Number(data.activationCount) : 0,
          status: data.status === "active" || data.status === "expired" || data.status === "scheduled"
            ? data.status
            : null,
        };
      },
    });

    const now = Date.now();
    const plan = buildProcessQueueLifecyclePlan({
      config,
      dropsById: dropsMap,
      now,
    });

    await recordInvariantWarnings({
      invariants: plan.invariants,
      executionLayer: input.executionLayer,
      surface: input.surface,
    });

    if (plan.pendingUpdates.size > 0) {
      const batch = adminDb.batch();
      for (const [dropId, update] of plan.pendingUpdates) {
        batch.update(dropsRef.doc(dropId), update);
      }
      markDropsRuntimeChanged(batch, now);
      await batch.commit();
    }

    const completedAt = Date.now();
    await recordQueueJobHeartbeat({
      jobId: "process_queue",
      executionLayer: input.executionLayer,
      surface: input.surface,
      startedAt,
      completedAt,
      status: plan.invariants.some((entry) => entry.severity === "error") ? "warn" : "ok",
      durationMs: completedAt - startedAt,
      itemsScanned: plan.itemsScanned,
      itemsChanged: plan.itemsChanged,
      warnings: plan.invariants.map((entry) => entry.code),
      staleAfterMs: input.staleAfterMs,
    });

    return {
      message: plan.scheduledUpdates.length > 0
        ? `Scheduled ${plan.scheduledUpdates.length} drops`
        : plan.lifecycleReconciled.length > 0
          ? `Reconciled ${plan.lifecycleReconciled.length} queued drop statuses`
          : "No drops eligible for scheduling at this time.",
      updates: plan.scheduledUpdates,
      lifecycleReconciled: plan.lifecycleReconciled,
      invariants: plan.invariants,
    };
  } catch (error) {
    const completedAt = Date.now();
    await recordRuntimeWarning({
      code: "queue_runtime_failed",
      severity: "error",
      surface: input.surface,
      executionLayer: input.executionLayer,
      status: "failed",
      detail: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    await recordQueueJobHeartbeat({
      jobId: "process_queue",
      executionLayer: input.executionLayer,
      surface: input.surface,
      startedAt,
      completedAt,
      status: "failed",
      durationMs: completedAt - startedAt,
      itemsScanned: 0,
      itemsChanged: 0,
      warnings: ["queue_runtime_failed"],
      lastErrorCode: "queue_runtime_failed",
      staleAfterMs: input.staleAfterMs,
    });
    throw error;
  }
}

export async function notifyActiveDropsRuntime(input: {
  executionLayer: RuntimeWarningExecutionLayer;
  surface: string;
  staleAfterMs: number;
}) {
  const startedAt = Date.now();
  await recordQueueJobHeartbeat({
    jobId: "notify_active_drops",
    executionLayer: input.executionLayer,
    surface: input.surface,
    startedAt,
    completedAt: null,
    status: "running",
    durationMs: 0,
    itemsScanned: 0,
    itemsChanged: 0,
    warnings: [],
    staleAfterMs: input.staleAfterMs,
  });

  try {
    if (!adminDb) {
      throw new Error("Database not available");
    }

    const now = Date.now();
    const dropsRef = adminDb.collection("drops");
    const [scheduledSnap, activeSnap] = await Promise.all([
      dropsRef
        .where("status", "==", "scheduled")
        .where("validFrom", "<=", now)
        .orderBy("validFrom", "asc")
        .limit(DROP_LIFECYCLE_DUE_LIMIT)
        .get(),
      dropsRef
        .where("status", "==", "active")
        .where("validUntil", "<=", now)
        .orderBy("validUntil", "asc")
        .limit(DROP_LIFECYCLE_DUE_LIMIT)
        .get(),
    ]);

    const toRuntimeDrop = (
      doc: FirebaseFirestore.QueryDocumentSnapshot,
      status: "scheduled" | "active",
    ): ActivationDropRuntime => {
      const data = (doc.data() || {}) as Record<string, unknown>;
      return {
        id: doc.id,
        validFrom: getFiniteDropTimestamp(data.validFrom),
        validUntil: getFiniteDropTimestamp(data.validUntil),
        activationCount: Number.isFinite(Number(data.activationCount)) ? Number(data.activationCount) : 0,
        imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : undefined,
        title: typeof data.title === "string" && data.title.trim().length > 0 ? data.title : doc.id,
        status,
        autoQueueOnExpire: data.autoQueueOnExpire === true,
      };
    };

    const plan = buildNotifyActiveDropsLifecyclePlan({
      scheduledDrops: scheduledSnap.docs.map((doc) => toRuntimeDrop(doc, "scheduled")),
      activeDrops: activeSnap.docs.map((doc) => toRuntimeDrop(doc, "active")),
      now,
    });

    await recordInvariantWarnings({
      invariants: plan.invariants,
      executionLayer: input.executionLayer,
      surface: input.surface,
    });

    if (plan.statusUpdates.size > 0 || plan.autoQueuedDropIds.size > 0) {
      const batch = adminDb.batch();
      for (const [dropId, update] of plan.statusUpdates) {
        batch.update(dropsRef.doc(dropId), update);
      }
      if (plan.autoQueuedDropIds.size > 0) {
        batch.set(adminDb.collection("adminSettings").doc("dropQueue"), {
          queue: FieldValue.arrayUnion(...Array.from(plan.autoQueuedDropIds)),
        }, { merge: true });
      }
      markDropsRuntimeChanged(batch, now);
      await batch.commit();
    }

    const warningCodes = plan.invariants.map((entry) => entry.code);

    // ⚡ Bolt: Resolve N+1 query pattern by pre-fetching owners concurrently
    const uniqueDropIds = Array.from(new Set(plan.activationNotifications.map(n => n.dropId)));
    const ownersMap = new Map<string, { excludedUserIds: string[]; error?: unknown }>();

    await mapWithConcurrency(
      uniqueDropIds,
      DROP_OWNER_LOOKUP_CONCURRENCY,
      async (dropId) => {
        try {
          const ownersSnap = await adminDb.collection("users")
            .where("unlockedContent", "array-contains", dropId)
            .select() // ⚡ Bolt: Optimize I/O by only returning document IDs
            .limit(DROP_OWNER_EXCLUSION_SCAN_LIMIT)
            .get();

          const excludedUserIds: string[] = [];
          ownersSnap.forEach((userDoc) => excludedUserIds.push(userDoc.id));
          ownersMap.set(dropId, { excludedUserIds });
        } catch (error) {
          ownersMap.set(dropId, { excludedUserIds: [], error });
        }
      },
    );

    for (const notification of plan.activationNotifications) {
      const lookup = ownersMap.get(notification.dropId) || { excludedUserIds: [] };
      const excludedUserIds = lookup.excludedUserIds;

      if (lookup.error) {
        warningCodes.push("owner_lookup_failed");
        await recordRuntimeWarning({
          code: "owner_lookup_failed",
          severity: "warn",
          surface: input.surface,
          moduleKey: notification.dropId,
          executionLayer: input.executionLayer,
          status: "degraded",
          detail: {
            activationKey: notification.activationKey,
            dueNotificationRecipientMode,
            message: lookup.error instanceof Error ? lookup.error.message : String(lookup.error),
          },
        });
      }

      const outcome = await sendTargetedDropNotification(
        notification.dropTitle,
        notification.dropId,
        notification.imageUrl,
        notification.isReturn,
        excludedUserIds,
        notification.activationKey,
      );

      if (!outcome) {
        warningCodes.push(QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome);
        await recordRuntimeWarning({
          code: QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome,
          severity: "error",
          surface: input.surface,
          moduleKey: notification.dropId,
          executionLayer: input.executionLayer,
          status: "failed",
          detail: {
            activationKey: notification.activationKey,
            dueNotificationRecipientMode,
          },
        });
        await recordNotificationDispatchOutcome({
          activationKey: notification.activationKey,
          dropId: notification.dropId,
          status: "failed",
          errorCode: QUEUE_RUNTIME_WARNING_CODES.activationMissingOutcome,
        });
        continue;
      }

      if (outcome.status === "failed") {
        warningCodes.push(QUEUE_RUNTIME_WARNING_CODES.notificationDispatchFailed);
      }
    }

    const completedAt = Date.now();
    await recordQueueJobHeartbeat({
      jobId: "notify_active_drops",
      executionLayer: input.executionLayer,
      surface: input.surface,
      startedAt,
      completedAt,
      status: warningCodes.length > 0 ? "warn" : "ok",
      durationMs: completedAt - startedAt,
      itemsScanned: plan.itemsScanned,
      itemsChanged: plan.itemsChanged,
      warnings: warningCodes,
      staleAfterMs: input.staleAfterMs,
    });

    return {
      message: `Activated ${plan.activatedDrops.length} drops, expired ${plan.expiredDrops.length} drops, and reconciled lifecycle status.`,
      activatedDrops: plan.activatedDrops,
      expiredDrops: plan.expiredDrops,
      autoQueuedDrops: Array.from(plan.autoQueuedDropIds),
      invariants: plan.invariants,
    };
  } catch (error) {
    const completedAt = Date.now();
    await recordRuntimeWarning({
      code: "notify_active_drops_failed",
      severity: "error",
      surface: input.surface,
      executionLayer: input.executionLayer,
      status: "failed",
      detail: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    await recordQueueJobHeartbeat({
      jobId: "notify_active_drops",
      executionLayer: input.executionLayer,
      surface: input.surface,
      startedAt,
      completedAt,
      status: "failed",
      durationMs: completedAt - startedAt,
      itemsScanned: 0,
      itemsChanged: 0,
      warnings: ["notify_active_drops_failed"],
      lastErrorCode: "notify_active_drops_failed",
      staleAfterMs: input.staleAfterMs,
    });
    throw error;
  }
}
