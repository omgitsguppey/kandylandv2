import type {
  BehavioralConfidenceLabel,
} from "@/lib/behavioral/behavioral-confidence";
import type {
  BehavioralFreshnessState,
  BehavioralTruthSource,
} from "@/lib/behavioral/behavioral-truth-source";

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
    | "source_degraded";
  severity: "info" | "warn" | "fail";
  message: string;
  evidence: Record<string, unknown>;
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
  source: UserBehaviorRollupSource;
  sourceLabel: string;
  freshnessState: BehavioralFreshnessState;
  issues: UserBehaviorRollupIssue[];
};
