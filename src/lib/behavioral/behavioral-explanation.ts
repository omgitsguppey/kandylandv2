import type { AdminTruthState } from "@/lib/admin-truth-state";
import type { BehavioralConfidenceLabel } from "@/lib/behavioral/behavioral-confidence";
import type { UserEngagementScoreResult } from "@/lib/behavioral/user-engagement-score";
import type { UserValueScoreResult } from "@/lib/behavioral/user-value-score";
import type {
  UserBehaviorRollup,
  UserBehaviorRollupIssue,
} from "@/lib/user-behavior-rollup-contract";

export type BehavioralExplanationType =
  | "spend_likely"
  | "return_likely"
  | "watch_likely"
  | "unlock_likely"
  | "privacy_limited"
  | "insufficient_signal"
  | "tracking_issue"
  | "stale_source"
  | "source_disagreement"
  | "fallback_only";

export type BehavioralVerdictExplanation = {
  verdict: string;
  statusLabel: string;
  type: BehavioralExplanationType;
  confidenceLabel: string;
  confidenceScore: number;
  truthState: AdminTruthState;
  summary: string;
  reasons: string[];
  debugFacts: string[];
};

type RecommendationLike = {
  displayMode?: string;
  insufficientSignalReason?: string;
  mode?: string;
  profileConfidence?: number;
  showExplanationCards?: boolean;
  drops?: Array<{
    dropId: string;
    dropTitle?: string;
    dropCategory?: string;
    explanationSummary?: string;
    explanationReasons?: string[];
    fallbackReason?: string;
    factors?: Array<{ label: string; value: number }>;
    rankingMode?: string;
  }>;
};

type BehavioralProfileLike = {
  confidenceScore?: number;
  confidenceLabel?: BehavioralConfidenceLabel | string;
  freshnessLabel?: string;
  recommendationState?: string;
  insufficientSignal?: boolean;
  insufficientSignalReason?: string;
  signalSummary?: {
    watchSessions?: number;
    completedUnwraps?: number;
    repeatedCreators?: number;
    categorySignals?: number;
    themeSignals?: number;
    purchases?: number;
    returnCadence?: number;
    consentAvailability?: number;
  };
};

function toConfidenceLabel(score: number, fallback?: string) {
  if (fallback && fallback.trim().length > 0) {
    return fallback.replaceAll("_", " ");
  }
  if (score >= 90) return "verified";
  if (score >= 75) return "strong";
  if (score >= 50) return "usable";
  if (score >= 30) return "low";
  return "insufficient";
}

function toStatusLabel(type: BehavioralExplanationType) {
  switch (type) {
    case "spend_likely":
      return "Spend likely";
    case "return_likely":
      return "Return likely";
    case "watch_likely":
      return "Watch likely";
    case "unlock_likely":
      return "Unlock likely";
    case "tracking_issue":
      return "Tracking issue";
    case "stale_source":
      return "Stale source";
    case "source_disagreement":
      return "Source disagreement";
    case "fallback_only":
      return "Fallback only";
    default:
      return "Insufficient signal";
  }
}

function findIssue(
  issues: UserBehaviorRollupIssue[] | undefined,
  codes: UserBehaviorRollupIssue["code"][],
) {
  return (issues ?? []).find((issue) => codes.includes(issue.code));
}

function getSharedBehaviorIssue(behaviorRollup?: UserBehaviorRollup) {
  return findIssue(behaviorRollup?.issues, [
    "watch_time_missing_despite_views",
    "missing_watch_time_with_views",
    "missing_behavior_sources",
    "source_degraded",
    "legacy_page_duration_fallback",
  ]);
}

