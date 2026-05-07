import {
  buildBehavioralTruthSummary,
  type BehavioralDataAvailabilityReason,
} from "@/lib/behavioral/behavioral-truth-source";
import {
  computeUserEngagementScore,
  type UserEngagementScoreInput,
  type UserEngagementScoreResult,
} from "@/lib/behavioral/user-engagement-score";
import {
  computeUserValueScore,
  type UserValueScoreInput,
  type UserValueScoreResult,
} from "@/lib/behavioral/user-value-score";
import {
  clamp01,
  computeBehavioralTruthScore,
  getBehavioralSourceReliability,
  logNorm,
  resolveBehavioralModelActivation,
} from "@/lib/behavioral/behavioral-math-calibration";
import type {
  UserBehaviorRollup,
  UserBehaviorRollupConfidence,
  UserBehaviorRollupIssue,
} from "@/lib/user-behavior-rollup-contract";

import "server-only";

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resolveSourceReliability(input: {
  hasTransactions?: boolean;
  hasWatchSessions?: boolean;
  hasFacts?: boolean;
  hasSessionFacts?: boolean;
  hasLegacyPageDuration?: boolean;
  purchasesCount: number;
  revenueUsd: number;
  unwraps: number;
}) {
  if (input.hasTransactions === true && (input.purchasesCount > 0 || input.revenueUsd > 0)) {
    return getBehavioralSourceReliability("server_transaction");
  }

  if ((input.hasFacts === true || input.hasSessionFacts === true) && input.unwraps > 0) {
    return getBehavioralSourceReliability("server_entitlement_unlock");
  }

  if (input.hasWatchSessions === true) {
    return getBehavioralSourceReliability("watch_session_rollup");
  }

  if (input.hasFacts === true || input.hasSessionFacts === true) {
    return getBehavioralSourceReliability("identified_event_fact");
  }

  if (input.hasLegacyPageDuration === true) {
    return getBehavioralSourceReliability("legacy_page_duration");
  }

  return 0;
}

function resolveBehaviorPrivacyAvailability(input: {
  identifiedAnalyticsEnabled?: boolean;
  honorGlobalPrivacyControl?: boolean;
  globalPrivacyControl?: boolean;
  hasPrivacySettings?: boolean;
}): BehavioralDataAvailabilityReason {
  if (input.hasPrivacySettings !== true) {
    return "full_signal";
  }

  const gpcBlocked = input.honorGlobalPrivacyControl !== false && input.globalPrivacyControl === true;
  if (gpcBlocked) {
    return "privacy_limited_global_privacy_control";
  }

  if (input.identifiedAnalyticsEnabled !== true) {
    return "privacy_limited_identified_analytics_denied";
  }

  return "full_signal";
}

function applyPrivacyLimitedEngagementFloor(
  engagement: UserEngagementScoreResult,
  privacyReason: BehavioralDataAvailabilityReason,
  hasVerifiedSignal: boolean,
): UserEngagementScoreResult {
  if (privacyReason === "full_signal" || hasVerifiedSignal) {
    return engagement;
  }

  return {
    ...engagement,
    score: Math.max(engagement.score, 24),
    tier: "light",
    verdict: "Privacy limited",
  };
}

