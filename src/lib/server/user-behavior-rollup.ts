import {
  buildBehavioralTruthSummary,
  type BehavioralDataAvailabilityReason,
} from "@/lib/behavioral/behavioral-truth-source";
import {
  computeUserEngagementScore,
  type UserEngagementScoreInput,
} from "@/lib/behavioral/user-engagement-score";
import {
  computeUserValueScore,
  type UserValueScoreInput,
} from "@/lib/behavioral/user-value-score";
import {
  clamp01,
  computeBehavioralTruthScore,
  getBehavioralSourceReliability,
  logNorm,
  resolveBehavioralModelActivation,
} from "@/lib/behavioral/behavioral-math-calibration";
import {
  applyPrivacyAwareValueFloor,
  describePrivacyAwareEngagementScore,
} from "@/lib/behavioral/privacy-aware-scoring";
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

function buildVerifiedEngagementFallbackInput(input: {
  totalActions?: unknown;
  views: number;
  unwraps: number;
  watchTimeMs: number;
  purchasesCount: number;
  authEvents: number;
  lastSeenAt?: unknown;
  rewardGdEarned?: unknown;
}): UserEngagementScoreInput {
  const totalActions = Math.max(0, Math.round(readNumber(input.totalActions)));
  const verifiedActionSignals = Math.max(
    totalActions,
    input.views + input.unwraps + input.purchasesCount + input.authEvents,
  );
  const hasAnyVerifiedActivity = Boolean(
    verifiedActionSignals > 0
    || input.watchTimeMs > 0
    || readNumber(input.lastSeenAt) > 0
  );

  return {
    normalizedActionCount7d: verifiedActionSignals,
    unwrappedCount30d: input.unwraps,
    validWatchMinutes30d: Math.max(0, Math.round(input.watchTimeMs / 60_000)),
    purchaseCount90d: input.purchasesCount,
    activeDays7d: hasAnyVerifiedActivity ? 1 : 0,
    freeGdEarned30d: Math.max(0, Math.round(readNumber(input.rewardGdEarned))),
  };
}

function mergeEngagementInputWithVerifiedFallback(input: {
  dailyInput?: UserEngagementScoreInput;
  fallbackInput: UserEngagementScoreInput;
}) {
  const dailyInput = input.dailyInput;
  if (!dailyInput) {
    return {
      engagementInput: input.fallbackInput,
      fallbackReasons: [] as string[],
    };
  }

  const fields = [
    "normalizedActionCount7d",
    "unwrappedCount30d",
    "validWatchMinutes30d",
    "purchaseCount90d",
    "activeDays7d",
    "freeGdEarned30d",
  ] as const;
  const fallbackReasons: string[] = [];
  const engagementInput = fields.reduce((acc, field) => {
    const dailyValue = Math.max(0, Math.round(dailyInput[field] || 0));
    const fallbackValue = Math.max(0, Math.round(input.fallbackInput[field] || 0));
    acc[field] = Math.max(dailyValue, fallbackValue);
    if (fallbackValue > dailyValue) {
      fallbackReasons.push(`${field}:metric_snapshot_fallback`);
    }
    return acc;
  }, {} as UserEngagementScoreInput);

  return { engagementInput, fallbackReasons };
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
  const explicitWatchTimeMs = readNumber(input.watchTimeMs);
  const labeledLegacyWatchTimeMs = input.hasLegacyPageDuration === true
    ? readNumber(input.watchSecondsTotal) * 1000
    : 0;
  const watchTimeMs = Math.max(
    0,
    Math.round(explicitWatchTimeMs > 0 ? explicitWatchTimeMs : labeledLegacyWatchTimeMs),
  );
  const authEvents = Math.max(0, Math.round(readNumber(input.authEvents)));
  const purchasesCount = Math.max(0, Math.round(readNumber(input.purchasesCount)));
  const unwraps = Math.max(0, Math.round(readNumber(input.unwraps)));
  const revenueUsd = Math.max(0, readNumber(input.revenueUsd));
  const verifiedEngagementFallbackInput = buildVerifiedEngagementFallbackInput({
    totalActions: input.totalActions,
    views,
    unwraps,
    watchTimeMs,
    purchasesCount,
    authEvents,
    lastSeenAt: input.lastSeenAt,
    rewardGdEarned: input.rewardGdEarned,
  });
  const mergedEngagementInput = mergeEngagementInputWithVerifiedFallback({
    dailyInput: input.engagementInput,
    fallbackInput: verifiedEngagementFallbackInput,
  });
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

  if (mergedEngagementInput.fallbackReasons.length > 0) {
    issues.push({
      code: "source_degraded",
      severity: "info",
      message: "Daily engagement materialization was missing or weaker than verified metric snapshot signals, so engagement scoring used the stronger bounded source per field.",
      evidence: {
        sourceReason: "daily_engagement_input_merged_with_metric_snapshot",
        fallbackReasons: mergedEngagementInput.fallbackReasons,
        dailyInput: input.engagementInput ?? null,
        metricSnapshotFallback: verifiedEngagementFallbackInput,
        mergedInput: mergedEngagementInput.engagementInput,
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
  const rawEngagement = computeUserEngagementScore(mergedEngagementInput.engagementInput);
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
  const engagementScoreDisplay = describePrivacyAwareEngagementScore({
    rawScore: rawEngagement.score,
    dataAvailabilityReason: privacyAvailabilityReason,
    verifiedSignalPresent: hasVerifiedEngagementSignal,
  });
  const engagement = {
    ...rawEngagement,
    score: engagementScoreDisplay.displayedScore,
    rawScore: engagementScoreDisplay.rawScore,
    displayedScore: engagementScoreDisplay.displayedScore,
    appliedPrivacyFloor: engagementScoreDisplay.appliedPrivacyFloor,
    privacyFloor: engagementScoreDisplay.privacyFloor,
    dataAvailabilityReason: engagementScoreDisplay.dataAvailabilityReason,
    verifiedSignalPresent: engagementScoreDisplay.verifiedSignalPresent,
    tier: privacyAvailabilityReason === "full_signal" || hasVerifiedEngagementSignal ? rawEngagement.tier : "light",
    verdict:
      privacyAvailabilityReason === "full_signal" || hasVerifiedEngagementSignal
        ? rawEngagement.verdict
        : "Privacy limited",
  };
  const value = {
    ...rawValue,
    valueScore: applyPrivacyAwareValueFloor(
      rawValue.valueScore,
      privacyAvailabilityReason,
      hasVerifiedValueSignal,
    ),
    valueTier: privacyAvailabilityReason === "full_signal" || hasVerifiedValueSignal ? rawValue.valueTier : "warm",
    verdict:
      privacyAvailabilityReason === "full_signal" || hasVerifiedValueSignal
        ? rawValue.verdict
        : "Privacy limited",
  };
  const predictionOutputs = {
    pPurchase7d: value.repeatPurchaseLikelihood,
    pUnlock24h: clamp01(views === 0 ? 0 : unwraps / Math.max(1, views)),
    pWatchComplete: clamp01(watchTimeMs / (30 * 60_000)),
    pReturn7d: clamp01(mergedEngagementInput.engagementInput.activeDays7d / 7),
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
