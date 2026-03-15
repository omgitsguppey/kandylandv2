import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";
import { BUILT_IN_DAILY_TASK_MAP } from "@/lib/tasks/task-catalog";
import { getDropReferenceMap } from "@/lib/server/drop-references";

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

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

type UserCommerceMetrics = {
  grossRevenueUsd: number;
  grossRevenueCents: number;
  paypalFeeUsd: number;
  paypalFeeCents: number;
  netRevenueUsd: number;
  netRevenueCents: number;
  adjustedProfitUsd: number;
  adjustedProfitCents: number;
  retailValueUsd: number;
  bonusValueUsd: number;
  bonusGumDrops: number;
  deliveredGumDrops: number;
  paidGumDrops: number;
  averageOrderUsd: number;
  effectiveUsdPer100Gd: number;
  unlockSpendGdTotal: number;
  lastPurchaseAt: number;
};

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

function buildEmptyCommerceMetrics(): UserCommerceMetrics {
  return {
    grossRevenueUsd: 0,
    grossRevenueCents: 0,
    paypalFeeUsd: 0,
    paypalFeeCents: 0,
    netRevenueUsd: 0,
    netRevenueCents: 0,
    adjustedProfitUsd: 0,
    adjustedProfitCents: 0,
    retailValueUsd: 0,
    bonusValueUsd: 0,
    bonusGumDrops: 0,
    deliveredGumDrops: 0,
    paidGumDrops: 0,
    averageOrderUsd: 0,
    effectiveUsdPer100Gd: 0,
    unlockSpendGdTotal: 0,
    lastPurchaseAt: 0,
  };
}

function buildCommerceMetricsFromRollup(raw: Record<string, unknown>): UserCommerceMetrics {
  const grossRevenueUsd = roundCurrency(readMetric(raw, "grossRevenueUsdTotal", "grossRevenueUsd"));
  const grossRevenueCents = Math.round(readMetric(raw, "revenueCentsTotal", "grossRevenueCents"));
  const paypalFeeUsd = roundCurrency(readMetric(raw, "paypalFeeUsdTotal", "paypalFeeUsd"));
  const paypalFeeCents = Math.round(readMetric(raw, "paypalFeeCentsTotal", "paypalFeeCents"));
  const netRevenueUsd = roundCurrency(readMetric(raw, "netRevenueUsdTotal", "netRevenueUsd"));
  const netRevenueCents = Math.round(readMetric(raw, "netRevenueCentsTotal", "netRevenueCents"));
  const adjustedProfitUsd = roundCurrency(readMetric(raw, "adjustedProfitUsdTotal", "adjustedProfitUsd"));
  const adjustedProfitCents = Math.round(readMetric(raw, "adjustedProfitCentsTotal", "adjustedProfitCents"));
  const retailValueUsd = roundCurrency(readMetric(raw, "retailValueUsdTotal", "retailValueUsd"));
  const bonusValueUsd = roundCurrency(readMetric(raw, "bonusValueUsdTotal", "bonusValueUsd"));
  const bonusGumDrops = Math.round(readMetric(raw, "bonusGumDropsTotal", "bonusGumDrops"));
  const deliveredGumDrops = Math.round(readMetric(raw, "deliveredGumDropsTotal", "deliveredGumDrops"));
  const paidGumDrops = Math.round(readMetric(raw, "paidGumDropsTotal", "paidGumDrops"));
  const unlockSpendGdTotal = Math.round(readMetric(raw, "spendGdTotal", "unlockSpendGdTotal"));
  const purchaseCount = Math.max(0, Math.round(readMetric(raw, "purchaseTransactionCount", "purchaseCount")));

  return {
    grossRevenueUsd,
    grossRevenueCents,
    paypalFeeUsd,
    paypalFeeCents,
    netRevenueUsd,
    netRevenueCents,
    adjustedProfitUsd,
    adjustedProfitCents,
    retailValueUsd,
    bonusValueUsd,
    bonusGumDrops,
    deliveredGumDrops,
    paidGumDrops,
    averageOrderUsd: purchaseCount > 0 ? roundCurrency(grossRevenueUsd / purchaseCount) : 0,
    effectiveUsdPer100Gd: deliveredGumDrops > 0 ? roundCurrency(grossRevenueUsd / (deliveredGumDrops / 100)) : 0,
    unlockSpendGdTotal,
    lastPurchaseAt: toTimestampNumber(raw.lastPurchaseAt),
  };
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
  };
}

