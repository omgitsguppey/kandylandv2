import type {
  BehavioralConfidenceLabel,
} from "@/lib/behavioral/behavioral-confidence";
import type {
  BehavioralDataAvailabilityReason,
  BehavioralFreshnessState,
  BehavioralTruthSource,
} from "@/lib/behavioral/behavioral-truth-source";
import type {
  UserEngagementScoreResult,
} from "@/lib/behavioral/user-engagement-score";
import type {
  UserValueScoreResult,
} from "@/lib/behavioral/user-value-score";
import type {
  BehavioralModelActivationResult,
  BehavioralPredictionOutputs,
} from "@/lib/behavioral/behavioral-math-calibration";

export type UserBehaviorRollupConfidence = BehavioralConfidenceLabel | "unknown";

export type UserBehaviorRollupSource = BehavioralTruthSource;

export type UserBehaviorRollupIssue = {
  code:
    | "missing_watch_time_with_views"
    | "missing_auth_stats_for_onboarded_user"
    | "missing_behavior_sources"
    | "watch_time_missing_despite_views"
    | "commerce_source_missing"
    | "last_seen_missing"
    | "legacy_page_duration_fallback"
    | "privacy_limited_identified_analytics_denied"
    | "privacy_limited_global_privacy_control"
    | "source_degraded";
  severity: "info" | "warn" | "fail";
  message: string;
  evidence: Record<string, unknown>;
};

export type UserBehaviorEngagementScore = UserEngagementScoreResult & {
  rawScore: number;
  displayedScore: number;
  appliedPrivacyFloor: boolean;
  privacyFloor: number | null;
  dataAvailabilityReason: BehavioralDataAvailabilityReason;
  verifiedSignalPresent: boolean;
};

export type UserBehaviorRollup = {
  userId: string;
  totalActions: number;
  views: number;
  unwraps: number;
  watchTimeMs: number;
  purchasesCount: number;
  revenueUsd: number;
  paidGdPurchased: number;
  rewardGdEarned: number;
  onboardingCompleted: boolean;
  authEvents: number;
  pushEnabled: boolean;
  lastSeenAt: number;
  confidence: UserBehaviorRollupConfidence;
  confidenceScore: number;
  truthScore: number;
  sourceReliability: number;
  predictionOutputs: BehavioralPredictionOutputs;
  mathCalibration: BehavioralModelActivationResult & {
    surfaceObjective: "admin_users";
    validationSource: "behavioral-math-calibration";
  };
  source: UserBehaviorRollupSource;
  sourceLabel: string;
  freshnessState: BehavioralFreshnessState;
  dataAvailabilityReason: BehavioralDataAvailabilityReason;
  issues: UserBehaviorRollupIssue[];
  engagement: UserBehaviorEngagementScore;
  value: UserValueScoreResult;
};
