import type { DebugBacklogSource, DebugFixClass } from "@/lib/debug/debug-backlog-contract";

export const LEGACY_NORMALIZATION_DOMAINS = [
  "guest_sessions",
  "user_sessions",
  "identity_links",
  "behavior_events",
  "watch_sessions",
  "drops",
  "creator_profile_views",
  "fan_pass_subscriptions",
  "creator_broadcasts",
  "purchases_gumdrop_ledger_references",
  "admin_truth_samples",
] as const;

export type LegacyNormalizationDomain = (typeof LEGACY_NORMALIZATION_DOMAINS)[number];

export type LegacyNormalizationConfidence = "exact" | "probable" | "weak" | "unknown";
export type LegacyNormalizationDuplicateRisk = "low" | "medium" | "high";
export type LegacyNormalizationAction =
  | "normalize_candidate"
  | "link_candidate"
  | "archive_only"
  | "ignore"
  | "needs_manual_review";

export const PRIVACY_BEHAVIOR_LEGACY_CLASSES = [
  "legacy_consent_unknown",
  "legacy_guest_behavior_unknown",
  "legacy_user_behavior_probable",
  "orphaned_guest_session",
  "orphaned_user_event",
  "orphaned_materialized_metric",
  "orphaned_profile_drop_interaction",
  "legacy_cookie_banner_state",
] as const;

export type PrivacyBehaviorLegacyClass = (typeof PRIVACY_BEHAVIOR_LEGACY_CLASSES)[number];

export type LegacyNormalizedCategory =
  | "guest_session"
  | "user_session"
  | "identity_link"
  | "behavior_event"
  | "watch_session"
  | "drop"
  | "creator_profile_view"
  | "fan_pass_subscription"
  | "creator_broadcast"
  | "purchase_ledger_reference"
  | "admin_truth_sample"
  | "unknown";

export type LegacyNormalizationInputRecord = {
  legacyId: string;
  legacyDomain: LegacyNormalizationDomain;
  legacySource: string;
  timestampMs: number;
  fields: Record<string, unknown>;
};

export type LegacyNormalizationRecord = LegacyNormalizationInputRecord & {
  currentCategory: LegacyNormalizedCategory;
  mappedFields: Record<string, string | number | boolean>;
  confidence: LegacyNormalizationConfidence;
  duplicateRisk: LegacyNormalizationDuplicateRisk;
  action: LegacyNormalizationAction;
  currentTruthEligible: false;
  readOnly: boolean;
  mutationBlockedReason: "dry_run_only" | "unknown_legacy_not_current_truth" | "purchase_gumdrop_ledger_read_only";
  evidenceReason: string;
};

export type LegacyNormalizationBacklogIssue = {
  id: string;
  source: DebugBacklogSource;
  fixClass: DebugFixClass;
  sourceRoute: "legacy://march-first-normalization";
  owner: "analytics";
  severity: "p1" | "p2" | "p3";
  exactNextAction: string;
};

export type LegacyNormalizationPlan = {
  mode: "dry_run_only";
  recoveryStartDate: "2026-03-01";
  readsProduction: false;
  liveBackfill: false;
  mutationsAllowed: false;
  records: LegacyNormalizationRecord[];
  debugBacklogIssues: LegacyNormalizationBacklogIssue[];
  summary: {
    inputRecords: number;
    inWindowRecords: number;
    exactCount: number;
    probableCount: number;
    weakCount: number;
    unknownCount: number;
    highDuplicateRiskCount: number;
    currentTruthEligibleCount: 0;
    readOnlyLedgerReferenceCount: number;
  };
};