function applyPrivacyLimitedValueFloor(
  value: UserValueScoreResult,
  privacyReason: BehavioralDataAvailabilityReason,
  hasVerifiedSignal: boolean,
): UserValueScoreResult {
  if (privacyReason === "full_signal" || hasVerifiedSignal) {
    return value;
  }

  return {
    ...value,
    valueScore: Math.max(value.valueScore, 22),
    valueTier: "warm",
    verdict: "Privacy limited",
  };
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
  identifiedAnalyticsEnabled?: boolean;
  honorGlobalPrivacyControl?: boolean;
  globalPrivacyControl?: boolean;
  hasPrivacySettings?: boolean;
  commerceSourcePresent?: boolean;
  engagementInput?: UserEngagementScoreInput;
  valueInput?: UserValueScoreInput;
  sourceIssues?: Array<string | { code?: string; message: string; severity?: "info" | "warn" | "fail"; evidence?: Record<string, unknown> }>;
}): UserBehaviorRollup {
  const views = Math.max(0, Math.round(readNumber(input.views)));
  const watchTimeMs = Math.max(
    0,
    Math.round(readNumber(input.watchTimeMs) || readNumber(input.watchSecondsTotal) * 1000),
  );
  const authEvents = Math.max(0, Math.round(readNumber(input.authEvents)));
  const privacyAvailabilityReason = resolveBehaviorPrivacyAvailability({
    identifiedAnalyticsEnabled: input.identifiedAnalyticsEnabled,
    honorGlobalPrivacyControl: input.honorGlobalPrivacyControl,
    globalPrivacyControl: input.globalPrivacyControl,
    hasPrivacySettings: input.hasPrivacySettings,
  });
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

  if (privacyAvailabilityReason === "privacy_limited_identified_analytics_denied") {
    issues.push({
      code: "privacy_limited_identified_analytics_denied",
      severity: "info",
      message: "Identified analytics are disabled for this user, so engagement and value truth are privacy-limited.",
      evidence: {
        identifiedAnalyticsEnabled: input.identifiedAnalyticsEnabled === true,
        hasPrivacySettings: input.hasPrivacySettings === true,
      },
    });
  }

  if (privacyAvailabilityReason === "privacy_limited_global_privacy_control") {
    issues.push({
      code: "privacy_limited_global_privacy_control",
      severity: "info",
      message: "Global Privacy Control is blocking identified analytics, so engagement and value truth are privacy-limited.",
      evidence: {
        honorGlobalPrivacyControl: input.honorGlobalPrivacyControl !== false,
        globalPrivacyControl: input.globalPrivacyControl === true,
      },
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
    input.pushEnabled === true ||
    privacyAvailabilityReason !== "full_signal"
  );
  const truthSummary = buildBehavioralTruthSummary({
    scope: "user_detail_behavior",
    hasValue,
    dataAvailabilityReason: privacyAvailabilityReason,
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
    hasUserProfileFields: input.onboardingCompleted === true || input.pushEnabled === true || input.hasPrivacySettings === true,
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
  const purchasesCount = Math.max(0, Math.round(readNumber(input.purchasesCount)));
  const unwraps = Math.max(0, Math.round(readNumber(input.unwraps)));
  const revenueUsd = Math.max(0, readNumber(input.revenueUsd));
  const sourceReliability = resolveSourceReliability({
    hasTransactions: input.hasTransactions,
    hasWatchSessions: input.hasWatchSessions,
    hasFacts: input.hasFacts,
    hasSessionFacts: input.hasSessionFacts,
    hasLegacyPageDuration: input.hasLegacyPageDuration,
    purchasesCount,
    revenueUsd,
    unwraps,
  });
  const truthScore = computeBehavioralTruthScore({
    sourceReliability,
    freshnessScore: truthSummary.breakdown.freshnessScore,
    sampleScore: truthSummary.breakdown.sampleScore,
    schemaCompleteness: truthSummary.requiredFieldsPresent / Math.max(1, truthSummary.requiredFieldsTotal),
    sourceDisagreementPenalty: clamp01(issues.length / 5),
  });
  const rawEngagement = computeUserEngagementScore(input.engagementInput ?? {
    normalizedActionCount7d: Math.max(0, Math.round(readNumber(input.totalActions))),
    unwrappedCount30d: unwraps,
    validWatchMinutes30d: Math.max(0, Math.round(watchTimeMs / 60_000)),
    purchaseCount90d: purchasesCount,
    activeDays7d: readNumber(input.lastSeenAt) > 0 ? 1 : 0,
    freeGdEarned30d: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
  });
  const rawValue = computeUserValueScore(input.valueInput ?? {
    totalSpendUsd: revenueUsd,
    purchaseCount: purchasesCount,
    paidGdPurchased: Math.max(0, Math.round(readNumber(input.paidGdPurchased))),
    bonusGdDelivered: 0,
    rewardGdEarned: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
    freeGdEarned30d: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
    unwrapsAfterPurchase: unwraps,
    daysSinceLastPurchase: purchasesCount > 0 && readNumber(input.lastSeenAt) > 0 ? 0 : null,
  });
  const hasVerifiedEngagementSignal = Boolean(
    readNumber(input.totalActions) > 0 ||
    views > 0 ||
    unwraps > 0 ||
    watchTimeMs > 0 ||
    purchasesCount > 0 ||
    authEvents > 0
  );
  const hasVerifiedValueSignal = Boolean(
    purchasesCount > 0 ||
    revenueUsd > 0 ||
    Math.round(readNumber(input.paidGdPurchased)) > 0 ||
    unwraps > 0
  );
  const engagement = applyPrivacyLimitedEngagementFloor(
    rawEngagement,
    privacyAvailabilityReason,
    hasVerifiedEngagementSignal,
  );
  const value = applyPrivacyLimitedValueFloor(
    rawValue,
    privacyAvailabilityReason,
    hasVerifiedValueSignal,
  );
  const predictionOutputs = {
    pPurchase7d: value.repeatPurchaseLikelihood,
    pUnlock24h: clamp01(views === 0 ? 0 : unwraps / Math.max(1, views)),
    pWatchComplete: clamp01(watchTimeMs / (30 * 60_000)),
    pReturn7d: clamp01((input.engagementInput?.activeDays7d ?? (readNumber(input.lastSeenAt) > 0 ? 1 : 0)) / 7),
    pCreatorFollow: clamp01(logNorm(readNumber(input.totalActions), 100) * 0.25 + logNorm(unwraps, 25) * 0.35 + truthScore * 0.4),
    pNegativeFeedback: clamp01(issues.filter((issue) => issue.severity === "fail" || issue.severity === "warn").length / 5),
  };
  const mathCalibration = {
    ...resolveBehavioralModelActivation({ sampleSize: 0 }),
    surfaceObjective: "admin_users" as const,
    validationSource: "behavioral-math-calibration" as const,
  };

  return {
    userId: input.userId,
    totalActions: Math.max(0, Math.round(readNumber(input.totalActions))),
    views,
    unwraps,
    watchTimeMs,
    purchasesCount,
    revenueUsd,
    paidGdPurchased: Math.max(0, Math.round(readNumber(input.paidGdPurchased))),
    rewardGdEarned: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
    onboardingCompleted: input.onboardingCompleted === true,
    authEvents,
    pushEnabled: input.pushEnabled === true,
    lastSeenAt: Math.max(0, readNumber(input.lastSeenAt)),
    confidence,
    confidenceScore: truthSummary.confidenceScore,
    truthScore,
    sourceReliability,
    predictionOutputs,
    mathCalibration,
    source: truthSummary.source,
    sourceLabel: truthSummary.sourceLabel,
    freshnessState: truthSummary.freshnessState,
    dataAvailabilityReason: truthSummary.dataAvailabilityReason,
    issues,
    engagement,
    value,
  };
}
