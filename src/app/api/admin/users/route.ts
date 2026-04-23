import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { ADMIN } from "@/lib/server/rate-limit";
import { BUILT_IN_DAILY_TASK_MAP } from "@/lib/tasks/task-catalog";
import { getDropReferenceMap } from "@/lib/server/drop-references";
import { trackServerEvent } from "@/lib/server/analytics";
import { guardApiRequest } from "@/lib/server/request-guard";
import { normalizeGumdropBalance } from "@/lib/gumdrop-ledger";
import { buildCompletedGumdropTransaction } from "@/lib/server/gumdrop-ledger";
import { CREATOR_COLLECTIONS } from "@/lib/creator-experiences";
import { sanitizeCreatorRestrictionsUpdate, sanitizeCreatorSettingsUpdate } from "@/lib/server/creator-experiences";
import { normalizeCreatorApplication, sanitizeCreatorApplicationUpdate } from "@/lib/creator-application";
import {
  buildCreatorOnboardingCanonicalRecord,
  buildCreatorOnboardingUserProjection,
  normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import {
  buildCreatorOnboardingStatusChangeHistoryEntries,
  CREATOR_ONBOARDING_COLLECTION,
  CreatorOnboardingActor,
  isCreatorOwnerEmail,
  recordCreatorOnboardingHistoryEntries,
  shouldActivateCreatorRole,
  syncCreatorOnboardingDocuments,
} from "@/lib/server/creator-onboarding";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";
import {
  buildCommerceMetricsFromRollup,
  buildEmptyCommerceMetrics,
} from "@/lib/admin-user-commerce";
import {
  buildAdminUserMetricIntegrity,
  scoreAdminUserEngagement,
  shouldRecoverAdminUserMetricsFromFacts,
} from "@/lib/admin-user-metrics";

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

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readUserRole(value: unknown): "user" | "creator" | "admin" {
  return value === "creator" || value === "admin" || value === "user" ? value : "user";
}

class InvalidCreatorApplicationUpdateError extends Error {}
class InvalidCreatorOnboardingTransitionError extends Error {}
class ForbiddenCreatorOnboardingActionError extends Error {}

function resolveCreatorApplicationUpdate(input: {
  patch: Record<string, unknown>;
  currentProjection: ReturnType<typeof normalizeCreatorApplication> | undefined;
  currentCanonical: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>;
  nowMs: number;
  reviewedBy: string | null;
}) {
  const baseProjection = input.currentProjection ?? buildCreatorOnboardingUserProjection(input.currentCanonical);
  const mergedSource: Record<string, unknown> = {
    ...baseProjection,
    ...input.patch,
    queuePosition: input.patch.queuePosition ?? baseProjection.queuePosition ?? input.currentCanonical.queuePosition,
    creatorDisplayName: input.patch.creatorDisplayName ?? baseProjection.creatorDisplayName ?? input.currentCanonical.creatorDisplayName,
    creatorPrimaryPlatform: input.patch.creatorPrimaryPlatform ?? baseProjection.creatorPrimaryPlatform ?? input.currentCanonical.creatorPrimaryPlatform,
    creatorContentFocus: input.patch.creatorContentFocus ?? baseProjection.creatorContentFocus ?? input.currentCanonical.creatorContentFocus,
  };

  const normalized = sanitizeCreatorApplicationUpdate(mergedSource, {
    nowMs: input.nowMs,
    reviewedBy: input.reviewedBy,
  });

  if (!normalized) {
    throw new InvalidCreatorApplicationUpdateError("Invalid creator application update.");
  }

  return normalized;
}

function buildCreatorApplicationAdminSource(
  current: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>,
  incoming: ReturnType<typeof sanitizeCreatorApplicationUpdate>,
  nowMs: number,
  actorLabel: string,
) {
  if (!incoming) {
    return current;
  }

  const nextSource: Record<string, unknown> = {
    ...current,
    ...incoming,
    updatedAt: nowMs,
    reviewedBy: actorLabel,
    lastAdminActionAt: nowMs,
    lastAdminActionBy: actorLabel,
    blockingReasons: undefined,
    readyForApproval: undefined,
    creatorReviewQueueVisible: undefined,
  };

  if (current.submissionStatus !== incoming.submissionStatus) {
    if (incoming.submissionStatus === "onboarding_submitted" && !current.onboardingSubmittedAt) {
      nextSource.onboardingSubmittedAt = nowMs;
    }
    if (incoming.submissionStatus === "awaiting_manual_review" && !current.awaitingManualReviewAt) {
      nextSource.awaitingManualReviewAt = nowMs;
    }
  }

  if (current.legalStatus !== incoming.legalStatus) {
    if (incoming.legalStatus === "legal_sent") {
      nextSource.legalDocumentSentAt = nowMs;
    }
    if (incoming.legalStatus === "legal_signed") {
      nextSource.legalDocumentSignedAt = nowMs;
    }
  }

  if (current.contractDocumentStatus !== incoming.contractDocumentStatus && incoming.contractDocumentStatus === "contract_sent") {
    nextSource.legalDocumentSentAt = nowMs;
  }

  if (current.creatorSignatureStatus !== incoming.creatorSignatureStatus && incoming.creatorSignatureStatus === "signature_signed") {
    nextSource.creatorContractSignedAt = nextSource.creatorContractSignedAt ?? nowMs;
  }

  if (current.adminSignatureStatus !== incoming.adminSignatureStatus && incoming.adminSignatureStatus === "signature_signed") {
    nextSource.adminContractSignedAt = nextSource.adminContractSignedAt ?? nowMs;
    nextSource.legalDocumentSignedAt = nowMs;
  }

  if (current.idVerificationStatus !== incoming.idVerificationStatus) {
    if (incoming.idVerificationStatus === "id_requested") {
      nextSource.idVerificationRequestedAt = nowMs;
    }
    if (incoming.idVerificationStatus === "id_verified" || incoming.idVerificationStatus === "id_rejected") {
      nextSource.idVerificationReviewedAt = nowMs;
    }
    if (incoming.idVerificationStatus === "id_requested" || incoming.idVerificationStatus === "id_not_requested") {
      nextSource.idVerificationSubmittedAt = undefined;
    }
  }

  if (current.approvalStatus !== incoming.approvalStatus && incoming.approvalStatus === "creator_rejected") {
    nextSource.rejectedAt = nowMs;
    nextSource.reapplyAvailableAt = nowMs + (30 * 24 * 60 * 60 * 1000);
  }

  if (current.ownerOverrideActive !== incoming.ownerOverrideActive) {
    if (incoming.ownerOverrideActive) {
      nextSource.ownerOverrideAt = nowMs;
      nextSource.ownerOverrideBy = actorLabel;
    }
  }

  if (current.legallyClearedAt !== incoming.legallyClearedAt) {
    if (incoming.legallyClearedAt) {
      nextSource.legallyClearedAt = nowMs;
      nextSource.legallyClearedBy = actorLabel;
    } else {
      nextSource.legallyClearedAt = undefined;
      nextSource.legallyClearedBy = undefined;
      nextSource.agreementBasis = undefined;
    }
  }

  return nextSource;
}

function buildCreatorLifecycleEvents(input: {
  before: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>;
  after: NonNullable<ReturnType<typeof normalizeCreatorOnboardingCanonicalRecord>>;
}) {
  const events: Array<
    | "creator_legal_sent"
    | "creator_legal_signed"
    | "creator_id_requested"
    | "creator_id_verified"
    | "creator_id_rejected"
    | "creator_segment_assigned"
    | "creator_approved"
    | "creator_rejected"
    | "creator_needs_changes"
    | "creator_role_activated"
    | "creator_role_activation_blocked"
    | "owner_override_applied"
    | "owner_override_cleared"
    | "creator_legally_cleared_override"
  > = [];

  if (!input.before.legallyClearedAt && input.after.legallyClearedAt) {
    events.push("creator_legally_cleared_override");
  }

  if (input.before.legalStatus !== input.after.legalStatus) {
    if (input.after.legalStatus === "legal_sent") {
      events.push("creator_legal_sent");
    } else if (input.after.legalStatus === "legal_signed") {
      events.push("creator_legal_signed");
    }
  }

  if (input.before.idVerificationStatus !== input.after.idVerificationStatus) {
    if (input.after.idVerificationStatus === "id_requested") {
      events.push("creator_id_requested");
    } else if (input.after.idVerificationStatus === "id_verified") {
      events.push("creator_id_verified");
    } else if (input.after.idVerificationStatus === "id_rejected") {
      events.push("creator_id_rejected");
    }
  }

  if (
    input.before.segmentationStatus !== input.after.segmentationStatus
    && input.after.segmentationStatus === "segment_assigned"
  ) {
    events.push("creator_segment_assigned");
  }

  if (input.before.approvalStatus !== input.after.approvalStatus) {
    if (input.after.approvalStatus === "creator_approved") {
      events.push("creator_approved");
    } else if (input.after.approvalStatus === "creator_rejected") {
      events.push("creator_rejected");
    } else if (input.after.approvalStatus === "creator_needs_changes") {
      events.push("creator_needs_changes");
    }
  }

  if (input.before.ownerOverrideActive !== input.after.ownerOverrideActive) {
    if (input.after.ownerOverrideActive) {
      events.push("owner_override_applied");
    } else {
      events.push("owner_override_cleared");
    }
  }

  if (input.before.role !== "creator" && input.after.role === "creator") {
    events.push("creator_role_activated");
  }

  if (
    input.after.approvalStatus === "creator_approved"
    && input.after.role !== "creator"
    && (input.before.approvalStatus !== "creator_approved" || input.before.role === "creator")
  ) {
    events.push("creator_role_activation_blocked");
  }

  return events;
}

async function emitCreatorLifecycleTelemetry(
  events: ReturnType<typeof buildCreatorLifecycleEvents>,
  userId: string,
) {
  await Promise.allSettled(events.map((eventName) => {
    const payload = {
      page_path: `/admin/user/${userId}`,
    };

    switch (eventName) {
      case "creator_legal_sent":
        return trackServerEvent("creator_legal_sent", payload, userId);
      case "creator_legal_signed":
        return trackServerEvent("creator_legal_signed", payload, userId);
      case "creator_id_requested":
        return trackServerEvent("creator_id_requested", payload, userId);
      case "creator_id_verified":
        return trackServerEvent("creator_id_verified", payload, userId);
      case "creator_id_rejected":
        return trackServerEvent("creator_id_rejected", payload, userId);
      case "creator_segment_assigned":
        return trackServerEvent("creator_segment_assigned", payload, userId);
      case "creator_role_activated":
        return trackServerEvent("creator_role_activated", payload, userId);
      case "creator_role_activation_blocked":
        return trackServerEvent("creator_role_activation_blocked", payload, userId);
      case "owner_override_applied":
        return trackServerEvent("owner_override_applied", payload, userId);
      case "owner_override_cleared":
        return trackServerEvent("owner_override_cleared", payload, userId);
      case "creator_legally_cleared_override":
        return trackServerEvent("creator_legally_cleared_override", payload, userId);
      case "creator_approved":
        return trackServerEvent("creator_approved", payload, userId);
      case "creator_rejected":
        return trackServerEvent("creator_rejected", payload, userId);
      case "creator_needs_changes":
        return trackServerEvent("creator_needs_changes", payload, userId);
      default:
        return Promise.resolve();
    }
  }));
}

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

type CreatorOnboardingDiagnosticEntry = {
  severity: "warn";
  message: string;
  detail: Record<string, unknown>;
};

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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readMetric(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function serializeUserDoc(id: string, raw: Record<string, unknown>) {
  const notificationSettings = raw.notificationSettings && typeof raw.notificationSettings === "object"
    ? raw.notificationSettings as Record<string, unknown>
    : {};
  const securityFlags = raw.securityFlags && typeof raw.securityFlags === "object"
    ? raw.securityFlags as Record<string, unknown>
    : {};
  const dailyTasksState = raw.dailyTasksState && typeof raw.dailyTasksState === "object"
    ? raw.dailyTasksState as Record<string, unknown>
    : {};

  const hydratedTasks = Array.isArray(dailyTasksState.tasks)
    ? dailyTasksState.tasks.map((task) => {
      if (!task || typeof task !== "object") {
        return task;
      }

      const sourceTask = task as Record<string, unknown>;
      const definition = typeof sourceTask.id === "string" ? BUILT_IN_DAILY_TASK_MAP[sourceTask.id] : undefined;

      return {
        ...sourceTask,
        title: typeof sourceTask.title === "string" ? sourceTask.title : definition?.title ?? "",
        subtitle: typeof sourceTask.subtitle === "string" ? sourceTask.subtitle : definition?.subtitle ?? "",
        reward: Number.isFinite(sourceTask.reward) ? Number(sourceTask.reward) : definition?.reward ?? 0,
        maxProgress: Number.isFinite(sourceTask.maxProgress)
          ? Number(sourceTask.maxProgress)
          : definition?.maxProgress ?? 1,
        eventName: typeof sourceTask.eventName === "string" ? sourceTask.eventName : definition?.eventName ?? "",
        actionType: typeof sourceTask.actionType === "string"
          ? sourceTask.actionType
          : definition?.actionType ?? "open_experiences",
        ctaLabel: typeof sourceTask.ctaLabel === "string" ? sourceTask.ctaLabel : definition?.ctaLabel ?? "Keep going",
        icon: typeof sourceTask.icon === "string" ? sourceTask.icon : definition?.icon ?? "gift",
        group: typeof sourceTask.group === "string" ? sourceTask.group : definition?.group ?? "visit",
      };
    })
    : [];

  return {
    uid: typeof raw.uid === "string" ? raw.uid : id,
    email: typeof raw.email === "string" || raw.email === null ? raw.email : null,
    displayName: typeof raw.displayName === "string" || raw.displayName === null ? raw.displayName : null,
    username: typeof raw.username === "string" ? raw.username : "",
    photoURL: typeof raw.photoURL === "string" || raw.photoURL === null ? raw.photoURL : null,
    role: raw.role === "admin" || raw.role === "creator" || raw.role === "user" ? raw.role : "user",
    isVerified: raw.isVerified === true,
    gumDropsBalance: typeof raw.gumDropsBalance === "number" ? raw.gumDropsBalance : 0,
    unlockedContent: toStringArray(raw.unlockedContent),
    createdAt: toTimestampNumber(raw.createdAt),
    lastCheckIn: toTimestampNumber(raw.lastCheckIn),
    streakCount: typeof raw.streakCount === "number" ? raw.streakCount : 0,
    status: raw.status === "suspended" || raw.status === "banned" || raw.status === "active" ? raw.status : "active",
    statusReason: typeof raw.statusReason === "string" ? raw.statusReason : "",
    onboardingCompleted: raw.onboardingCompleted === true,
    notificationSettings: {
      inAppEnabled: notificationSettings.inAppEnabled !== false,
      browserPushEnabled: notificationSettings.browserPushEnabled === true,
      newDropAlerts: notificationSettings.newDropAlerts !== false,
      expiringSoonAlerts: notificationSettings.expiringSoonAlerts !== false,
    },
    securityFlags: {
      ripAttempts: typeof securityFlags.ripAttempts === "number" ? securityFlags.ripAttempts : 0,
      lastViolation: typeof securityFlags.lastViolation === "string" ? securityFlags.lastViolation : undefined,
      lastViolationReason: typeof securityFlags.lastViolationReason === "string" ? securityFlags.lastViolationReason : undefined,
      lastViolationDropId: typeof securityFlags.lastViolationDropId === "string" ? securityFlags.lastViolationDropId : undefined,
      lastViolationMessage: typeof securityFlags.lastViolationMessage === "string" ? securityFlags.lastViolationMessage : undefined,
      reasonCounts: securityFlags.reasonCounts && typeof securityFlags.reasonCounts === "object"
        ? Object.fromEntries(
          Object.entries(securityFlags.reasonCounts as Record<string, unknown>)
            .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
            .map(([key, value]) => [key, Number(value)]),
        )
        : undefined,
    },
    dailyTasksState: {
      tasks: hydratedTasks,
      nextRefreshMs: toTimestampNumber(dailyTasksState.nextRefreshMs),
      lastProgressAt: toTimestampNumber(dailyTasksState.lastProgressAt),
      lastResetMs: toTimestampNumber(dailyTasksState.lastResetMs),
      lastDeadlineReminderAt: toTimestampNumber(dailyTasksState.lastDeadlineReminderAt),
      completedTaskHistory:
        dailyTasksState.completedTaskHistory && typeof dailyTasksState.completedTaskHistory === "object"
          ? dailyTasksState.completedTaskHistory
          : {},
      retiredTaskIds: toStringArray(dailyTasksState.retiredTaskIds),
    },
    creatorApplication: normalizeCreatorApplication(raw.creatorApplication),
  };
}

export async function GET(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/users",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const [
      usersSnapshot,
      analyticsSnapshot,
      userDailySnapshot,
      commerceSummarySnap,
      creatorRelationshipsSnap,
      creatorSubscriptionsSnap,
      creatorRequestsSnap,
      creatorBookingsSnap,
      creatorPayoutsSnap,
      creatorThreadsSnap,
      creatorAccrualsSnap,
      pendingCreatorDropsSnap,
    ] = await Promise.all([
      adminDb.collection("users").orderBy("createdAt", "desc").get(),
      adminDb.collection("analytics_users_rollup").get(),
      adminDb.collection("analytics_user_daily").get(),
      adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
      adminDb.collection(CREATOR_COLLECTIONS.relationships).get(),
      adminDb.collection(CREATOR_COLLECTIONS.subscriptions).get(),
      adminDb.collection(CREATOR_COLLECTIONS.requests).get(),
      adminDb.collection(CREATOR_COLLECTIONS.bookings).get(),
      adminDb.collection(CREATOR_COLLECTIONS.payoutRequests).get(),
      adminDb.collection(CREATOR_COLLECTIONS.messageThreads).get(),
      adminDb.collection(CREATOR_COLLECTIONS.ledgerAccruals).get(),
      adminDb.collection("drops").where("approvalStatus", "==", "pending_review").get(),
    ]);

    const users = usersSnapshot.docs.map((doc) => serializeUserDoc(doc.id, doc.data()));
    const rollupUserIds = new Set(analyticsSnapshot.docs.map((doc) => doc.id));
    const creatorOpsByUser = new Map<string, CreatorOpsAggregate>();

    const readCreatorOps = (creatorId: string) => {
      const current = creatorOpsByUser.get(creatorId) ?? buildEmptyCreatorOpsAggregate();
      creatorOpsByUser.set(creatorId, current);
      return current;
    };

    creatorRelationshipsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
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
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "active") {
        current.activeSubscribers += 1;
      }
    });

    creatorRequestsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "pending") {
        current.openRequests += 1;
      }
    });

    creatorBookingsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "booked") {
        current.bookedCalls += 1;
      }
    });

    creatorPayoutsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      if (raw.status === "pending") {
        current.pendingPayouts += 1;
        current.pendingCashoutGd += Math.round(readMetric(raw, "requestedGd"));
      }
    });

    creatorThreadsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      current.openThreads += 1;
    });

    creatorAccrualsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.creatorId === "string" ? raw.creatorId : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      current.totalAccruedGd += Math.round(readMetric(raw, "creatorShareGd"));
    });

    pendingCreatorDropsSnap.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const creatorId = typeof raw.submittedByCreatorId === "string"
        ? raw.submittedByCreatorId
        : typeof raw.creatorId === "string"
          ? raw.creatorId
          : "";
      if (!creatorId) {
        return;
      }

      const current = readCreatorOps(creatorId);
      current.pendingDropSubmissions += 1;
    });

    const dailyAnalyticsByUser = new Map<string, UserDailyAggregate>();
    userDailySnapshot.docs.forEach((doc) => {
      const raw = doc.data() as Record<string, unknown>;
      const uid = typeof raw.uid === "string" ? raw.uid : "";
      if (!uid) {
        return;
      }

      const current = dailyAnalyticsByUser.get(uid) ?? buildEmptyDailyAggregate();
      current.eventCount += Math.round(readMetric(raw, "eventCount"));
      current.sessionCount += Math.round(readMetric(raw, "sessionCount"));
      current.viewCount += Math.round(readMetric(raw, "viewCount"));
      current.engagedViewCount += Math.round(readMetric(raw, "engagedViewCount"));
      current.passiveViewCount += Math.round(readMetric(raw, "passiveViewCount"));
      current.bounceCount += Math.round(readMetric(raw, "bounceCount"));
      current.unwrapCount += Math.round(readMetric(raw, "unwrapCount"));
      current.unlockCount += Math.round(readMetric(raw, "unlockCount"));
      current.purchaseCount += Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));
      current.authSuccessCount += Math.round(readMetric(raw, "authSuccessCount", "signInCount"));
      current.onboardingStartCount += Math.round(readMetric(raw, "onboardingStartCount", "guidedOnboardingStartCount"));
      current.onboardingCompletionCount += Math.round(readMetric(raw, "onboardingCompletionCount", "guidedOnboardingCompletionCount"));
      current.watchSecondsTotal += Math.round(readMetric(raw, "watchSecondsTotal"));
      current.loadMsTotal += Math.round(readMetric(raw, "loadMsTotal"));
      current.loadSampleCount += Math.round(readMetric(raw, "loadSampleCount"));
      current.spendGdTotal += Math.round(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"));
      current.revenueCentsTotal += Math.round(readMetric(raw, "revenueCentsTotal"));
      current.grossRevenueUsdTotal += readMetric(raw, "grossRevenueUsdTotal");
      current.paypalFeeUsdTotal += readMetric(raw, "paypalFeeUsdTotal");
      current.netRevenueUsdTotal += readMetric(raw, "netRevenueUsdTotal");
      current.adjustedProfitUsdTotal += readMetric(raw, "adjustedProfitUsdTotal");
      current.bonusValueUsdTotal += readMetric(raw, "bonusValueUsdTotal");
      current.bonusGumDropsTotal += Math.round(readMetric(raw, "bonusGumDropsTotal"));
      current.deliveredGumDropsTotal += Math.round(readMetric(raw, "deliveredGumDropsTotal"));
      current.paidGumDropsTotal += Math.round(readMetric(raw, "paidGumDropsTotal"));
      current.lastSeenAt = Math.max(current.lastSeenAt, toTimestampNumber(raw.lastSeenAt), toTimestampNumber(raw.lastSeenAtMs));
      current.lastPurchaseAt = Math.max(current.lastPurchaseAt, toTimestampNumber(raw.lastPurchaseAt));
      dailyAnalyticsByUser.set(uid, current);
    });

    const dailyUserIds = new Set(dailyAnalyticsByUser.keys());
    const analyticsByUser: Record<string, any> = Object.fromEntries(
      analyticsSnapshot.docs.map((doc) => {
        const raw = doc.data() as Record<string, unknown>;
        const dailyAggregate = dailyAnalyticsByUser.get(doc.id) ?? buildEmptyDailyAggregate();
        const loadSampleCount = typeof raw.loadSampleCount === "number" ? raw.loadSampleCount : 0;
        const loadMsTotal = typeof raw.loadMsTotal === "number" ? raw.loadMsTotal : 0;
        const watchSecondsTotal = typeof raw.watchSecondsTotal === "number" ? raw.watchSecondsTotal : 0;
        const mergedCommerceMetrics = buildCommerceMetricsFromRollup({
          ...dailyAggregate,
          ...raw,
          grossRevenueUsdTotal: Math.max(readMetric(raw, "grossRevenueUsdTotal"), dailyAggregate.grossRevenueUsdTotal),
          revenueCentsTotal: Math.max(readMetric(raw, "revenueCentsTotal"), dailyAggregate.revenueCentsTotal),
          paypalFeeUsdTotal: Math.max(readMetric(raw, "paypalFeeUsdTotal"), dailyAggregate.paypalFeeUsdTotal),
          netRevenueUsdTotal: Math.max(readMetric(raw, "netRevenueUsdTotal"), dailyAggregate.netRevenueUsdTotal),
          adjustedProfitUsdTotal: Math.max(readMetric(raw, "adjustedProfitUsdTotal"), dailyAggregate.adjustedProfitUsdTotal),
          bonusValueUsdTotal: Math.max(readMetric(raw, "bonusValueUsdTotal"), dailyAggregate.bonusValueUsdTotal),
          bonusGumDropsTotal: Math.max(readMetric(raw, "bonusGumDropsTotal"), dailyAggregate.bonusGumDropsTotal),
          deliveredGumDropsTotal: Math.max(readMetric(raw, "deliveredGumDropsTotal"), dailyAggregate.deliveredGumDropsTotal),
          paidGumDropsTotal: Math.max(readMetric(raw, "paidGumDropsTotal"), dailyAggregate.paidGumDropsTotal),
          spendGdTotal: Math.max(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"), dailyAggregate.spendGdTotal),
          purchaseCount: Math.max(readMetric(raw, "purchaseTransactionCount", "purchaseCount"), dailyAggregate.purchaseCount),
          lastPurchaseAt: Math.max(toTimestampNumber(raw.lastPurchaseAt), dailyAggregate.lastPurchaseAt),
        });
        const grossRevenueUsd = mergedCommerceMetrics.grossRevenueUsd;
        const adjustedProfitUsd = mergedCommerceMetrics.adjustedProfitUsd;
        const retailValueUsd = mergedCommerceMetrics.retailValueUsd;
        const bundleYieldRatio = retailValueUsd > 0 ? Number((grossRevenueUsd / retailValueUsd).toFixed(4)) : 0;
        const purchaseCount = Math.max(
          0,
          Math.round(Math.max(readMetric(raw, "purchaseTransactionCount", "purchaseCount"), dailyAggregate.purchaseCount)),
        );

        return [doc.id, {
          uid: doc.id,
          username: typeof raw.username === "string" ? raw.username : doc.id,
          eventCount: Math.max(typeof raw.eventCount === "number" ? raw.eventCount : 0, dailyAggregate.eventCount),
          sessionCount: Math.max(typeof raw.sessionCount === "number" ? raw.sessionCount : 0, dailyAggregate.sessionCount),
          viewCount: Math.max(
            Math.round(readMetric(raw, "viewCount")),
            dailyAggregate.viewCount,
            typeof raw.sessionCount === "number" ? raw.sessionCount : 0,
          ),
          engagedViewCount: Math.max(Math.round(readMetric(raw, "engagedViewCount")), dailyAggregate.engagedViewCount),
          passiveViewCount: Math.max(Math.round(readMetric(raw, "passiveViewCount")), dailyAggregate.passiveViewCount),
          bounceCount: Math.max(Math.round(readMetric(raw, "bounceCount")), dailyAggregate.bounceCount),
          unwrapCount: Math.max(
            Math.round(readMetric(raw, "unwrapCount", "unlockCount")),
            Math.max(dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
          ),
          purchaseCount,
          authSuccessCount: Math.max(
            Math.round(readMetric(raw, "authSuccessCount", "signInCount")),
            dailyAggregate.authSuccessCount,
          ),
          onboardingStartCount: Math.max(
            Math.round(readMetric(raw, "onboardingStartCount", "guidedOnboardingStartCount")),
            dailyAggregate.onboardingStartCount,
          ),
          onboardingCompletionCount: Math.max(
            Math.round(readMetric(raw, "onboardingCompletionCount", "guidedOnboardingCompletionCount")),
            dailyAggregate.onboardingCompletionCount,
          ),
          watchSecondsTotal: Math.max(watchSecondsTotal, dailyAggregate.watchSecondsTotal),
          watchHours: Number((Math.max(watchSecondsTotal, dailyAggregate.watchSecondsTotal) / 3600).toFixed(1)),
          avgLoadMs: Math.max(
            loadSampleCount > 0 ? Math.round(loadMsTotal / loadSampleCount) : 0,
            dailyAggregate.loadSampleCount > 0 ? Math.round(dailyAggregate.loadMsTotal / dailyAggregate.loadSampleCount) : 0,
          ),
          lastSeenAt: Math.max(typeof raw.lastSeenAt === "number" ? raw.lastSeenAt : 0, dailyAggregate.lastSeenAt),
          grossRevenueUsd,
          grossRevenueCents: mergedCommerceMetrics.grossRevenueCents,
          paypalFeeUsd: mergedCommerceMetrics.paypalFeeUsd,
          paypalFeeCents: mergedCommerceMetrics.paypalFeeCents,
          netRevenueUsd: mergedCommerceMetrics.netRevenueUsd,
          netRevenueCents: mergedCommerceMetrics.netRevenueCents,
          adjustedProfitUsd,
          adjustedProfitCents: mergedCommerceMetrics.adjustedProfitCents,
          retailValueUsd,
          bonusValueUsd: mergedCommerceMetrics.bonusValueUsd,
          bonusGumDrops: mergedCommerceMetrics.bonusGumDrops,
          deliveredGumDrops: mergedCommerceMetrics.deliveredGumDrops,
          paidGumDrops: mergedCommerceMetrics.paidGumDrops,
          averageOrderUsd: mergedCommerceMetrics.averageOrderUsd,
          effectiveUsdPer100Gd: mergedCommerceMetrics.effectiveUsdPer100Gd,
          unlockSpendGdTotal: mergedCommerceMetrics.unlockSpendGdTotal,
          lastPurchaseAt: mergedCommerceMetrics.lastPurchaseAt,
          bundleYieldRatio,
          commerceTruthLabel: mergedCommerceMetrics.commerceTruthLabel,
          commerceSourceLabel: mergedCommerceMetrics.commerceSourceLabel,
          commerceEmptyReason: mergedCommerceMetrics.commerceEmptyReason,
        }];
      }),
    );

    const onboardingCompletedByUser = new Map(users.map((user) => [user.uid, user.onboardingCompleted]));
    const fallbackUserIds = users
      .map((user) => user.uid)
      .filter((uid) => {
        const analytics = analyticsByUser[uid];
        return shouldRecoverAdminUserMetricsFromFacts({
          hasRollup: rollupUserIds.has(uid),
          hasDaily: dailyUserIds.has(uid),
          userOnboarded: onboardingCompletedByUser.get(uid) === true,
          metrics: analytics,
        });
      });

    const factRecoveredUserIds = new Set<string>();
    if (fallbackUserIds.length > 0) {
      const eventSnapshots = await Promise.all(
        chunkValues(fallbackUserIds, 30).map((uids) => adminDb.collection("analytics_event_facts")
          .where("userId", "in", uids)
          .get()),
      );

      const fallbackStats = new Map<string, {
        eventCount: number;
        sessionCount: number;
        viewCount: number;
        engagedViewCount: number;
        passiveViewCount: number;
        bounceCount: number;
        unwrapCount: number;
        authSuccessCount: number;
        onboardingStartCount: number;
        onboardingCompletionCount: number;
        watchSecondsTotal: number;
        loadMsTotal: number;
        loadSampleCount: number;
        lastSeenAt: number;
      }>();

      eventSnapshots.forEach((snapshot) => {
        snapshot.docs.forEach((doc) => {
          const raw = doc.data() as Record<string, unknown>;
          const uid = typeof raw.userId === "string" ? raw.userId : "";
          if (!uid) {
            return;
          }

          const eventName = typeof raw.eventName === "string" ? raw.eventName : "";
          const timestamp = toTimestampNumber(raw.timestamp);
          const loadMs = typeof raw.loadMs === "number" && Number.isFinite(raw.loadMs) ? raw.loadMs : 0;
          const watchSeconds = eventName === "viewer_session_completed"
            ? Math.max(
              typeof raw.sessionWatchSeconds === "number" && Number.isFinite(raw.sessionWatchSeconds) ? raw.sessionWatchSeconds : 0,
              typeof raw.watchSeconds === "number" && Number.isFinite(raw.watchSeconds) ? raw.watchSeconds : 0,
            )
            : 0;

          const current = fallbackStats.get(uid) ?? {
            eventCount: 0,
            sessionCount: 0,
            viewCount: 0,
            engagedViewCount: 0,
            passiveViewCount: 0,
            bounceCount: 0,
            unwrapCount: 0,
            authSuccessCount: 0,
            onboardingStartCount: 0,
            onboardingCompletionCount: 0,
            watchSecondsTotal: 0,
            loadMsTotal: 0,
            loadSampleCount: 0,
            lastSeenAt: 0,
          };

          current.eventCount += 1;
          current.sessionCount += eventName === "viewer_session_started" ? 1 : 0;
          current.viewCount += (
            eventName === "semantic_page_viewed"
            || eventName === "home_page_viewed"
            || eventName === "privacy_page_viewed"
            || eventName === "terms_page_viewed"
            || eventName === "dashboard_viewed"
            || eventName === "library_viewed"
            || eventName === "profile_settings_viewed"
            || eventName === "experience_hub_viewed"
            || eventName === "drops_page_viewed"
            || eventName === "faq_page_viewed"
            || eventName === "admin_dashboard_viewed"
            || eventName === "admin_analytics_viewed"
            || eventName === "admin_debug_viewed"
            || eventName === "admin_users_viewed"
            || eventName === "admin_content_viewed"
            || eventName === "admin_drops_viewed"
            || eventName === "admin_queue_viewed"
            || eventName === "admin_roster_viewed"
            || eventName === "admin_user_detail_viewed"
            || eventName === "viewer_opened"
          ) ? 1 : 0;
          current.engagedViewCount += eventName === "semantic_page_engaged" ? 1 : 0;
          current.passiveViewCount += eventName === "semantic_page_passive" ? 1 : 0;
          current.bounceCount += eventName === "semantic_page_bounced" ? 1 : 0;
          current.unwrapCount += eventName === "unlock_drop_success" ? 1 : 0;
          current.authSuccessCount += (
            eventName === "auth_sign_in_success"
            || eventName === "auth_google_sign_in_success"
            || eventName === "auth_sign_up_success"
          ) ? 1 : 0;
          current.onboardingStartCount += eventName === "guided_onboarding_started" ? 1 : 0;
          current.onboardingCompletionCount += eventName === "guided_onboarding_completed" ? 1 : 0;
          current.watchSecondsTotal += watchSeconds;
          current.loadMsTotal += loadMs;
          current.loadSampleCount += loadMs > 0 ? 1 : 0;
          current.lastSeenAt = Math.max(current.lastSeenAt, timestamp);

          fallbackStats.set(uid, current);
        });
      });

      fallbackStats.forEach((stats, uid) => {
        factRecoveredUserIds.add(uid);
        const existing = analyticsByUser[uid] ?? {
          uid,
          username: users.find((user) => user.uid === uid)?.username || uid,
          eventCount: 0,
          sessionCount: 0,
          viewCount: 0,
          engagedViewCount: 0,
          passiveViewCount: 0,
          bounceCount: 0,
          unwrapCount: 0,
          purchaseCount: 0,
          authSuccessCount: 0,
          onboardingStartCount: 0,
          onboardingCompletionCount: 0,
          watchSecondsTotal: 0,
          watchHours: 0,
          avgLoadMs: 0,
          lastSeenAt: 0,
          ...buildEmptyCommerceMetrics(),
          bundleYieldRatio: 0,
        };

        analyticsByUser[uid] = {
          ...existing,
          eventCount: Math.max(existing.eventCount || 0, stats.eventCount),
          sessionCount: Math.max(existing.sessionCount || 0, stats.sessionCount),
          viewCount: Math.max(existing.viewCount || 0, stats.viewCount, stats.sessionCount),
          engagedViewCount: Math.max(existing.engagedViewCount || 0, stats.engagedViewCount),
          passiveViewCount: Math.max(existing.passiveViewCount || 0, stats.passiveViewCount),
          bounceCount: Math.max(existing.bounceCount || 0, stats.bounceCount),
          unwrapCount: Math.max(existing.unwrapCount || 0, stats.unwrapCount),
          authSuccessCount: Math.max(existing.authSuccessCount || 0, stats.authSuccessCount),
          onboardingStartCount: Math.max(existing.onboardingStartCount || 0, stats.onboardingStartCount),
          onboardingCompletionCount: Math.max(
            existing.onboardingCompletionCount || 0,
            stats.onboardingCompletionCount,
            onboardingCompletedByUser.get(uid) ? 1 : 0,
          ),
          watchSecondsTotal: Math.max(existing.watchSecondsTotal || 0, stats.watchSecondsTotal),
          watchHours: Number((Math.max(existing.watchSecondsTotal || 0, stats.watchSecondsTotal) / 3600).toFixed(1)),
          avgLoadMs: stats.loadSampleCount > 0
            ? Math.max(existing.avgLoadMs || 0, Math.round(stats.loadMsTotal / stats.loadSampleCount))
            : existing.avgLoadMs || 0,
          lastSeenAt: Math.max(existing.lastSeenAt || 0, stats.lastSeenAt),
        };
      });
    }

    users.forEach((user) => {
      if (analyticsByUser[user.uid]) {
        analyticsByUser[user.uid] = {
          ...analyticsByUser[user.uid],
          onboardingCompletionCount: Math.max(
            analyticsByUser[user.uid].onboardingCompletionCount || 0,
            user.onboardingCompleted ? 1 : 0,
          ),
        };
        return;
      }

      const dailyAggregate = dailyAnalyticsByUser.get(user.uid) ?? buildEmptyDailyAggregate();
      const commerceMetrics = buildCommerceMetricsFromRollup(dailyAggregate);
      const retailValueUsd = commerceMetrics.retailValueUsd;
      analyticsByUser[user.uid] = {
        uid: user.uid,
        username: user.username || user.displayName || user.uid,
        eventCount: dailyAggregate.eventCount,
        sessionCount: dailyAggregate.sessionCount,
        viewCount: dailyAggregate.viewCount,
        engagedViewCount: dailyAggregate.engagedViewCount,
        passiveViewCount: dailyAggregate.passiveViewCount,
        bounceCount: dailyAggregate.bounceCount,
        unwrapCount: Math.max(dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
        purchaseCount: dailyAggregate.purchaseCount,
        authSuccessCount: dailyAggregate.authSuccessCount,
        onboardingStartCount: dailyAggregate.onboardingStartCount,
        onboardingCompletionCount: Math.max(dailyAggregate.onboardingCompletionCount, user.onboardingCompleted ? 1 : 0),
        watchSecondsTotal: dailyAggregate.watchSecondsTotal,
        watchHours: Number((dailyAggregate.watchSecondsTotal / 3600).toFixed(1)),
        avgLoadMs: dailyAggregate.loadSampleCount > 0 ? Math.round(dailyAggregate.loadMsTotal / dailyAggregate.loadSampleCount) : 0,
        lastSeenAt: dailyAggregate.lastSeenAt,
        grossRevenueUsd: commerceMetrics.grossRevenueUsd,
        grossRevenueCents: commerceMetrics.grossRevenueCents,
        paypalFeeUsd: commerceMetrics.paypalFeeUsd,
        paypalFeeCents: commerceMetrics.paypalFeeCents,
        netRevenueUsd: commerceMetrics.netRevenueUsd,
        netRevenueCents: commerceMetrics.netRevenueCents,
        adjustedProfitUsd: commerceMetrics.adjustedProfitUsd,
        adjustedProfitCents: commerceMetrics.adjustedProfitCents,
        retailValueUsd,
        bonusValueUsd: commerceMetrics.bonusValueUsd,
        bonusGumDrops: commerceMetrics.bonusGumDrops,
        deliveredGumDrops: commerceMetrics.deliveredGumDrops,
        paidGumDrops: commerceMetrics.paidGumDrops,
        averageOrderUsd: commerceMetrics.averageOrderUsd,
        effectiveUsdPer100Gd: commerceMetrics.effectiveUsdPer100Gd,
        unlockSpendGdTotal: commerceMetrics.unlockSpendGdTotal,
        lastPurchaseAt: commerceMetrics.lastPurchaseAt,
        bundleYieldRatio: retailValueUsd > 0 ? Number((commerceMetrics.grossRevenueUsd / retailValueUsd).toFixed(4)) : 0,
        commerceTruthLabel: commerceMetrics.commerceTruthLabel,
        commerceSourceLabel: commerceMetrics.commerceSourceLabel,
        commerceEmptyReason: commerceMetrics.commerceEmptyReason,
      };
    });

    users.forEach((user) => {
      const analytics = analyticsByUser[user.uid];
      const metricSnapshot = {
        eventCount: analytics.eventCount || 0,
        sessionCount: analytics.sessionCount || 0,
        viewCount: analytics.viewCount || 0,
        bounceCount: analytics.bounceCount || 0,
        authSuccessCount: analytics.authSuccessCount || 0,
        onboardingCompletionCount: analytics.onboardingCompletionCount || 0,
        watchSecondsTotal: analytics.watchSecondsTotal || 0,
        unwrapCount: analytics.unwrapCount || 0,
        purchaseCount: analytics.purchaseCount || 0,
        grossRevenueUsd: analytics.grossRevenueUsd || 0,
        unlockSpendGdTotal: analytics.unlockSpendGdTotal || 0,
        lastSeenAt: analytics.lastSeenAt || 0,
      };
      const metricIntegrity = buildAdminUserMetricIntegrity({
        hasRollup: rollupUserIds.has(user.uid),
        hasDaily: dailyUserIds.has(user.uid),
        recoveredFromFacts: factRecoveredUserIds.has(user.uid),
        userOnboarded: user.onboardingCompleted === true,
        userCreatedAt: toTimestampNumber(user.createdAt),
        nowMs: Date.now(),
        metrics: metricSnapshot,
      });

      analyticsByUser[user.uid] = {
        ...analytics,
        metricTruthLabel: metricIntegrity.truthLabel,
        metricSourceLabel: metricIntegrity.sourceLabel,
        metricIntegrityFailures: metricIntegrity.failures,
        recoveredFromFacts: metricIntegrity.recoveredFromFacts,
        engagementScore: scoreAdminUserEngagement(metricSnapshot, Date.now()),
      };
    });

    const metricFailureUsers = Object.values(analyticsByUser).filter((entry) => (entry.metricIntegrityFailures || []).length > 0);
    if (metricFailureUsers.length > 0) {
      recordServerDiagnostic({
        channel: "analytics",
        severity: "warn",
        message: "Admin user metrics contain partial source-of-truth coverage",
        detail: {
          route: "admin/users",
          affectedUsers: metricFailureUsers.length,
          recoveredFromFacts: Object.values(analyticsByUser).filter((entry) => entry.recoveredFromFacts === true).length,
          sampleFailures: metricFailureUsers.slice(0, 5).map((entry) => ({
            uid: entry.uid,
            failures: entry.metricIntegrityFailures,
          })),
        },
      }).catch(() => undefined);
    }

    const unlockedDropIds = users.flatMap((user) => user.unlockedContent || []);
    const dropReferences = await getDropReferenceMap(unlockedDropIds);

    const nowMs = Date.now();
    const commerceSummaryRaw = commerceSummarySnap.exists
      ? commerceSummarySnap.data() as Record<string, unknown>
      : {};
    const commerceSummaryMetrics = commerceSummarySnap.exists
      ? buildCommerceMetricsFromRollup(commerceSummaryRaw)
      : buildEmptyCommerceMetrics();
    const totalPurchases = Math.max(
      Math.round(readMetric(commerceSummaryRaw, "purchaseCount")),
      Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.purchaseCount || 0), 0),
    );
    const unlockSpendGdTotal = Math.max(
      Math.round(readMetric(commerceSummaryRaw, "unlockSpendGdTotal", "spendGdTotal")),
      Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.unlockSpendGdTotal || 0), 0),
    );

    const summary = {
      totalUsers: users.length,
      totalCreators: users.filter((user) => user.role === "creator").length,
      totalAdmins: users.filter((user) => user.role === "admin").length,
      verifiedUsers: users.filter((user) => user.isVerified).length,
      activeUsers: users.filter((user) => user.status === "active").length,
      suspendedUsers: users.filter((user) => user.status === "suspended").length,
      bannedUsers: users.filter((user) => user.status === "banned").length,
      notificationsEnabledUsers: users.filter((user) => user.notificationSettings.browserPushEnabled).length,
      onboardingCompletedUsers: users.filter((user) => user.onboardingCompleted).length,
      activeLast7Days: Object.values(analyticsByUser).filter((entry) => nowMs - (entry.lastSeenAt || 0) < 7 * 24 * 60 * 60 * 1000).length,
      totalEvents: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.eventCount || 0), 0),
      totalUnwraps: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.unwrapCount || 0), 0),
      totalPurchases,
      totalWatchHours: Number(
        (
          Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.watchSecondsTotal || 0), 0) / 3600
        ).toFixed(1),
      ),
      grossRevenueUsd: commerceSummaryMetrics.grossRevenueUsd,
      adjustedProfitUsd: commerceSummaryMetrics.adjustedProfitUsd,
      bonusValueUsd: commerceSummaryMetrics.bonusValueUsd,
      bonusGumDrops: commerceSummaryMetrics.bonusGumDrops,
      deliveredGumDrops: commerceSummaryMetrics.deliveredGumDrops,
      paidGumDrops: commerceSummaryMetrics.paidGumDrops,
      unlockSpendGdTotal,
      averageOrderUsd: (() => {
        return totalPurchases > 0 ? roundCurrency(commerceSummaryMetrics.grossRevenueUsd / totalPurchases) : 0;
      })(),
      effectiveUsdPer100Gd: (() => {
        return commerceSummaryMetrics.deliveredGumDrops > 0
          ? roundCurrency(commerceSummaryMetrics.grossRevenueUsd / (commerceSummaryMetrics.deliveredGumDrops / 100))
          : 0;
      })(),
      payingUsers: Object.values(analyticsByUser).filter((entry) => (entry.purchaseCount || 0) > 0).length,
      commerceTruthLabel: commerceSummaryMetrics.commerceTruthLabel,
      commerceSourceLabel: commerceSummaryMetrics.commerceSourceLabel,
      commerceEmptyReason: commerceSummaryMetrics.commerceEmptyReason,
      creatorOps: {
        creatorsWithFollowers: Array.from(creatorOpsByUser.values()).filter((entry) => entry.followerCount > 0).length,
        totalFollowers: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.followerCount, 0),

        totalAlertOptIns: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.notificationsEnabledCount, 0),
        activeSubscriptions: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.activeSubscribers, 0),
        openRequests: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.openRequests, 0),
        bookedCalls: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.bookedCalls, 0),
        pendingPayouts: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.pendingPayouts, 0),
        openThreads: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.openThreads, 0),
        pendingDropSubmissions: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.pendingDropSubmissions, 0),
        totalAccruedGd: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.totalAccruedGd, 0),
        pendingCashoutGd: Array.from(creatorOpsByUser.values()).reduce((sum, entry) => sum + entry.pendingCashoutGd, 0),
      },
    };

    return NextResponse.json({
      success: true,
      users,
      analyticsByUser,
      creatorOpsByUser: Object.fromEntries(creatorOpsByUser),
      dropReferences,
      summary,
    });
  } catch (error) {
    return handleApiError(error, "Admin.Users.GET");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await guardApiRequest(request, {
      routeName: "admin/users",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: "Missing userId or updates" }, { status: 400 });
    }

    const allowedFields = ["role", "isVerified", "status", "statusReason"];
    const sanitized: Record<string, unknown> = {};
    let creatorApplicationPatch: Record<string, unknown> | undefined;
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }
    if (updates.creatorRestrictions && typeof updates.creatorRestrictions === "object") {
      sanitized.creatorRestrictions = sanitizeCreatorRestrictionsUpdate(updates.creatorRestrictions as Record<string, unknown>);
    }
    if (updates.creatorSettings && typeof updates.creatorSettings === "object") {
      sanitized.creatorSettings = sanitizeCreatorSettingsUpdate(updates.creatorSettings as Record<string, unknown>);
    }
    if (updates.creatorApplication && typeof updates.creatorApplication === "object") {
      creatorApplicationPatch = updates.creatorApplication as Record<string, unknown>;
    }

    if (Object.keys(sanitized).length === 0 && !creatorApplicationPatch) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const actor: CreatorOnboardingActor = {
      id: authResult?.uid ?? "admin",
      role: "admin",
      label: authResult?.email ?? authResult?.uid ?? "Admin",
    };
    const isOwnerActor = isCreatorOwnerEmail(authResult?.email);
    const nowMs = Date.now();
    let creatorLifecycleEvents: ReturnType<typeof buildCreatorLifecycleEvents> = [];
    let creatorOnboardingDiagnostic: CreatorOnboardingDiagnosticEntry | null = null;

    if (creatorApplicationPatch) {
      const userRef = adminDb.collection("users").doc(userId);
      const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);

      await adminDb.runTransaction(async (transaction) => {
        const [userSnap, onboardingSnap] = await transaction.getAll(userRef, onboardingRef);
        if (!userSnap.exists) {
          throw new Error("User not found");
        }

        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const existingCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
        const currentCanonical = existingCanonical ?? (existingProjection
          ? buildCreatorOnboardingCanonicalRecord({
            userId,
            email: typeof userData.email === "string" ? userData.email : null,
            username: typeof userData.username === "string" ? userData.username : undefined,
            displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
            photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
            role: readUserRole(userData.role),
            createdAt: toTimestampNumber(userData.createdAt) || existingProjection.submittedAt,
            queuePosition: existingProjection.queuePosition,
            creatorDisplayName: existingProjection.creatorDisplayName,
            creatorPrimaryPlatform: existingProjection.creatorPrimaryPlatform,
            creatorContentFocus: existingProjection.creatorContentFocus,
            nowMs,
            source: existingProjection,
          })
          : buildCreatorOnboardingCanonicalRecord({
            userId,
            email: typeof userData.email === "string" ? userData.email : null,
            username: typeof userData.username === "string" ? userData.username : undefined,
            displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
            photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
            role: readUserRole(userData.role),
            createdAt: toTimestampNumber(userData.createdAt) || nowMs,
            queuePosition: typeof creatorApplicationPatch.queuePosition === "number" && Number.isFinite(creatorApplicationPatch.queuePosition)
              ? Math.trunc(creatorApplicationPatch.queuePosition)
              : 1,
            creatorDisplayName: readStringValue(creatorApplicationPatch.creatorDisplayName)
              || readStringValue(userData.displayName)
              || "Creator",
            creatorPrimaryPlatform: readStringValue(creatorApplicationPatch.creatorPrimaryPlatform) || undefined,
            creatorContentFocus: readStringValue(creatorApplicationPatch.creatorContentFocus) || undefined,
            nowMs,
            source: creatorApplicationPatch,
          }));

        const creatorApplicationUpdate = resolveCreatorApplicationUpdate({
          patch: creatorApplicationPatch,
          currentProjection: existingProjection,
          currentCanonical,
          nowMs,
          reviewedBy: authResult?.email ?? authResult?.uid ?? null,
        });

        const nextSource = buildCreatorApplicationAdminSource(
          currentCanonical,
          creatorApplicationUpdate,
          nowMs,
          actor.label,
        );

        if (
          Object.prototype.hasOwnProperty.call(creatorApplicationPatch, "ownerOverrideActive")
          && creatorApplicationUpdate.ownerOverrideActive !== currentCanonical.ownerOverrideActive
          && !isOwnerActor
        ) {
          throw new ForbiddenCreatorOnboardingActionError("Owner override is restricted to the primary owner control.");
        }

        let nextCanonical = buildCreatorOnboardingCanonicalRecord({
          userId,
          email: typeof userData.email === "string" ? userData.email : null,
          username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
          displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
          photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
          role: readUserRole(userData.role),
          createdAt: currentCanonical.createdAt,
          queuePosition: currentCanonical.queuePosition,
          creatorDisplayName: creatorApplicationUpdate.creatorDisplayName,
          creatorPrimaryPlatform: creatorApplicationUpdate.creatorPrimaryPlatform,
          creatorContentFocus: creatorApplicationUpdate.creatorContentFocus,
          nowMs,
          source: nextSource,
        });

        const shouldPromoteCreatorRole = shouldActivateCreatorRole(nextCanonical);
        if (
          nextCanonical.approvalStatus === "creator_approved"
          && !shouldPromoteCreatorRole
          && nextCanonical.ownerOverrideActive !== true
        ) {
          await trackServerEvent("creator_role_activation_blocked", {
            page_path: `/admin/user/${userId}`,
          }, userId).catch(() => undefined);
          throw new InvalidCreatorOnboardingTransitionError("Creator approval requires intro acknowledgment, accepted identity verification, and both agreement signatures unless owner override is active.");
        }

        const currentRole = readUserRole(userData.role);
        const requestedRole = sanitized.role !== undefined ? readUserRole(sanitized.role) : undefined;
        let nextRole = currentRole;

        if (requestedRole === "admin" || requestedRole === "user") {
          nextRole = requestedRole;
        } else if (requestedRole === "creator") {
          nextRole = shouldPromoteCreatorRole || currentRole === "creator" ? "creator" : currentRole;
        } else if (shouldPromoteCreatorRole && currentRole === "user") {
          nextRole = "creator";
        }

        if (nextRole !== nextCanonical.role) {
          nextCanonical = buildCreatorOnboardingCanonicalRecord({
            userId,
            email: typeof userData.email === "string" ? userData.email : null,
            username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
            displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
            photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
            role: nextRole,
            createdAt: currentCanonical.createdAt,
            queuePosition: currentCanonical.queuePosition,
            creatorDisplayName: creatorApplicationUpdate.creatorDisplayName,
            creatorPrimaryPlatform: creatorApplicationUpdate.creatorPrimaryPlatform,
            creatorContentFocus: creatorApplicationUpdate.creatorContentFocus,
            nowMs,
            source: {
              ...nextSource,
              role: nextRole,
            },
          });
        }

        syncCreatorOnboardingDocuments(transaction, {
          userId,
          displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
          canonical: nextCanonical,
        });

        const userPatch: Record<string, unknown> = {
          ...sanitized,
        };
        delete userPatch.role;
        if (requestedRole || nextRole !== currentRole) {
          userPatch.role = nextRole;
        }
        if (Object.keys(userPatch).length > 0) {
          transaction.set(userRef, userPatch, { merge: true });
        }

        recordCreatorOnboardingHistoryEntries(
          transaction,
          userId,
          buildCreatorOnboardingStatusChangeHistoryEntries({
            before: currentCanonical,
            after: nextCanonical,
            actor,
            timestamp: nowMs,
          }),
        );

        creatorLifecycleEvents = buildCreatorLifecycleEvents({
          before: currentCanonical,
          after: nextCanonical,
        });

        if (
          (requestedRole === "creator" && nextRole !== "creator")
          || (nextCanonical.approvalStatus === "creator_approved" && !shouldPromoteCreatorRole)
        ) {
          creatorOnboardingDiagnostic = {
            severity: "warn",
            message: requestedRole === "creator" && nextRole !== "creator"
              ? "Creator role activation blocked by onboarding prerequisites"
              : "Creator approved but role activation prerequisites are incomplete",
            detail: {
              userId,
              requestedRole: requestedRole ?? null,
              currentRole,
              nextRole,
              approvalStatus: nextCanonical.approvalStatus,
              legalStatus: nextCanonical.legalStatus,
              idVerificationStatus: nextCanonical.idVerificationStatus,
              contractDocumentStatus: nextCanonical.contractDocumentStatus,
              creatorSignatureStatus: nextCanonical.creatorSignatureStatus,
              adminSignatureStatus: nextCanonical.adminSignatureStatus,
            },
          };
        }
      });
    } else if (Object.keys(sanitized).length > 0) {
      const requestedRole = sanitized.role !== undefined ? readUserRole(sanitized.role) : undefined;

      if (requestedRole === "creator") {
        const userRef = adminDb.collection("users").doc(userId);
        const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(userId);
        const [userSnap, onboardingSnap] = await Promise.all([
          userRef.get(),
          onboardingRef.get(),
        ]);

        if (!userSnap.exists) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};
        const existingProjection = normalizeCreatorApplication(userData.creatorApplication);
        const currentCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data())
          ?? (existingProjection
            ? buildCreatorOnboardingCanonicalRecord({
              userId,
              email: typeof userData.email === "string" ? userData.email : null,
              username: typeof userData.username === "string" ? userData.username : undefined,
              displayName: typeof userData.displayName === "string" ? userData.displayName : undefined,
              photoURL: typeof userData.photoURL === "string" ? userData.photoURL : null,
              role: readUserRole(userData.role),
              createdAt: toTimestampNumber(userData.createdAt) || existingProjection.submittedAt,
              queuePosition: existingProjection.queuePosition,
              creatorDisplayName: existingProjection.creatorDisplayName,
              creatorPrimaryPlatform: existingProjection.creatorPrimaryPlatform,
              creatorContentFocus: existingProjection.creatorContentFocus,
              nowMs,
              source: existingProjection,
            })
            : undefined);

        if (currentCanonical) {
          if (!shouldActivateCreatorRole(currentCanonical)) {
            await trackServerEvent("creator_role_activation_blocked", {
              page_path: `/admin/user/${userId}`,
            }, userId).catch(() => undefined);
            await recordServerDiagnostic({
              channel: "creator_onboarding",
              severity: "warn",
              message: "Creator role activation blocked by onboarding prerequisites",
              detail: {
                userId,
                requestedRole,
                currentRole: readUserRole(userData.role),
                approvalStatus: currentCanonical.approvalStatus,
                legalStatus: currentCanonical.legalStatus,
                idVerificationStatus: currentCanonical.idVerificationStatus,
                contractDocumentStatus: currentCanonical.contractDocumentStatus,
                creatorSignatureStatus: currentCanonical.creatorSignatureStatus,
                adminSignatureStatus: currentCanonical.adminSignatureStatus,
              },
            });

            return NextResponse.json({
              error: "Creator role cannot be activated until intro acknowledgment, ID verification, and agreement signatures are complete.",
            }, { status: 400 });
          }

          if (readUserRole(userData.role) !== "creator") {
            await adminDb.runTransaction(async (transaction) => {
              const nextCanonical = buildCreatorOnboardingCanonicalRecord({
                userId,
                email: typeof userData.email === "string" ? userData.email : null,
                username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
                displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
                photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
                role: "creator",
                createdAt: currentCanonical.createdAt,
                queuePosition: currentCanonical.queuePosition,
                creatorDisplayName: currentCanonical.creatorDisplayName,
                creatorPrimaryPlatform: currentCanonical.creatorPrimaryPlatform,
                creatorContentFocus: currentCanonical.creatorContentFocus,
                nowMs,
                source: {
                  ...currentCanonical,
                  role: "creator",
                  creatorReviewQueueVisible: undefined,
                },
              });

              syncCreatorOnboardingDocuments(transaction, {
                userId,
                displayName: typeof userData.displayName === "string" ? userData.displayName : currentCanonical.creatorDisplayName,
                canonical: nextCanonical,
              });

              const userPatch: Record<string, unknown> = {
                ...sanitized,
                role: "creator",
              };
              transaction.set(userRef, userPatch, { merge: true });
              recordCreatorOnboardingHistoryEntries(
                transaction,
                userId,
                buildCreatorOnboardingStatusChangeHistoryEntries({
                  before: currentCanonical,
                  after: nextCanonical,
                  actor,
                  timestamp: nowMs,
                }),
              );
            });
          } else {
            await userRef.update(sanitized);
          }
        } else {
          await userRef.update(sanitized);
        }
      } else {
        await adminDb.collection("users").doc(userId).update(sanitized);
      }
    }

    const creatorOnboardingDiagnosticEntry = creatorOnboardingDiagnostic as CreatorOnboardingDiagnosticEntry | null;
    if (creatorOnboardingDiagnosticEntry) {
      await recordServerDiagnostic({
        channel: "creator_onboarding",
        severity: creatorOnboardingDiagnosticEntry.severity,
        message: creatorOnboardingDiagnosticEntry.message,
        detail: creatorOnboardingDiagnosticEntry.detail,
      });
    }

    await emitCreatorLifecycleTelemetry(creatorLifecycleEvents, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InvalidCreatorApplicationUpdateError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof InvalidCreatorOnboardingTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ForbiddenCreatorOnboardingActionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return handleApiError(error, "Admin.Users.PUT");
  }
}

