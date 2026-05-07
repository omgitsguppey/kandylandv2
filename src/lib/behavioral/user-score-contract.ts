import type { BehavioralDataAvailabilityReason } from "@/lib/behavioral/behavioral-truth-source";

export const ADMIN_RECOMMENDATION_CONFIDENCE_THRESHOLD = 0.55;

export type UserBehaviorTruthIssue = {
  code: string;
  severity: "info" | "warn" | "fail";
  message: string;
};

export type UserBehaviorTruthRollup = {
  userId: string;
  engagementScore: number;
  valueScore: number;
  returnScore: number;
  watchScore: number;
  sourceTruthScore: number;
  lastSeenAt: number;
  lastMeaningfulActionAt: number;
  purchaseCount: number;
  totalSpendUsd: number;
  unlockCount: number;
  validWatchTimeMs: number;
  actionCount: number;
  recommendationConfidence: number;
  dataAvailabilityReason: BehavioralDataAvailabilityReason;
  issues: UserBehaviorTruthIssue[];
  sourceTruth: "canonical" | "materialized" | "server" | "legacy_fallback" | "blocked";
  sourceFreshness: "live" | "stale" | "degraded" | "unavailable" | "legacy_fallback" | "review" | "privacy_limited";
  shouldHideRecommendations: boolean;
};
