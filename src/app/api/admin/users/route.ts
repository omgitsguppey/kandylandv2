import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import { verifyAdmin, handleApiError } from "@/lib/server/auth";
import { checkRateLimit, ADMIN } from "@/lib/server/rate-limit";

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
    },
    dailyTasksState: {
      tasks: Array.isArray(dailyTasksState.tasks) ? dailyTasksState.tasks : [],
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

    const [usersSnapshot, analyticsSnapshot] = await Promise.all([
      adminDb.collection("users").orderBy("createdAt", "desc").get(),
      adminDb.collection("analytics_users_rollup").get(),
    ]);

    const users = usersSnapshot.docs.map((doc) => serializeUserDoc(doc.id, doc.data()));

    const analyticsByUser = Object.fromEntries(
      analyticsSnapshot.docs.map((doc) => {
        const raw = doc.data() as Record<string, unknown>;
        const loadSampleCount = typeof raw.loadSampleCount === "number" ? raw.loadSampleCount : 0;
        const loadMsTotal = typeof raw.loadMsTotal === "number" ? raw.loadMsTotal : 0;
        const watchSecondsTotal = typeof raw.watchSecondsTotal === "number" ? raw.watchSecondsTotal : 0;
        const commerceMetrics = buildCommerceMetricsFromRollup(raw);
        const grossRevenueUsd = commerceMetrics.grossRevenueUsd;
        const adjustedProfitUsd = commerceMetrics.adjustedProfitUsd;
        const retailValueUsd = commerceMetrics.retailValueUsd;
        const bundleYieldRatio = retailValueUsd > 0 ? Number((grossRevenueUsd / retailValueUsd).toFixed(4)) : 0;
        const purchaseCount = Math.max(
          0,
          Math.round(readMetric(raw, "purchaseTransactionCount", "purchaseCount")),
        );

        return [doc.id, {
          uid: doc.id,
          username: typeof raw.username === "string" ? raw.username : doc.id,
          eventCount: typeof raw.eventCount === "number" ? raw.eventCount : 0,
          sessionCount: typeof raw.sessionCount === "number" ? raw.sessionCount : 0,
          unwrapCount: typeof raw.unwrapCount === "number" ? raw.unwrapCount : 0,
          purchaseCount,
          watchSecondsTotal,
          watchHours: Number((watchSecondsTotal / 3600).toFixed(1)),
          avgLoadMs: loadSampleCount > 0 ? Math.round(loadMsTotal / loadSampleCount) : 0,
          lastSeenAt: typeof raw.lastSeenAt === "number" ? raw.lastSeenAt : 0,
          grossRevenueUsd,
          grossRevenueCents: commerceMetrics.grossRevenueCents,
          adjustedProfitUsd,
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
          bundleYieldRatio,
        }];
      }),
    );

    users.forEach((user) => {
      if (analyticsByUser[user.uid]) {
        return;
      }

      const commerceMetrics = buildEmptyCommerceMetrics();
      const retailValueUsd = commerceMetrics.retailValueUsd;
      analyticsByUser[user.uid] = {
        uid: user.uid,
        username: user.username || user.displayName || user.uid,
        eventCount: 0,
        sessionCount: 0,
        unwrapCount: 0,
        purchaseCount: 0,
        watchSecondsTotal: 0,
        watchHours: 0,
        avgLoadMs: 0,
        lastSeenAt: 0,
        grossRevenueUsd: commerceMetrics.grossRevenueUsd,
        grossRevenueCents: commerceMetrics.grossRevenueCents,
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

    const nowMs = Date.now();
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
      totalPurchases: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.purchaseCount || 0), 0),
      totalWatchHours: Number(
        (
          Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.watchSecondsTotal || 0), 0) / 3600
        ).toFixed(1),
      ),
      grossRevenueUsd: roundCurrency(Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.grossRevenueUsd || 0), 0)),
      adjustedProfitUsd: roundCurrency(Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.adjustedProfitUsd || 0), 0)),
      bonusValueUsd: roundCurrency(Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.bonusValueUsd || 0), 0)),
      bonusGumDrops: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.bonusGumDrops || 0), 0),
      deliveredGumDrops: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.deliveredGumDrops || 0), 0),
      paidGumDrops: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.paidGumDrops || 0), 0),
      unlockSpendGdTotal: Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.unlockSpendGdTotal || 0), 0),
      averageOrderUsd: (() => {
        const grossRevenueUsd = Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.grossRevenueUsd || 0), 0);
        const totalPurchases = Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.purchaseCount || 0), 0);
        return totalPurchases > 0 ? roundCurrency(grossRevenueUsd / totalPurchases) : 0;
      })(),
      effectiveUsdPer100Gd: (() => {
        const grossRevenueUsd = Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.grossRevenueUsd || 0), 0);
        const deliveredGd = Object.values(analyticsByUser).reduce((sum, entry) => sum + (entry.deliveredGumDrops || 0), 0);
        return deliveredGd > 0 ? roundCurrency(grossRevenueUsd / (deliveredGd / 100)) : 0;
      })(),
      payingUsers: Object.values(analyticsByUser).filter((entry) => (entry.purchaseCount || 0) > 0).length,
    };

    return NextResponse.json({
      success: true,
      users,
      analyticsByUser,
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

    const userRef = adminDb.collection("users").doc(userId);

    if (action === "add") {
      await userRef.update({
        unlockedContent: FieldValue.arrayUnion(dropId),
        [`unlockedContentTimestamps.${dropId}`]: Date.now(),
      });
    } else if (action === "remove") {
      await userRef.update({
        unlockedContent: FieldValue.arrayRemove(dropId),
        [`unlockedContentTimestamps.${dropId}`]: FieldValue.delete(),
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Admin.Users.POST");
  }
}
