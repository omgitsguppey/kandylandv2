import { buildCommerceMetricsFromRollup, buildEmptyCommerceMetrics } from "@/lib/admin-user-commerce";
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
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

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

function resolveFreshnessState(input: {
  generatedAt: number;
  latestMetricAt: number;
  hasAnyValue: boolean;
  source: AdminUserMetricsSnapshotSource;
  degraded?: boolean;
}): AdminUserMetricsFreshnessState {
  if (!input.hasAnyValue) {
    return "unavailable";
  }

  if (input.degraded || input.source === "live_fallback") {
    return "degraded";
  }

  if (input.latestMetricAt > 0 && input.generatedAt - input.latestMetricAt > STALE_AFTER_MS) {
    return "stale";
  }

  return "live";
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
  const watchRollup = buildWatchTimeRollupFromRecords({
    records: watchSessionRecords as Record<string, unknown>[],
    views: analytics.reduce((sum, entry) => sum + Math.round(entry.unwrapCount ?? 0), 0),
  });
  const commerceMetrics = input.commerceSummaryExists
    ? buildCommerceMetricsFromRollup(input.commerceSummaryRaw ?? {})
    : buildEmptyCommerceMetrics();
  const trackedPurchases = Math.max(
    Math.round(readMetric(input.commerceSummaryRaw ?? {}, "purchaseCount", "purchaseTransactionCount")),
    analytics.reduce((sum, entry) => sum + Math.round(entry.purchaseCount ?? 0), 0),
  );
  const trackedUnwraps = Math.max(
    Math.round(readMetric(input.commerceSummaryRaw ?? {}, "unlockCount", "totalUnlocks", "unwrapCount")),
    analytics.reduce((sum, entry) => sum + Math.round(entry.unwrapCount ?? 0), 0),
  );
  const watchTimeMs = watchRollup.watchTimeMs;
  const latestMetricAt = Math.max(
    analytics.reduce((latest, entry) => Math.max(latest, entry.lastSeenAt ?? 0), 0),
    watchRollup.latestWatchAt,
  );
  const totalRevenueUsd = commerceMetrics.grossRevenueUsd > 0
    ? commerceMetrics.grossRevenueUsd
    : roundCurrency(analytics.reduce((sum, entry) => sum + (entry.grossRevenueUsd ?? 0), 0));
  const source = input.source ?? (input.commerceSummaryExists ? "hot_cache" : "live_fallback");
  const hasAnyValue = input.users.length > 0 || analytics.length > 0 || totalRevenueUsd > 0 || trackedPurchases > 0 || trackedUnwraps > 0;
  const snapshot: AdminUserMetricsSnapshot = {
    totalUsers: input.users.length,
    activeUsers: input.users.filter((user) => user.status === "active").length,
    verifiedUsers: input.users.filter((user) => user.isVerified === true).length,
    sevenDayReturners: analytics.filter((entry) => generatedAt - (entry.lastSeenAt ?? 0) < SEVEN_DAYS_MS).length,
    pushEnabledUsers: input.users.filter((user) => user.notificationSettings?.browserPushEnabled === true).length,
    trackedUnwraps,
    trackedPurchases,
    watchTimeMs,
    onboardedUsers: input.users.filter((user) => user.onboardingCompleted === true).length,
    totalRevenueUsd,
    payingUsers: analytics.filter((entry) => (entry.purchaseCount ?? 0) > 0).length,
    generatedAt,
    source,
    freshnessState: resolveFreshnessState({
      generatedAt,
      latestMetricAt,
      hasAnyValue,
      source,
      degraded: input.degraded || watchRollup.issues.length > 0,
    }),
  };

  return {
    snapshot,
    sourceLabel: input.commerceSummaryExists
      ? "users+analytics_users_rollup+analytics_commerce_rollup+analytics_watch_sessions"
      : "users+analytics_users_rollup_live_fallback+analytics_watch_sessions",
    staleReason: snapshot.freshnessState === "stale"
      ? "Admin user metrics are showing the last known snapshot because recent metric freshness is older than 24h."
      : snapshot.freshnessState === "degraded"
        ? watchRollup.issues[0]?.message ?? "Admin user metrics are visible, but at least one source is degraded or using fallback reads."
        : null,
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