export async function GET(request: NextRequest) {
  try {
    await checkRateLimit(request, "admin/users", ADMIN);
    await verifyAdmin(request);

    const [usersSnapshot, analyticsSnapshot, userDailySnapshot, commerceSummarySnap] = await Promise.all([
      adminDb.collection("users").orderBy("createdAt", "desc").get(),
      adminDb.collection("analytics_users_rollup").get(),
      adminDb.collection("analytics_user_daily").get(),
      adminDb.collection("analytics_commerce_rollup").doc("summary").get(),
    ]);

    const users = usersSnapshot.docs.map((doc) => serializeUserDoc(doc.id, doc.data()));

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
      current.unwrapCount += Math.round(readMetric(raw, "unwrapCount"));
      current.unlockCount += Math.round(readMetric(raw, "unlockCount"));
      current.purchaseCount += Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));
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

    const analyticsByUser = Object.fromEntries(
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
          unwrapCount: Math.max(
            Math.round(readMetric(raw, "unwrapCount", "unlockCount")),
            Math.max(dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
          ),
          purchaseCount,
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
        }];
      }),
    );

    const fallbackUserIds = users
      .map((user) => user.uid)
      .filter((uid) => {
        const analytics = analyticsByUser[uid];
        return !analytics || (
          (analytics.eventCount || 0) === 0
          && (analytics.unwrapCount || 0) === 0
          && (analytics.watchSecondsTotal || 0) === 0
        );
      });

    if (fallbackUserIds.length > 0) {
      const eventSnapshots = await Promise.all(
        chunkValues(fallbackUserIds, 30).map((uids) => adminDb.collection("analytics_event_facts")
          .where("userId", "in", uids)
          .get()),
      );

      const fallbackStats = new Map<string, {
        eventCount: number;
        sessionCount: number;
        unwrapCount: number;
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
            unwrapCount: 0,
            watchSecondsTotal: 0,
            loadMsTotal: 0,
            loadSampleCount: 0,
            lastSeenAt: 0,
          };

          current.eventCount += 1;
          current.sessionCount += eventName === "viewer_session_started" ? 1 : 0;
          current.unwrapCount += eventName === "unlock_drop_success" ? 1 : 0;
          current.watchSecondsTotal += watchSeconds;
          current.loadMsTotal += loadMs;
          current.loadSampleCount += loadMs > 0 ? 1 : 0;
          current.lastSeenAt = Math.max(current.lastSeenAt, timestamp);

          fallbackStats.set(uid, current);
        });
      });

      fallbackStats.forEach((stats, uid) => {
        const existing = analyticsByUser[uid] ?? {
          uid,
          username: users.find((user) => user.uid === uid)?.username || uid,
          eventCount: 0,
          sessionCount: 0,
          unwrapCount: 0,
          purchaseCount: 0,
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
          unwrapCount: Math.max(existing.unwrapCount || 0, stats.unwrapCount),
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
        unwrapCount: Math.max(dailyAggregate.unwrapCount, dailyAggregate.unlockCount),
        purchaseCount: dailyAggregate.purchaseCount,
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
      };
    });

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
    };

    return NextResponse.json({
      success: true,
      users,
      analyticsByUser,
      dropReferences,
      summary,
    });
  } catch (error) {
    return handleApiError(error, "Admin.Users.GET");
  }
}

export async function PUT(request: NextRequest) {
  try {
    await checkRateLimit(request, "admin/users", ADMIN);
    await verifyAdmin(request);

    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: "Missing userId or updates" }, { status: 400 });
    }

    const allowedFields = ["role", "isVerified", "status", "statusReason"];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await adminDb.collection("users").doc(userId).update(sanitized);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Admin.Users.PUT");
  }
}

export async function POST(request: NextRequest) {
  try {
    await checkRateLimit(request, "admin/users", ADMIN);
    await verifyAdmin(request);

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

    if (action === "add") {
      await userRef.update({
        unlockedContent: FieldValue.arrayUnion(normalizedDropId),
        [`unlockedContentTimestamps.${normalizedDropId}`]: Date.now(),
      });
    } else if (action === "remove") {
      await userRef.update({
        unlockedContent: FieldValue.arrayRemove(normalizedDropId),
        [`unlockedContentTimestamps.${normalizedDropId}`]: FieldValue.delete(),
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, dropReference });
  } catch (error) {
    return handleApiError(error, "Admin.Users.POST");
  }
}
type UserDailyAggregate = {
  eventCount: number;
  sessionCount: number;
  unwrapCount: number;
  unlockCount: number;
  purchaseCount: number;
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
    unwrapCount: 0,
    unlockCount: 0,
    purchaseCount: 0,
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