function getCommonExplanationState(input: {
  behaviorRollup?: UserBehaviorRollup;
  truthState: AdminTruthState;
  confidenceScore: number;
  insufficientSummary: string;
}) {
  const sharedIssue = getSharedBehaviorIssue(input.behaviorRollup);
  if (
    input.truthState === "privacy_limited" ||
    sharedIssue?.code === "privacy_limited_identified_analytics_denied" ||
    sharedIssue?.code === "privacy_limited_global_privacy_control"
  ) {
    return {
      type: "privacy_limited" as const,
      verdict: "Privacy limited",
      summary: "Identified analytics are intentionally limited for this user, so missing behavior is not treated as zero activity or a tracking failure.",
    };
  }

  if (sharedIssue && sharedIssue.code !== "source_degraded" && sharedIssue.code !== "legacy_page_duration_fallback") {
    return {
      type: "tracking_issue" as const,
      verdict: "Tracking issue",
      summary: `This profile has a tracking issue because ${sharedIssue.message.charAt(0).toLowerCase()}${sharedIssue.message.slice(1)}`,
    };
  }

  if (input.truthState === "stale" || input.behaviorRollup?.freshnessState === "stale") {
    return {
      type: "stale_source" as const,
      verdict: "Stale source",
      summary: "This verdict is based on stale behavioral data and should be reviewed before acting on it.",
    };
  }

  if (
    input.truthState === "degraded" ||
    input.behaviorRollup?.source === "legacy_fallback" ||
    input.behaviorRollup?.source === "live_fallback" ||
    sharedIssue?.code === "source_degraded" ||
    sharedIssue?.code === "legacy_page_duration_fallback"
  ) {
    return {
      type: "source_disagreement" as const,
      verdict: "Source disagreement",
      summary: "Behavior sources do not fully agree, so the current verdict stays visible but should be treated cautiously.",
    };
  }

  if (input.confidenceScore < 30) {
    return {
      type: "insufficient_signal" as const,
      verdict: "Insufficient signal",
      summary: input.insufficientSummary,
    };
  }

  return null;
}

export function buildEngagementBehavioralExplanation(input: {
  engagement?: UserEngagementScoreResult;
  behaviorRollup?: UserBehaviorRollup;
  truthState: AdminTruthState;
}): BehavioralVerdictExplanation {
  const confidenceScore = input.behaviorRollup?.confidenceScore ?? 0;
  const confidenceLabel = toConfidenceLabel(confidenceScore, input.behaviorRollup?.confidence);
  const commonState = getCommonExplanationState({
    behaviorRollup: input.behaviorRollup,
    truthState: input.truthState,
    confidenceScore,
    insufficientSummary: "This profile has insufficient signal because the verified behavior footprint is still too thin.",
  });

  if (!input.engagement || commonState) {
    const state = commonState ?? {
      type: "insufficient_signal" as const,
      verdict: "Insufficient signal",
      summary: "This profile has insufficient signal because no canonical engagement rollup is available yet.",
    };
    return {
      verdict: state.verdict,
      statusLabel: toStatusLabel(state.type),
      type: state.type,
      confidenceLabel,
      confidenceScore,
      truthState: input.truthState,
      summary: state.summary,
      reasons: [],
      debugFacts: [
        `Confidence ${confidenceScore}% (${confidenceLabel})`,
        `Truth ${input.truthState}`,
        `Source ${input.behaviorRollup?.sourceLabel ?? "unavailable"}`,
      ],
    };
  }

  const topReason = input.engagement.topReasons[0];
  const explanationByCode: Record<string, { type: BehavioralExplanationType; summary: string }> = {
    purchases: {
      type: "spend_likely",
      summary: "This user is likely to stay engaged because recent purchases usually travel with stronger post-purchase behavior.",
    },
    valid_watch_time: {
      type: "watch_likely",
      summary: "This user keeps spending real foreground watch time on content, which is driving the engagement verdict.",
    },
    unwraps: {
      type: "unlock_likely",
      summary: "This user keeps unwrapping content, which is lifting the engagement verdict above passive browsing.",
    },
    repeat_visits: {
      type: "return_likely",
      summary: "This user came back on multiple recent days and kept taking meaningful actions.",
    },
    meaningful_actions: {
      type: "return_likely",
      summary: "This user returned recently and kept taking meaningful tracked actions.",
    },
    free_gd_intent: {
      type: "return_likely",
      summary: "This user is still engaging through free GumDrops behavior, but paid intent remains secondary.",
    },
  };
  const mapped = explanationByCode[topReason?.code ?? ""] ?? explanationByCode.meaningful_actions;

  return {
    verdict: input.engagement.verdict,
    statusLabel: toStatusLabel(mapped.type),
    type: mapped.type,
    confidenceLabel,
    confidenceScore,
    truthState: input.truthState,
    summary: mapped.summary,
    reasons: input.engagement.topReasons.slice(0, 3).map((reason) => reason.summary),
    debugFacts: [
        `Score ${input.engagement.score}/100`,
        `Tier ${input.engagement.tier}`,
        `Math ${input.behaviorRollup?.mathCalibration?.activeMode ?? "deterministic"} / ${input.behaviorRollup?.mathCalibration?.verdict ?? "unvalidated"}`,
        `Truth score ${Math.round((input.behaviorRollup?.truthScore ?? 0) * 100)}%`,
        `Confidence ${confidenceScore}% (${confidenceLabel})`,
        `Source ${input.behaviorRollup?.sourceLabel ?? "unavailable"}`,
    ],
  };
}

