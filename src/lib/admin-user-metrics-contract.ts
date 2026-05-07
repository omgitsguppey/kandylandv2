import type {
  BehavioralConfidenceLabel,
} from "@/lib/behavioral/behavioral-confidence";
import type {
  BehavioralFreshnessState,
  BehavioralTruthSource,
} from "@/lib/behavioral/behavioral-truth-source";
import type {
  WatchTimeRollupIssue,
  WatchTimeRollupSource,
} from "@/lib/watch-time-rollup-contract";
import type { WatchTimeDiagnosticEstimate } from "@/lib/behavioral/watch-time-estimation";

export type AdminUserMetricsSnapshotSource = "hot_cache" | "materialized" | "live_fallback";

export type AdminUserMetricsFreshnessState =
  | "live"
  | "stale"
  | "degraded"
  | "unavailable";

export type AdminUserMetricsSnapshot = {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  sevenDayReturners: number;
  pushEnabledUsers: number;
  trackedUnwraps: number;
  trackedPurchases: number;
  watchTimeMs: number;
  watchTimeSource: WatchTimeRollupSource;
  watchTimeIssues: WatchTimeRollupIssue[];
  watchTimeDiagnosticEstimate: WatchTimeDiagnosticEstimate | null;
  onboardedUsers: number;
  totalRevenueUsd: number;
  payingUsers: number;
  generatedAt: number;
  source: AdminUserMetricsSnapshotSource;
  freshnessState: AdminUserMetricsFreshnessState;
  truthSource: BehavioralTruthSource;
  confidenceScore: number;
  confidenceLabel: BehavioralConfidenceLabel;
  issues: string[];
};

export type AdminUserMetricsSnapshotMetadata = {
  snapshot: AdminUserMetricsSnapshot;
  sourceLabel: string;
  staleReason: string | null;
  confidenceScore: number;
  confidenceLabel: BehavioralConfidenceLabel;
  issues: string[];
};
