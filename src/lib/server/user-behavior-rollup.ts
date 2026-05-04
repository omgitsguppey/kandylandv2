import { buildBehavioralTruthSummary } from "@/lib/behavioral/behavioral-truth-source";
import type {
  UserBehaviorRollup,
  UserBehaviorRollupConfidence,
  UserBehaviorRollupIssue,
} from "@/lib/user-behavior-rollup-contract";

import "server-only";

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildUserBehaviorRollup(input: {
  userId: string;
  totalActions?: unknown;
  views?: unknown;
  unwraps?: unknown;
  watchTimeMs?: unknown;
  watchSecondsTotal?: unknown;
  purchasesCount?: unknown;
  revenueUsd?: unknown;
  paidGdPurchased?: unknown;
  rewardGdEarned?: unknown;
  onboardingCompleted?: boolean;
  authEvents?: unknown;
  pushEnabled?: boolean;
  lastSeenAt?: unknown;
  hasRollup?: boolean;
  hasDaily?: boolean;
  hasFacts?: boolean;
  hasSessionFacts?: boolean;
  hasWatchSessions?: boolean;
  hasLegacyPageDuration?: boolean;
  hasTransactions?: boolean;
  commerceSourcePresent?: boolean;
  sourceIssues?: Array<string | { code?: string; message: string; severity?: "info" | "warn" | "fail"; evidence?: Record<string, unknown> }>;
}): UserBehaviorRollup {
  const views = Math.max(0, Math.round(readNumber(input.views)));
  const watchTimeMs = Math.max(
    0,
    Math.round(readNumber(input.watchTimeMs) || readNumber(input.watchSecondsTotal) * 1000),
  );
  const authEvents = Math.max(0, Math.round(readNumber(input.authEvents)));
  const issues: UserBehaviorRollupIssue[] = [];

  if (
    input.hasRollup !== true &&
    input.hasDaily !== true &&
    input.hasFacts !== true &&
    input.hasSessionFacts !== true &&
    input.hasWatchSessions !== true &&
    input.hasLegacyPageDuration !== true &&
    input.hasTransactions !== true
  ) {
    issues.push({
      code: "missing_behavior_sources",
      severity: "fail",
      message: "No canonical behavior rollup source is available for this user.",
      evidence: {
        hasRollup: Boolean(input.hasRollup),
        hasDaily: Boolean(input.hasDaily),
        hasFacts: Boolean(input.hasFacts),
        hasSessionFacts: Boolean(input.hasSessionFacts),
        hasWatchSessions: Boolean(input.hasWatchSessions),
        hasLegacyPageDuration: Boolean(input.hasLegacyPageDuration),
        hasTransactions: Boolean(input.hasTransactions),
      },
    });
  }

  if (views > 0 && watchTimeMs === 0) {
    issues.push({
      code: "watch_time_missing_despite_views",
      severity: "warn",
      message: "Views exist but valid watch-session rollups are missing.",
      evidence: { views, watchTimeMs },
    });
  }

  if (input.onboardingCompleted === true && authEvents === 0) {
    issues.push({
      code: "missing_auth_stats_for_onboarded_user",
      severity: "warn",
      message: "User is onboarded but auth events are missing from the behavior rollup.",
      evidence: { onboardingCompleted: true, authEvents },
    });
  }

  if (readNumber(input.revenueUsd) > 0 && input.commerceSourcePresent === false) {
    issues.push({
      code: "commerce_source_missing",
      severity: "warn",
      message: "Revenue is present but commerce source metadata is missing.",
      evidence: { revenueUsd: readNumber(input.revenueUsd), commerceSourcePresent: false },
    });
  }

  if ((views > 0 || readNumber(input.totalActions) > 0) && readNumber(input.lastSeenAt) === 0) {
    issues.push({
      code: "last_seen_missing",
      severity: "warn",
      message: "Behavior exists but last seen timestamp is missing.",
      evidence: { views, totalActions: readNumber(input.totalActions), lastSeenAt: readNumber(input.lastSeenAt) },
    });
  }

  (input.sourceIssues ?? []).forEach((issue) => {
    if (!issue) return;
    if (typeof issue !== "string") {
      issues.push({
        code: issue.code === "watch_time_missing_despite_views" || issue.code === "legacy_page_duration_fallback"
          ? issue.code
          : "source_degraded",
        severity: issue.severity ?? "info",
        message: issue.message,
        evidence: issue.evidence ?? {},
      });
      return;
    }

    issues.push({
      code: "source_degraded",
      severity: "info",
      message: issue,
      evidence: { sourceIssue: issue },
    });
  });

  const hasValue = Boolean(
    readNumber(input.totalActions) > 0 ||
    views > 0 ||
    Math.round(readNumber(input.unwraps)) > 0 ||
    watchTimeMs > 0 ||
    Math.round(readNumber(input.purchasesCount)) > 0 ||
    readNumber(input.revenueUsd) > 0 ||
    authEvents > 0 ||
    readNumber(input.lastSeenAt) > 0 ||
    input.onboardingCompleted === true ||
    input.pushEnabled === true
  );
  const truthSummary = buildBehavioralTruthSummary({
    scope: "user_detail_behavior",
    hasValue,
    ageMs: readNumber(input.lastSeenAt) > 0 ? Math.max(0, Date.now() - readNumber(input.lastSeenAt)) : Number.MAX_SAFE_INTEGER,
    sampleCount: Math.max(
      0,
      Math.round(readNumber(input.totalActions)),
      views,
      Math.round(readNumber(input.unwraps)),
      Math.round(readNumber(input.purchasesCount)),
      authEvents,
    ),
    requiredFieldsPresent: [
      input.userId.length > 0,
      readNumber(input.totalActions) >= 0,
      views >= 0,
      Math.round(readNumber(input.unwraps)) >= 0,
      watchTimeMs >= 0,
      Math.round(readNumber(input.purchasesCount)) >= 0,
      readNumber(input.lastSeenAt) > 0,
    ].filter(Boolean).length,
    requiredFieldsTotal: 7,
    issues,
    hasMaterializedRollup: input.hasRollup === true || input.hasDaily === true,
    hasEventFacts: input.hasFacts === true || input.hasSessionFacts === true || input.hasWatchSessions === true || input.hasTransactions === true,
    hasUserProfileFields: input.onboardingCompleted === true || input.pushEnabled === true,
    hasLegacyFallback: input.hasLegacyPageDuration === true,
    materializedLabel: input.hasRollup === true && input.hasDaily === true
      ? "analytics_users_rollup+analytics_user_daily"
      : input.hasRollup === true
        ? "analytics_users_rollup"
        : input.hasDaily === true
          ? "analytics_user_daily"
          : "materialized_rollup",
    eventFactsLabel: input.hasWatchSessions === true
      ? "analytics_watch_sessions"
      : input.hasSessionFacts === true
        ? "analytics_viewer_session_facts"
        : input.hasFacts === true
          ? "analytics_event_facts"
          : input.hasTransactions === true
            ? "transactions"
            : "event_facts",
    legacyFallbackLabel: "legacy_page_duration",
  });
  const confidence: UserBehaviorRollupConfidence = truthSummary.source === "unavailable" && !hasValue
    ? "unknown"
    : truthSummary.confidenceLabel;

  return {
    userId: input.userId,
    totalActions: Math.max(0, Math.round(readNumber(input.totalActions))),
    views,
    unwraps: Math.max(0, Math.round(readNumber(input.unwraps))),
    watchTimeMs,
    purchasesCount: Math.max(0, Math.round(readNumber(input.purchasesCount))),
    revenueUsd: Math.max(0, readNumber(input.revenueUsd)),
    paidGdPurchased: Math.max(0, Math.round(readNumber(input.paidGdPurchased))),
    rewardGdEarned: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
    onboardingCompleted: input.onboardingCompleted === true,
    authEvents,
    pushEnabled: input.pushEnabled === true,
    lastSeenAt: Math.max(0, readNumber(input.lastSeenAt)),
    confidence,
    confidenceScore: truthSummary.confidenceScore,
    source: truthSummary.source,
    sourceLabel: truthSummary.sourceLabel,
    freshnessState: truthSummary.freshnessState,
    issues,
  };
}