export function buildValueBehavioralExplanation(input: {
  value?: UserValueScoreResult;
  behaviorRollup?: UserBehaviorRollup;
  truthState: AdminTruthState;
}): BehavioralVerdictExplanation {
  const confidenceScore = input.behaviorRollup?.confidenceScore ?? 0;
  const confidenceLabel = toConfidenceLabel(confidenceScore, input.behaviorRollup?.confidence);
  const commonState = getCommonExplanationState({
    behaviorRollup: input.behaviorRollup,
    truthState: input.truthState,
    confidenceScore,
    insufficientSummary: "This value profile has insufficient signal because there is not enough verified spend and usage history yet.",
  });

  if (!input.value || commonState) {
    const state = commonState ?? {
      type: "insufficient_signal" as const,
      verdict: "Insufficient signal",
      summary: "This value profile has insufficient signal because no canonical value rollup is available yet.",
    };
    return {
      verdict: state.verdict,
      statusLabel: toStatusLabel(state.type),
      type: state.type,
      confidenceLabel,
      confidenceScore,
      truthState: input.truthState,
      summary: state.summary,
      reasons: [],
      debugFacts: [
        `Confidence ${confidenceScore}% (${confidenceLabel})`,
        `Truth ${input.truthState}`,
        `Source ${input.behaviorRollup?.sourceLabel ?? "unavailable"}`,
      ],
    };
  }

  return {
    verdict: input.value.verdict,
    statusLabel: "Spend likely",
    type: "spend_likely",
    confidenceLabel,
    confidenceScore,
    truthState: input.truthState,
    summary: "This user is likely to spend again because they purchased recently and kept unlocking afterward.",
    reasons: [
      ...input.value.topReasons.slice(0, 3).map((reason) => reason.summary),
      "Bonus GD stays separate from cash revenue. Package bonus raises paid-source delivery, not gross spend.",
    ].slice(0, 3),
    debugFacts: [
      `Score ${input.value.valueScore}/100`,
      `Tier ${input.value.valueTier}`,
      `Repeat purchase likelihood ${Math.round(input.value.repeatPurchaseLikelihood * 100)}%`,
      `Math ${input.behaviorRollup?.mathCalibration?.activeMode ?? "deterministic"} / ${input.behaviorRollup?.mathCalibration?.verdict ?? "unvalidated"}`,
      `Truth score ${Math.round((input.behaviorRollup?.truthScore ?? 0) * 100)}%`,
      `Source ${input.behaviorRollup?.sourceLabel ?? "unavailable"}`,
    ],
  };
}

