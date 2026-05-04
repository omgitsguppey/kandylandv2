import type { AdminTruthState } from "@/lib/admin-truth-state";
import type { UserBehaviorRollup } from "@/lib/user-behavior-rollup-contract";

export const ADMIN_REVIEW_SEVERITIES = [
  "info",
  "wait",
  "review",
  "error",
  "critical",
] as const;

export type AdminReviewSeverity = (typeof ADMIN_REVIEW_SEVERITIES)[number];

export type AdminReviewReasonCode =
  | "missing_required_data"
  | "score_below_threshold"
  | "source_disagreement"
  | "critical_source_stale"
  | "user_facing_bug"
  | "watch_time_missing_despite_views"
  | "onboarded_missing_auth_stats"
  | "revenue_missing_purchase_count"
  | "unlocks_missing_entitlements"
  | "personalized_output_low_confidence"
  | "source_refreshing"
  | "expected_settlement_delay";

export type AdminReviewBadgeDecision = {
  severity: AdminReviewSeverity;
  reasonCode: AdminReviewReasonCode;
  label: string;
  summary: string;
};

const SEVERITY_WEIGHT: Record<AdminReviewSeverity, number> = {
  info: 1,
  wait: 2,
  review: 3,
  error: 4,
  critical: 5,
};

function highestSeverity(decisions: AdminReviewBadgeDecision[]) {
  return [...decisions].sort(
    (left, right) => SEVERITY_WEIGHT[right.severity] - SEVERITY_WEIGHT[left.severity],
  )[0] ?? null;
}

export function getAdminReviewBadgeClasses(severity: AdminReviewSeverity) {
  if (severity === "critical") return "border-red-500/30 bg-red-500/15 text-red-200";
  if (severity === "error") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (severity === "review") return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";
  if (severity === "wait") return "border-brand-purple/30 bg-brand-purple/10 text-[#e4d4ff]";
  return "border-gray-500/30 bg-gray-500/10 text-gray-200";
}

export function getAdminReviewLabel(severity: AdminReviewSeverity) {
  if (severity === "critical") return "CRITICAL";
  if (severity === "error") return "ERROR";
  if (severity === "review") return "REVIEW";
  if (severity === "wait") return "WAIT";
  return "INFO";
}