export async function POST(request: NextRequest) {
  try {
    await guardApiRequest(request, {
      routeName: "admin/users",
      rateLimit: ADMIN,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const { userId, action, dropId } = await request.json();

    if (!userId || !action || !dropId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedDropId = String(dropId).trim();
    const dropReferences = await getDropReferenceMap([normalizedDropId]);
    const dropReference = dropReferences[normalizedDropId];
    if (!dropReference) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    const userRef = adminDb.collection("users").doc(userId);
    const dropRef = adminDb.collection("drops").doc(normalizedDropId);

    if (action !== "add" && action !== "remove") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      const [userSnap, dropSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(dropRef),
      ]);

      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      if (!dropSnap.exists) {
        throw new Error("Drop not found");
      }

      const userData = userSnap.data() as Record<string, unknown>;
      const currentBalance = normalizeGumdropBalance(userData.gumDropsBalance);
      const unlockedContent = Array.isArray(userData.unlockedContent)
        ? userData.unlockedContent.filter((entry): entry is string => typeof entry === "string")
        : [];
      const alreadyUnlocked = unlockedContent.includes(normalizedDropId);
      const dropData = dropSnap.data() as Record<string, unknown>;
      const dropTitle = typeof dropData.title === "string" ? dropData.title : dropReference.title;

      if (action === "add") {
        if (alreadyUnlocked) {
          return { changed: false, actionTaken: "add" as const, grantedAt: null, dropTitle };
        }

        const grantedAt = Date.now();
        const transactionRef = adminDb.collection("transactions").doc();
        transaction.update(userRef, {
          unlockedContent: FieldValue.arrayUnion(normalizedDropId),
          [`unlockedContentTimestamps.${normalizedDropId}`]: grantedAt,
        });
        transaction.update(dropRef, {
          totalUnlocks: FieldValue.increment(1),
        });
        transaction.set(transactionRef, buildCompletedGumdropTransaction({
          userId,
          type: "unlock_content",
          amount: 0,
          relatedDropId: normalizedDropId,
          description: `Admin granted: ${dropTitle}`,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          timestampMs: grantedAt,
          extra: {
            grantSource: "admin",
          },
        }));

        return { changed: true, actionTaken: "add" as const, grantedAt, dropTitle };
      }

      if (!alreadyUnlocked) {
        return { changed: false, actionTaken: "remove" as const, grantedAt: null, dropTitle };
      }

      transaction.update(userRef, {
        unlockedContent: FieldValue.arrayRemove(normalizedDropId),
        [`unlockedContentTimestamps.${normalizedDropId}`]: FieldValue.delete(),
      });

      return { changed: true, actionTaken: "remove" as const, grantedAt: null, dropTitle };
    });

    if (result.changed && result.actionTaken === "add") {
      await trackServerEvent("unlock_drop_success", {
        drop_id: normalizedDropId,
        drop_title: result.dropTitle,
        unlock_cost: 0,
        grant_source: "admin",
        transaction_id: `admin-grant:${userId}:${normalizedDropId}:${result.grantedAt ?? "unknown"}`,
      }, userId).catch((error) => {
        recordRouteWarning("admin/users", "Failed to mirror admin grant into analytics facts", error, {
          channel: "analytics",
          detail: {
            userId,
            dropId: normalizedDropId,
          },
        });
      });
    }

    return NextResponse.json({ success: true, dropReference, changed: result.changed });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return handleApiError(error, "Admin.Users.POST");
  }
}
type UserDailyAggregate = {
  eventCount: number;
  sessionCount: number;
  viewCount: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  unwrapCount: number;
  unlockCount: number;
  purchaseCount: number;
  authSuccessCount: number;
  onboardingStartCount: number;
  onboardingCompletionCount: number;
  watchSecondsTotal: number;
  loadMsTotal: number;
  loadSampleCount: number;
  spendGdTotal: number;
  revenueCentsTotal: number;
  grossRevenueUsdTotal: number;
  paypalFeeUsdTotal: number;
  netRevenueUsdTotal: number;
  adjustedProfitUsdTotal: number;
  bonusValueUsdTotal: number;
  bonusGumDropsTotal: number;
  deliveredGumDropsTotal: number;
  paidGumDropsTotal: number;
  lastSeenAt: number;
  lastPurchaseAt: number;
};

function buildEmptyDailyAggregate(): UserDailyAggregate {
  return {
    eventCount: 0,
    sessionCount: 0,
    viewCount: 0,
    engagedViewCount: 0,
    passiveViewCount: 0,
    bounceCount: 0,
    unwrapCount: 0,
    unlockCount: 0,
    purchaseCount: 0,
    authSuccessCount: 0,
    onboardingStartCount: 0,
    onboardingCompletionCount: 0,
    watchSecondsTotal: 0,
    loadMsTotal: 0,
    loadSampleCount: 0,
    spendGdTotal: 0,
    revenueCentsTotal: 0,
    grossRevenueUsdTotal: 0,
    paypalFeeUsdTotal: 0,
    netRevenueUsdTotal: 0,
    adjustedProfitUsdTotal: 0,
    bonusValueUsdTotal: 0,
    bonusGumDropsTotal: 0,
    deliveredGumDropsTotal: 0,
    paidGumDropsTotal: 0,
    lastSeenAt: 0,
    lastPurchaseAt: 0,
  };
}