function getRecommendationType(recommendation: NonNullable<RecommendationLike["drops"]>[number] | undefined) {
  const factors = recommendation?.factors ?? [];
  const numericFactors = {
    paid: factors.find((factor) => factor.label === "Predicted paid conversion")?.value ?? 0,
    unlock: factors.find((factor) => factor.label === "Predicted unlock")?.value ?? 0,
    watch: factors.find((factor) => factor.label === "Predicted watch completion")?.value ?? 0,
  };

  if (numericFactors.paid >= numericFactors.watch && numericFactors.paid >= numericFactors.unlock) {
    return "spend_likely" as const;
  }
  if (numericFactors.watch >= numericFactors.unlock) {
    return "watch_likely" as const;
  }
  return "unlock_likely" as const;
}

export function buildRecommendationBehavioralExplanation(input: {
  behavioralProfile?: BehavioralProfileLike | null;
  recommendationDebug?: RecommendationLike | null;
  truthState: AdminTruthState;
  behaviorRollup?: UserBehaviorRollup;
}): BehavioralVerdictExplanation {
  const confidenceScore = Math.round(((input.behavioralProfile?.confidenceScore ?? input.recommendationDebug?.profileConfidence ?? 0) as number) * 100);
  const confidenceLabel = toConfidenceLabel(confidenceScore, input.behavioralProfile?.confidenceLabel);
  const insufficientSummary = input.recommendationDebug?.insufficientSignalReason
    || input.behavioralProfile?.insufficientSignalReason
    || "This profile has insufficient signal because views exist but watch sessions or affinity evidence are still missing.";

  const commonState = getCommonExplanationState({
    behaviorRollup: input.behaviorRollup,
    truthState: input.truthState,
    confidenceScore,
    insufficientSummary,
  });

  if (commonState) {
    return {
      verdict: commonState.verdict,
      statusLabel: toStatusLabel(commonState.type),
      type: commonState.type,
      confidenceLabel,
      confidenceScore,
      truthState: input.truthState,
      summary: commonState.summary,
      reasons: [],
      debugFacts: [
        `Recommendation state ${input.behavioralProfile?.recommendationState ?? "unknown"}`,
        `Confidence ${confidenceScore}% (${confidenceLabel})`,
        `Freshness ${input.behavioralProfile?.freshnessLabel ?? "unknown"}`,
      ],
    };
  }

  if (!input.recommendationDebug?.showExplanationCards) {
    return {
      verdict: "Fallback only",
      statusLabel: toStatusLabel("fallback_only"),
      type: "fallback_only",
      confidenceLabel,
      confidenceScore,
      truthState: input.truthState,
      summary: "This recommendation is fallback-only because no creator or content affinity has formed yet.",
      reasons: [],
      debugFacts: [
        `Recommendation state ${input.behavioralProfile?.recommendationState ?? "unknown"}`,
        `Mode ${input.recommendationDebug?.mode ?? "fallback"}`,
        `Confidence ${confidenceScore}% (${confidenceLabel})`,
      ],
    };
  }

  const topRecommendation = input.recommendationDebug?.drops?.[0];
  const recommendationType = getRecommendationType(topRecommendation);
  const fallbackSummary = topRecommendation?.explanationSummary
    || topRecommendation?.fallbackReason
    || "This recommendation is being shown because the current profile supports a bounded deterministic match.";

  return {
    verdict:
      recommendationType === "spend_likely"
        ? "Spend likely"
        : recommendationType === "watch_likely"
          ? "Watch likely"
          : "Unlock likely",
    statusLabel: toStatusLabel(recommendationType),
    type: recommendationType,
    confidenceLabel,
    confidenceScore,
    truthState: input.truthState,
    summary: fallbackSummary,
    reasons: (topRecommendation?.explanationReasons ?? []).slice(0, 3),
    debugFacts: [
      `Recommendation state ${input.behavioralProfile?.recommendationState ?? "unknown"}`,
      `Mode ${input.recommendationDebug?.mode ?? "unknown"}`,
      `Confidence ${confidenceScore}% (${confidenceLabel})`,
      `Freshness ${input.behavioralProfile?.freshnessLabel ?? "unknown"}`,
      `Ranking ${topRecommendation?.rankingMode ?? "deterministic"}`,
    ],
  };
}
