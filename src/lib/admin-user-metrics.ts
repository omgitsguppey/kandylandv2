import { computeUserEngagementScore } from "@/lib/behavioral/user-engagement-score";
import type { UserEngagementActivityDay } from "@/lib/behavioral/user-engagement-score";
import type { UserValueActivityDay } from "@/lib/behavioral/user-value-score";

export type AdminMetricTruthLabel = "live" | "partial" | "stale" | "unknown";

export type AdminUserMetricIntegrity = {
  truthLabel: AdminMetricTruthLabel;
  sourceLabel: string;
  failures: string[];
  recoveredFromFacts: boolean;
  verificationState: "live" | "degraded" | "stale" | "unavailable";
  freshnessMs: number | null;
};

export type AdminUserMetricSnapshot = {
  eventCount: number;
  sessionCount: number;
  viewCount: number;
  bounceCount: number;
  authSuccessCount: number;
  onboardingCompletionCount: number;
  watchSecondsTotal: number;
  unwrapCount: number;
  purchaseCount: number;
  grossRevenueUsd: number;
  unlockSpendGdTotal: number;
  lastSeenAt: number;
};

export type AdminUserMetricSourceInput = {
  hasRollup: boolean;
  hasDaily: boolean;
  recoveredFromFacts: boolean;
  userOnboarded: boolean;
  userCreatedAt: number;
  nowMs: number;
  lastSeenAt?: number;
  metrics: AdminUserMetricSnapshot;
};

function toMetricTimestampMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value
    && typeof value === "object"
    && "toMillis" in value
    && typeof (value as { toMillis: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

function readMetric(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function maxMetric(raw: Record<string, unknown>, ...keys: string[]) {
  return Math.max(...keys.map((key) => readMetric(raw, key)));
}

export function buildAdminUserEngagementDay(raw: Record<string, unknown>): UserEngagementActivityDay {
  const watchSecondsTotal = readMetric(raw, "watchSecondsTotal");
  return {
    timestampMs: Math.max(
      toMetricTimestampMs(raw.lastSeenAt),
      toMetricTimestampMs(raw.lastSeenAtMs),
      toMetricTimestampMs(raw.updatedAt),
      toMetricTimestampMs(raw.createdAt),
    ),
    normalizedActionCount: Math.round(readMetric(raw, "eventCount")),
    unwrappedCount: Math.round(maxMetric(raw, "unwrapCount", "unlockCount")),
    validWatchMinutes: Math.round(watchSecondsTotal / 60),
    purchaseCount: Math.round(maxMetric(raw, "purchaseCount", "purchaseTransactionCount")),
    freeGdEarned: Math.round(maxMetric(
      raw,
      "rewardGdEarned",
      "rewardGdEarnedTotal",
      "rewardGumDropsEarned",
      "rewardAmountEarned",
      "dailyRewardGd",
      "dailyRewardGdTotal",
      "freeGdEarned",
    )),
    hadVisit: readMetric(raw, "viewCount") > 0 || watchSecondsTotal > 0,
    hadAuth: maxMetric(raw, "authSuccessCount", "signInCount") > 0,
  };
}

export function buildAdminUserValueDay(raw: Record<string, unknown>): UserValueActivityDay {
  const grossRevenueUsd = maxMetric(raw, "grossRevenueUsdTotal", "grossRevenueUsd");
  const purchaseCount = Math.max(
    maxMetric(raw, "purchaseCount", "purchaseTransactionCount"),
    grossRevenueUsd > 0 ? 1 : 0,
  );

  return {
    timestampMs: Math.max(
      toMetricTimestampMs(raw.lastPurchaseAt),
      toMetricTimestampMs(raw.lastSeenAt),
      toMetricTimestampMs(raw.lastSeenAtMs),
      toMetricTimestampMs(raw.updatedAt),
      toMetricTimestampMs(raw.createdAt),
    ),
    grossRevenueUsd,
    purchaseCount,
    paidGdPurchased: maxMetric(raw, "paidGumDropsTotal", "paidGumDrops"),
    bonusGdDelivered: maxMetric(raw, "bonusGumDropsTotal", "bonusGumDrops"),
    rewardGdEarned: maxMetric(
      raw,
      "rewardGdEarned",
      "rewardGdEarnedTotal",
      "rewardGumDropsEarned",
      "rewardAmountEarned",
      "dailyRewardGd",
      "dailyRewardGdTotal",
      "freeGdEarned",
    ),
    unwrappedCount: maxMetric(raw, "unwrapCount", "unlockCount"),
  };
}

export function shouldRecoverAdminUserMetricsFromFacts(input: {
  hasRollup: boolean;
  hasDaily: boolean;
  userOnboarded: boolean;
  metrics?: Partial<AdminUserMetricSnapshot>;
}): boolean {
  const metrics = input.metrics ?? {};

  if (!input.hasRollup && !input.hasDaily) {
    return true;
  }

  if ((metrics.eventCount ?? 0) > 0 && (metrics.eventCount ?? 0) <= 14) {
    return true;
  }

  if ((metrics.viewCount ?? 0) === 0 && ((metrics.sessionCount ?? 0) > 0 || (metrics.watchSecondsTotal ?? 0) > 0)) {
    return true;
  }

  if ((metrics.watchSecondsTotal ?? 0) === 0 && ((metrics.viewCount ?? 0) > 0 || (metrics.sessionCount ?? 0) > 0)) {
    return true;
  }

  if (input.userOnboarded && (metrics.onboardingCompletionCount ?? 0) === 0) {
    return true;
  }

  return false;
}

export function buildAdminUserMetricIntegrity(input: AdminUserMetricSourceInput): AdminUserMetricIntegrity {
  const failures: string[] = [];
  const sourceParts: string[] = [];

  if (input.hasRollup) sourceParts.push("analytics_users_rollup");
  if (input.hasDaily) sourceParts.push("analytics_user_daily");
  if (input.recoveredFromFacts) sourceParts.push("analytics_event_facts_recovery");

  if (input.metrics.eventCount > 0 && input.metrics.eventCount <= 14 && !input.recoveredFromFacts) {
    failures.push("event_count_suspected_capped");
  }

  if (input.metrics.viewCount === 0 && (input.metrics.sessionCount > 0 || input.metrics.watchSecondsTotal > 0)) {
    failures.push("views_missing_despite_sessions_or_watch_time");
  }

  if (input.metrics.watchSecondsTotal === 0 && input.metrics.viewCount > 0) {
    failures.push("watch_time_missing_despite_views");
  }

  if (input.userOnboarded && input.metrics.authSuccessCount === 0) {
    failures.push("auth_stats_missing_for_onboarded_user");
  }

  if (input.userOnboarded && input.metrics.eventCount === 0) {
    failures.push("events_missing_for_onboarded_user");
  }

  const userAgeMs = Math.max(0, input.nowMs - input.userCreatedAt);
  const freshnessTimestamp = input.lastSeenAt ?? input.metrics.lastSeenAt ?? 0;
  const freshnessMs = freshnessTimestamp > 0 ? Math.max(0, input.nowMs - freshnessTimestamp) : null;
  if (userAgeMs > 24 * 60 * 60 * 1000 && !input.hasRollup && !input.hasDaily && !input.recoveredFromFacts) {
    failures.push("no_canonical_metric_sources");
  }

  const verificationState =
    failures.length > 0 ? "degraded"
      : sourceParts.length === 0 ? "unavailable"
      : freshnessMs !== null && freshnessMs > 7 * 24 * 60 * 60 * 1000 ? "stale"
      : "live";

  return {
    truthLabel: verificationState === "degraded"
      ? "partial"
      : verificationState === "stale"
        ? "stale"
        : verificationState === "live"
          ? "live"
          : "unknown",
    sourceLabel: sourceParts.length > 0 ? sourceParts.join("+") : "no_canonical_metrics",
    failures,
    recoveredFromFacts: input.recoveredFromFacts,
    verificationState,
    freshnessMs,
  };
}

export function scoreAdminUserEngagement(input: AdminUserMetricSnapshot, nowMs: number): number {
  const activeDays7d = input.lastSeenAt > 0 && nowMs - input.lastSeenAt <= 7 * 24 * 60 * 60 * 1000 ? 1 : 0;
  return computeUserEngagementScore({
    normalizedActionCount7d: input.eventCount,
    unwrappedCount30d: input.unwrapCount,
    validWatchMinutes30d: Math.round(input.watchSecondsTotal / 60),
    purchaseCount90d: input.purchaseCount,
    activeDays7d,
    freeGdEarned30d: 0,
  }).score;
}
