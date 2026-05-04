export type UserBehaviorRollupConfidence = "high" | "medium" | "low" | "unknown";

export type UserBehaviorRollupSource =
  | "analytics_users_rollup"
  | "analytics_user_daily"
  | "analytics_event_facts"
  | "analytics_viewer_session_facts"
  | "transactions"
  | "mixed"
  | "unavailable";

export type UserBehaviorRollupIssue = {
  code:
    | "missing_watch_time_with_views"
    | "missing_auth_stats_for_onboarded_user"
    | "missing_behavior_sources"
    | "commerce_source_missing"
    | "last_seen_missing"
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
  source: UserBehaviorRollupSource;
  issues: UserBehaviorRollupIssue[];
};
