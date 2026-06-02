import { buildCommerceMetricsFromRollup, buildEmptyCommerceMetrics } from "@/lib/admin-user-commerce";
import { buildBehavioralTruthSummary } from "@/lib/behavioral/behavioral-truth-source";
import { buildWatchTimeRollupFromRecords } from "@/lib/server/watch-time-rollup";
import type {
  AdminUserMetricsFreshnessState,
  AdminUserMetricsSnapshot,
  AdminUserMetricsSnapshotMetadata,
  AdminUserMetricsSnapshotSource,
} from "@/lib/admin-user-metrics-contract";

type FirestoreDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

type FirestoreCollection = {
  get: () => Promise<{ docs: FirestoreDoc[] }>;
};

type FirestoreDocRef = {
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
};

type AdminMetricsDb = {
  collection: (name: string) => FirestoreCollection & {
    doc?: (id: string) => FirestoreDocRef;
  };
};

type SnapshotUser = {
  uid: string;
  status?: string | null;
  isVerified?: boolean | null;
  onboardingCompleted?: boolean | null;
  notificationSettings?: {
    browserPushEnabled?: boolean | null;
  } | null;
};

type SnapshotAnalytics = {
  lastSeenAt?: number | null;
  unwrapCount?: number | null;
  purchaseCount?: number | null;
  watchSecondsTotal?: number | null;
  grossRevenueUsd?: number | null;
};
type SnapshotWatchSession = {
  userId?: string | null;
  validWatchMs?: number | null;
  lastSeenAtMs?: number | null;
  watchScoreSource?: string | null;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function readMetric(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function toTimestampNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildAdminUserMetricsSnapshot(input: {
  users: SnapshotUser[];
  analyticsByUser: Record<string, SnapshotAnalytics>;
  watchSessionsByUser?: Record<string, SnapshotWatchSession[]>;
  commerceSummaryRaw?: Record<string, unknown> | null;
  commerceSummaryExists?: boolean;
  generatedAt?: number;
  source?: AdminUserMetricsSnapshotSource;
  degraded?: boolean;
}): AdminUserMetricsSnapshotMetadata {
  const generatedAt = input.generatedAt ?? Date.now();
  const analytics = Object.values(input.analyticsByUser);
  const watchSessionRecords = Object.values(input.watchSessionsByUser ?? {}).flat();
  const analyticsTotals = analytics.reduce(
    (acc, entry) => {
      const unwrapCount = Math.round(entry.unwrapCount ?? 0);
      const watchSecondsTotalMs = Math.round((entry.watchSecondsTotal ?? 0) * 1000);
      const purchaseCount = Math.round(entry.purchaseCount ?? 0);

      acc.unwrapCountSum += unwrapCount;
      acc.watchSecondsTotalMsSum += watchSecondsTotalMs;
      acc.viewedFileCountSum += Math.max(0, unwrapCount);
      acc.purchaseCountSum += purchaseCount;
      acc.grossRevenueUsdSum += entry.grossRevenueUsd ?? 0;
      acc.latestLastSeenAt = Math.max(acc.latestLastSeenAt, entry.lastSeenAt ?? 0);

      if (generatedAt - (entry.lastSeenAt ?? 0) < SEVEN_DAYS_MS) {
        acc.sevenDayReturners += 1;
      }
      if (purchaseCount > 0) {
        acc.payingUsers += 1;
      }

      return acc;
    },
    {
      unwrapCountSum: 0,
      watchSecondsTotalMsSum: 0,
      viewedFileCountSum: 0,
      purchaseCountSum: 0,
      grossRevenueUsdSum: 0,
      latestLastSeenAt: 0,
      sevenDayReturners: 0,
      payingUsers: 0,
    }
  );

  const watchRollup = buildWatchTimeRollupFromRecords({
    records: watchSessionRecords as Record<string, unknown>[],
    views: analyticsTotals.unwrapCountSum,
    // analytics watchSecondsTotal is diagnostic context only; it must not populate canonical watchTimeMs without valid watch sessions.
    viewerOpenMs: analyticsTotals.watchSecondsTotalMsSum,
    pageDurationMs: analyticsTotals.watchSecondsTotalMsSum,
    viewedFileCount: analyticsTotals.viewedFileCountSum,
  });
  const commerceMetrics = input.commerceSummaryExists
    ? buildCommerceMetricsFromRollup(input.commerceSummaryRaw ?? {})
    : buildEmptyCommerceMetrics();
  const trackedPurchases = Math.max(
    Math.round(readMetric(input.commerceSummaryRaw ?? {}, "purchaseCount", "purchaseTransactionCount")),
    analyticsTotals.purchaseCountSum,
  );
  const trackedUnwraps = Math.max(
    Math.round(readMetric(input.commerceSummaryRaw ?? {}, "unlockCount", "totalUnlocks", "unwrapCount")),
    analyticsTotals.unwrapCountSum,
  );
  const watchTimeMs = watchRollup.watchTimeMs;
  const latestMetricAt = Math.max(
    analyticsTotals.latestLastSeenAt,
    watchRollup.latestWatchAt,
  );
  const totalRevenueUsd = commerceMetrics.grossRevenueUsd > 0
    ? commerceMetrics.grossRevenueUsd
    : roundCurrency(analyticsTotals.grossRevenueUsdSum);
  const source = input.source ?? (input.commerceSummaryExists ? "hot_cache" : "live_fallback");
  const hasAnyValue = input.users.length > 0 || analytics.length > 0 || totalRevenueUsd > 0 || trackedPurchases > 0 || trackedUnwraps > 0;
  const truthSummary = buildBehavioralTruthSummary({
    scope: "admin_metrics",
    hasValue: hasAnyValue,
    ageMs: latestMetricAt > 0 ? Math.max(0, generatedAt - latestMetricAt) : Number.MAX_SAFE_INTEGER,
    sampleCount: Math.max(input.users.length, analytics.length, watchRollup.validSessionCount, trackedPurchases, trackedUnwraps),
    requiredFieldsPresent: [
      input.users.length > 0,
      analytics.length > 0,
      trackedUnwraps >= 0,
      trackedPurchases >= 0,
      watchTimeMs >= 0,
      totalRevenueUsd >= 0,
    ].filter(Boolean).length,
    requiredFieldsTotal: 6,
    issues: [
      ...(input.degraded ? ["admin_user_metrics_snapshot_degraded"] : []),
      ...watchRollup.issues,
    ],
    hasMaterializedRollup: input.commerceSummaryExists === true,
    hasEventFacts: analytics.length > 0 || watchRollup.validSessionCount > 0,
    hasLiveFallback: source === "live_fallback",
    materializedLabel: "analytics_commerce_rollup+analytics_watch_sessions",
    eventFactsLabel: "analytics_users_rollup+analytics_watch_sessions",
    liveFallbackLabel: "users+analytics_users_rollup_live_fallback",
  });
  const userTotals = input.users.reduce(
    (acc, user) => {
      if (user.status === "active") acc.activeUsers++;
      if (user.isVerified === true) acc.verifiedUsers++;
      if (user.notificationSettings?.browserPushEnabled === true) acc.pushEnabledUsers++;
      if (user.onboardingCompleted === true) acc.onboardedUsers++;
      return acc;
    },
    {
      activeUsers: 0,
      verifiedUsers: 0,
      pushEnabledUsers: 0,
      onboardedUsers: 0,
    }
  );

  const snapshot: AdminUserMetricsSnapshot = {
    totalUsers: input.users.length,
    activeUsers: userTotals.activeUsers,
    verifiedUsers: userTotals.verifiedUsers,
    sevenDayReturners: analyticsTotals.sevenDayReturners,
    pushEnabledUsers: userTotals.pushEnabledUsers,
    trackedUnwraps,
    trackedPurchases,
    watchTimeMs,
    watchTimeSource: watchRollup.source,
    watchTimeIssues: watchRollup.issues,
    watchTimeDiagnosticEstimate: watchRollup.diagnosticEstimate,
    onboardedUsers: userTotals.onboardedUsers,
    totalRevenueUsd,
    payingUsers: analyticsTotals.payingUsers,
    generatedAt,
    source,
    freshnessState: truthSummary.freshnessState as AdminUserMetricsFreshnessState,
    truthSource: truthSummary.source,
    confidenceScore: truthSummary.confidenceScore,
    confidenceLabel: truthSummary.confidenceLabel,
    issues: truthSummary.issues,
  };

  return {
    snapshot,
    sourceLabel: input.commerceSummaryExists
      ? "users+analytics_users_rollup+analytics_commerce_rollup+analytics_watch_sessions"
      : "users+analytics_users_rollup_live_fallback+analytics_watch_sessions",
    staleReason: snapshot.freshnessState === "stale"
      ? "Admin user metrics are showing the last known snapshot because recent metric freshness is older than 5m."
      : snapshot.freshnessState === "degraded"
        ? truthSummary.issues[0] ?? "Admin user metrics are visible, but at least one source is degraded or using fallback reads."
        : null,
    confidenceScore: truthSummary.confidenceScore,
    confidenceLabel: truthSummary.confidenceLabel,
    issues: truthSummary.issues,
  };
}

export async function readAdminUserMetricsSnapshot(input: {
  db: AdminMetricsDb;
  generatedAt?: number;
}): Promise<AdminUserMetricsSnapshotMetadata> {
  const [usersSnapshot, analyticsSnapshot, userDailySnapshot, watchSessionsSnapshot, commerceSummarySnap] = await Promise.all([
    input.db.collection("users").get(),
    input.db.collection("analytics_users_rollup").get(),
    input.db.collection("analytics_user_daily").get(),
    input.db.collection("analytics_watch_sessions").get(),
    input.db.collection("analytics_commerce_rollup").doc?.("summary").get(),
  ]);

  const dailyByUser = new Map<string, {
    lastSeenAt: number;
    unwrapCount: number;
    purchaseCount: number;
    watchSecondsTotal: number;
    grossRevenueUsd: number;
  }>();
  userDailySnapshot.docs.forEach((doc) => {
    const raw = doc.data();
    const uid = typeof raw.uid === "string" ? raw.uid : "";
    if (!uid) {
      return;
    }

    const current = dailyByUser.get(uid) ?? {
      lastSeenAt: 0,
      unwrapCount: 0,
      purchaseCount: 0,
      watchSecondsTotal: 0,
      grossRevenueUsd: 0,
    };
    current.lastSeenAt = Math.max(current.lastSeenAt, toTimestampNumber(raw.lastSeenAt), toTimestampNumber(raw.lastSeenAtMs));
    current.unwrapCount += Math.round(readMetric(raw, "unwrapCount", "unlockCount"));
    current.purchaseCount += Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount"));
    current.watchSecondsTotal += Math.round(readMetric(raw, "watchSecondsTotal"));
    current.grossRevenueUsd += readMetric(raw, "grossRevenueUsdTotal", "grossRevenueUsd");
    dailyByUser.set(uid, current);
  });

  const users = usersSnapshot.docs.map((doc) => {
    const raw = doc.data();
    const notificationSettings = raw.notificationSettings && typeof raw.notificationSettings === "object"
      ? raw.notificationSettings as SnapshotUser["notificationSettings"]
      : null;

    return {
      uid: doc.id,
      status: typeof raw.status === "string" ? raw.status : null,
      isVerified: raw.isVerified === true,
      onboardingCompleted: raw.onboardingCompleted === true,
      notificationSettings,
    };
  });

  const analyticsByUser = Object.fromEntries(analyticsSnapshot.docs.map((doc) => {
    const raw = doc.data();
    const daily = dailyByUser.get(doc.id);

    return [doc.id, {
      lastSeenAt: Math.max(toTimestampNumber(raw.lastSeenAt), toTimestampNumber(raw.lastSeenAtMs), daily?.lastSeenAt ?? 0),
      unwrapCount: Math.max(Math.round(readMetric(raw, "unwrapCount", "unlockCount")), daily?.unwrapCount ?? 0),
      purchaseCount: Math.max(Math.round(readMetric(raw, "purchaseCount", "purchaseTransactionCount")), daily?.purchaseCount ?? 0),
      watchSecondsTotal: Math.max(Math.round(readMetric(raw, "watchSecondsTotal")), daily?.watchSecondsTotal ?? 0),
      grossRevenueUsd: Math.max(readMetric(raw, "grossRevenueUsdTotal", "grossRevenueUsd"), daily?.grossRevenueUsd ?? 0),
    }];
  }));
  const watchSessionsByUser: Record<string, SnapshotWatchSession[]> = {};
  watchSessionsSnapshot.docs.forEach((doc) => {
    const raw = doc.data();
    const userId = typeof raw.userId === "string" ? raw.userId : "";
    if (!userId) {
      return;
    }

    watchSessionsByUser[userId] = [
      ...(watchSessionsByUser[userId] ?? []),
      {
        userId,
        validWatchMs: readMetric(raw, "validWatchMs"),
        lastSeenAtMs: toTimestampNumber(raw.lastSeenAtMs),
        watchScoreSource: typeof raw.watchScoreSource === "string" ? raw.watchScoreSource : null,
      },
    ];
  });

  dailyByUser.forEach((daily, uid) => {
    if (uid in analyticsByUser) {
      return;
    }

    analyticsByUser[uid] = daily;
  });

  return buildAdminUserMetricsSnapshot({
    users,
    analyticsByUser,
    watchSessionsByUser,
    commerceSummaryRaw: commerceSummarySnap?.exists ? commerceSummarySnap.data() : {},
    commerceSummaryExists: commerceSummarySnap?.exists === true,
    generatedAt: input.generatedAt,
    source: commerceSummarySnap?.exists ? "hot_cache" : "live_fallback",
  });
}