export function buildAdminReviewBadge(input: {
  truthState?: AdminTruthState | null;
  missingRequiredData?: boolean;
  score?: number | null;
  scoreThreshold?: number;
  sourceDisagreement?: boolean;
  staleCriticalSource?: boolean;
  userFacingBug?: boolean;
  viewsExistButWatchMissing?: boolean;
  onboardedMissingAuthStats?: boolean;
  revenueExistsButPurchaseCountMissing?: boolean;
  unlocksExistButEntitlementMissing?: boolean;
  personalizedOutputShown?: boolean;
  behavioralConfidence?: number | null;
  delayedExpected?: boolean;
  reviewSummary?: string;
}): AdminReviewBadgeDecision | null {
  const decisions: AdminReviewBadgeDecision[] = [];

  if (input.truthState === "refreshing") {
    decisions.push({
      severity: "wait",
      reasonCode: "source_refreshing",
      label: "Source refreshing",
      summary: input.reviewSummary || "A usable value exists, but the source refresh is still in flight.",
    });
  }

  if (input.delayedExpected || input.truthState === "delayed") {
    decisions.push({
      severity: "info",
      reasonCode: "expected_settlement_delay",
      label: "Expected settlement delay",
      summary: input.reviewSummary || "This surface is waiting on expected settlement or materialization timing.",
    });
  }

  if (input.missingRequiredData) {
    decisions.push({
      severity: input.truthState === "failed" ? "error" : "review",
      reasonCode: "missing_required_data",
      label: "Missing required data",
      summary: input.reviewSummary || "A visible metric is missing required source data.",
    });
  }

  if (typeof input.score === "number" && typeof input.scoreThreshold === "number" && input.score < input.scoreThreshold) {
    decisions.push({
      severity: "review",
      reasonCode: "score_below_threshold",
      label: "Score below threshold",
      summary: input.reviewSummary || `The visible score fell below the configured threshold of ${input.scoreThreshold}.`,
    });
  }

  if (input.sourceDisagreement) {
    decisions.push({
      severity: "review",
      reasonCode: "source_disagreement",
      label: "Source disagreement",
      summary: input.reviewSummary || "Multiple sources disagree beyond the allowed tolerance.",
    });
  }

  if (input.staleCriticalSource || input.truthState === "stale") {
    decisions.push({
      severity: "review",
      reasonCode: "critical_source_stale",
      label: "Critical source stale",
      summary: input.reviewSummary || "A critical source is stale or missing.",
    });
  }

  if (input.userFacingBug) {
    decisions.push({
      severity: "critical",
      reasonCode: "user_facing_bug",
      label: "User-facing bug",
      summary: input.reviewSummary || "A user-facing tracking or product bug is affecting this admin surface.",
    });
  }

  if (input.viewsExistButWatchMissing) {
    decisions.push({
      severity: "review",
      reasonCode: "watch_time_missing_despite_views",
      label: "Views but no watch time",
      summary: input.reviewSummary || "Views exist, but valid watch sessions are missing.",
    });
  }

  if (input.onboardedMissingAuthStats) {
    decisions.push({
      severity: "review",
      reasonCode: "onboarded_missing_auth_stats",
      label: "Onboarded missing auth stats",
      summary: input.reviewSummary || "The user completed onboarding, but auth stats are missing.",
    });
  }

  if (input.revenueExistsButPurchaseCountMissing) {
    decisions.push({
      severity: "critical",
      reasonCode: "revenue_missing_purchase_count",
      label: "Revenue without purchases",
      summary: input.reviewSummary || "Revenue exists, but purchase count is missing.",
    });
  }

  if (input.unlocksExistButEntitlementMissing) {
    decisions.push({
      severity: "critical",
      reasonCode: "unlocks_missing_entitlements",
      label: "Unlocks missing entitlements",
      summary: input.reviewSummary || "Unlock activity exists, but entitlement records are missing.",
    });
  }

  if (input.personalizedOutputShown && typeof input.behavioralConfidence === "number" && input.behavioralConfidence < 30) {
    decisions.push({
      severity: "critical",
      reasonCode: "personalized_output_low_confidence",
      label: "Low-confidence personalization",
      summary: input.reviewSummary || "Personalized output is visible even though behavioral confidence is below 30%.",
    });
  }

  if (input.truthState === "failed" && decisions.length === 0) {
    decisions.push({
      severity: "error",
      reasonCode: "missing_required_data",
      label: "Missing required data",
      summary: input.reviewSummary || "The source failed and no valid fallback exists.",
    });
  }

  return highestSeverity(decisions);
}

export function buildBehaviorRollupReviewBadge(input: {
  behaviorRollup?: UserBehaviorRollup;
  truthState: AdminTruthState;
  personalizedOutputShown?: boolean;
}): AdminReviewBadgeDecision | null {
  const rollup = input.behaviorRollup;
  const issueCodes = new Set((rollup?.issues ?? []).map((issue) => issue.code));

  return buildAdminReviewBadge({
    truthState: input.truthState,
    missingRequiredData: !rollup,
    sourceDisagreement: issueCodes.has("source_degraded"),
    staleCriticalSource: rollup?.freshnessState === "stale",
    viewsExistButWatchMissing: issueCodes.has("watch_time_missing_despite_views") || issueCodes.has("missing_watch_time_with_views"),
    onboardedMissingAuthStats: issueCodes.has("missing_auth_stats_for_onboarded_user"),
    personalizedOutputShown: input.personalizedOutputShown,
    behavioralConfidence: rollup?.confidenceScore ?? null,
    reviewSummary: rollup?.issues[0]?.message,
  });
}
