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
  const ageHours = input.lastSeenAt > 0 ? Math.max(1, (nowMs - input.lastSeenAt) / (60 * 60 * 1000)) : 720;
  const recencyBoost = Math.max(0, 120 - ageHours) / 120;
  const spendScore = (input.grossRevenueUsd * 20) + (input.purchaseCount * 30) + (input.unlockSpendGdTotal / 25);
  const behaviorScore = input.eventCount + (input.viewCount * 2) + (input.sessionCount * 4) + (input.watchSecondsTotal / 60);

  return Math.round((spendScore + behaviorScore) * (1 + recencyBoost));
}
