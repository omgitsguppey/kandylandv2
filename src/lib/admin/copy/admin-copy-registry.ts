import type { AdminSurfaceState } from "@/lib/admin-parity";

export const ADMIN_OPERATOR_BADGE_LABELS = [
  "LIVE",
  "UPDATED",
  "REFRESHING",
  "DELAYED",
  "EST",
  "PARTIAL",
  "WAIT",
  "REVIEW",
  "ERROR",
  "SNAP",
] as const;

export type AdminOperatorBadgeLabel = (typeof ADMIN_OPERATOR_BADGE_LABELS)[number];

export const ADMIN_OPERATOR_STATE_LABELS = [
  "usable",
  "usable_with_note",
  "refreshing",
  "estimated",
  "partial",
  "needs_review",
  "unavailable",
  "waiting_first_snapshot",
] as const;

export type AdminOperatorState = (typeof ADMIN_OPERATOR_STATE_LABELS)[number];

export type AdminStatusSeverity = "success" | "info" | "notice" | "warning" | "critical";

export type AdminCopyPatternKey =
  | "analytics_delayed"
  | "refresh_running"
  | "no_verified_snapshot"
  | "guest_estimated"
  | "source_mismatch"
  | "parity_mismatch"
  | "purchase_tracking_mismatch"
  | "unlock_tracking_mismatch"
  | "task_lifecycle_mismatch"
  | "notification_duplicate_prevented"
  | "notification_missing"
  | "onboarding_discrepancy"
  | "auth_timing_unavailable"
  | "event_context_unavailable"
  | "data_validation_moved_to_debug"
  | "admin_excluded_from_user_metrics"
  | "cache_stale_or_snapshot"
  | "fake_zero_prevented"
  | "technical_debug_only";

export type AdminCopyPattern = {
  key: AdminCopyPatternKey;
  operatorState: AdminOperatorState;
  severity: AdminStatusSeverity;
  headline: string;
  shortBody: string;
  badgeLabel: AdminOperatorBadgeLabel;
  actionLabel: string;
  operatorImpact: string;
  recommendedAction: string;
  technicalState: string;
  debugPath: string;
  canUserFix: boolean;
  canSystemRetry: boolean;
  showInMainUi: boolean;
};

export const ADMIN_COPY_REGISTRY: Record<AdminCopyPatternKey, AdminCopyPattern> = {
  analytics_delayed: {
    key: "analytics_delayed",
    operatorState: "usable_with_note",
    severity: "warning",
    headline: "Last verified data.",
    shortBody: "Refresh again if you need the newest value.",
    badgeLabel: "SNAP",
    actionLabel: "Open in Debug",
    operatorImpact: "Current values remain usable, but live movement may arrive late.",
    recommendedAction: "Open Debug if the delay persists after the next refresh.",
    technicalState: "realtime_listener_failed",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  refresh_running: {
    key: "refresh_running",
    operatorState: "refreshing",
    severity: "info",
    headline: "Refreshing.",
    shortBody: "Last verified data.",
    badgeLabel: "REFRESHING",
    actionLabel: "No action needed",
    operatorImpact: "The panel stays usable while the replacement snapshot is checked.",
    recommendedAction: "Wait for refresh to finish; do not clear the current snapshot.",
    technicalState: "refreshing_existing_snapshot",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  no_verified_snapshot: {
    key: "no_verified_snapshot",
    operatorState: "waiting_first_snapshot",
    severity: "notice",
    headline: "No verified data yet.",
    shortBody: "Refresh to check again.",
    badgeLabel: "WAIT",
    actionLabel: "Refresh",
    operatorImpact: "This module cannot show a value until one source is verified.",
    recommendedAction: "Refresh once; open Debug if the first snapshot still does not arrive.",
    technicalState: "missing_verified_snapshot",
    debugPath: "/admin/debug",
    canUserFix: true,
    canSystemRetry: true,
    showInMainUi: true,
  },
  guest_estimated: {
    key: "guest_estimated",
    operatorState: "estimated",
    severity: "notice",
    headline: "Guest traffic is estimated.",
    shortBody: "Anonymous guest batches have not landed for this range.",
    badgeLabel: "EST",
    actionLabel: "Open in Debug",
    operatorImpact: "Audience totals are directional until guest batches arrive.",
    recommendedAction: "Use the estimate for trend reading, not final guest quality.",
    technicalState: "estimated_guest_traffic",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  source_mismatch: {
    key: "source_mismatch",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Source mismatch needs review.",
    shortBody: "Two verified sources disagree for this range.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "The visible value may be right, but the source trail needs checking.",
    recommendedAction: "Compare the source counts in Debug before making decisions from this metric.",
    technicalState: "source_mismatch",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  parity_mismatch: {
    key: "parity_mismatch",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Tracking needs review.",
    shortBody: "Recorded totals do not match the event trail.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "Totals may be usable, but the funnel can undercount or overcount.",
    recommendedAction: "Check the parity evidence in Debug and verify the emitter for this module.",
    technicalState: "parity_mismatch",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  purchase_tracking_mismatch: {
    key: "purchase_tracking_mismatch",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Purchase tracking needs review.",
    shortBody: "Completed purchases and purchase events do not match.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "Revenue may be correct, but purchase funnel analytics may undercount.",
    recommendedAction: "Check purchase event emission after PayPal confirmation.",
    technicalState: "purchase_parity_mismatch",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  unlock_tracking_mismatch: {
    key: "unlock_tracking_mismatch",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Unlock tracking needs review.",
    shortBody: "Unlock records and unlock events do not match.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "Unlock totals may be correct while the event funnel is incomplete.",
    recommendedAction: "Check unlock event emission after content access is granted.",
    technicalState: "unlock_parity_mismatch",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  task_lifecycle_mismatch: {
    key: "task_lifecycle_mismatch",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Task tracking needs review.",
    shortBody: "Task progress and task events do not match.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "Rewards may be correct while task analytics are incomplete.",
    recommendedAction: "Check task completion and reward event evidence in Debug.",
    technicalState: "task_lifecycle_mismatch",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  notification_duplicate_prevented: {
    key: "notification_duplicate_prevented",
    operatorState: "usable_with_note",
    severity: "info",
    headline: "Duplicate notification was prevented.",
    shortBody: "The user should not receive the same alert twice.",
    badgeLabel: "UPDATED",
    actionLabel: "No action needed",
    operatorImpact: "Notification delivery stayed safe.",
    recommendedAction: "No action needed unless duplicate prevention spikes.",
    technicalState: "notification_duplicate_prevented",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  notification_missing: {
    key: "notification_missing",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Notification outcome needs review.",
    shortBody: "A queue action has no matching delivery result yet.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "A user may not have received an expected notification.",
    recommendedAction: "Check notification dispatch evidence for the affected drop or queue item.",
    technicalState: "missing_notification_outcome",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  onboarding_discrepancy: {
    key: "onboarding_discrepancy",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Creator intake needs review.",
    shortBody: "A review record and creator status do not match.",
    badgeLabel: "REVIEW",
    actionLabel: "Open creator record",
    operatorImpact: "A creator may be blocked or shown the wrong next step.",
    recommendedAction: "Open the creator record and compare queue, approval, and role state.",
    technicalState: "onboarding_state_discrepancy",
    debugPath: "/admin/debug",
    canUserFix: true,
    canSystemRetry: false,
    showInMainUi: true,
  },
  auth_timing_unavailable: {
    key: "auth_timing_unavailable",
    operatorState: "unavailable",
    severity: "notice",
    headline: "Timing is unavailable for this range.",
    shortBody: "Start or finish timestamps are missing.",
    badgeLabel: "WAIT",
    actionLabel: "Open in Debug",
    operatorImpact: "Counts may be usable, but duration metrics are not.",
    recommendedAction: "Check whether auth attempts include both start and finish timestamps.",
    technicalState: "auth_timing_missing",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  event_context_unavailable: {
    key: "event_context_unavailable",
    operatorState: "partial",
    severity: "notice",
    headline: "Surface context is unavailable.",
    shortBody: "Showing event activity without page context.",
    badgeLabel: "PARTIAL",
    actionLabel: "Open in Debug",
    operatorImpact: "Event counts are usable, but surface attribution is incomplete.",
    recommendedAction: "Check event-to-surface mapping in Debug.",
    technicalState: "event_context_missing",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  data_validation_moved_to_debug: {
    key: "data_validation_moved_to_debug",
    operatorState: "usable_with_note",
    severity: "info",
    headline: "Detailed validation is in Debug.",
    shortBody: "Analytics shows the operator summary only.",
    badgeLabel: "UPDATED",
    actionLabel: "Open in Debug",
    operatorImpact: "Main analytics stays readable while exact evidence remains available.",
    recommendedAction: "Open Debug for formulas, routes, and source details.",
    technicalState: "debug_detail_only",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  admin_excluded_from_user_metrics: {
    key: "admin_excluded_from_user_metrics",
    operatorState: "usable",
    severity: "info",
    headline: "Admin traffic is excluded.",
    shortBody: "User metrics stay focused on fans and creators.",
    badgeLabel: "UPDATED",
    actionLabel: "No action needed",
    operatorImpact: "Admin testing should not inflate audience metrics.",
    recommendedAction: "No action needed.",
    technicalState: "admin_lane_excluded",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: true,
  },
  cache_stale_or_snapshot: {
    key: "cache_stale_or_snapshot",
    operatorState: "usable_with_note",
    severity: "notice",
    headline: "Last verified data.",
    shortBody: "The next refresh will replace it after verification.",
    badgeLabel: "SNAP",
    actionLabel: "Refresh",
    operatorImpact: "The metric is usable, but not live.",
    recommendedAction: "Refresh if you need the newest value.",
    technicalState: "fallback_snapshot_or_stale_cache",
    debugPath: "/admin/debug",
    canUserFix: true,
    canSystemRetry: true,
    showInMainUi: true,
  },
  fake_zero_prevented: {
    key: "fake_zero_prevented",
    operatorState: "waiting_first_snapshot",
    severity: "notice",
    headline: "No verified value yet.",
    shortBody: "The dashboard is not showing a fake zero.",
    badgeLabel: "WAIT",
    actionLabel: "Open in Debug",
    operatorImpact: "This prevents a missing source from looking like true zero activity.",
    recommendedAction: "Open Debug to see which source is missing.",
    technicalState: "fake_zero_prevented",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: true,
    showInMainUi: true,
  },
  technical_debug_only: {
    key: "technical_debug_only",
    operatorState: "needs_review",
    severity: "warning",
    headline: "Technical detail needs review.",
    shortBody: "Open Debug for exact source evidence.",
    badgeLabel: "REVIEW",
    actionLabel: "Open in Debug",
    operatorImpact: "A developer should inspect this source before changing user-facing behavior.",
    recommendedAction: "Read the technical evidence and source details in Debug.",
    technicalState: "debug_only",
    debugPath: "/admin/debug",
    canUserFix: false,
    canSystemRetry: false,
    showInMainUi: false,
  },
};

export const ADMIN_SURFACE_STATE_BADGE_LABELS: Record<AdminSurfaceState, AdminOperatorBadgeLabel> = {
  loading: "WAIT",
  live: "LIVE",
  cached: "SNAP",
  degraded: "REVIEW",
  fallback: "SNAP",
  stale: "SNAP",
  unavailable: "WAIT",
  failed: "REVIEW",
};

export const ADMIN_SURFACE_STATE_OPERATOR_COPY: Record<AdminSurfaceState, Pick<AdminCopyPattern, "headline" | "shortBody" | "operatorImpact" | "recommendedAction">> = {
  loading: {
    headline: "Waiting for first snapshot.",
    shortBody: "Data is still loading.",
    operatorImpact: "The panel has not verified a source yet.",
    recommendedAction: "Wait briefly or refresh if this does not change.",
  },
  live: {
    headline: "Live.",
    shortBody: "Current verified data is showing.",
    operatorImpact: "The panel can be used normally.",
    recommendedAction: "No action needed.",
  },
  cached: {
    headline: "Last verified data.",
    shortBody: "This snapshot has already been checked.",
    operatorImpact: "The panel can be used normally unless you need the newest refresh.",
    recommendedAction: "Refresh if you need the newest value.",
  },
  degraded: {
    headline: "Needs review.",
    shortBody: "Some source detail is incomplete.",
    operatorImpact: "The panel remains useful, but exact evidence should be checked.",
    recommendedAction: "Open Debug for exact source detail.",
  },
  fallback: {
    headline: "Last verified data.",
    shortBody: "The live source is not the current display source.",
    operatorImpact: "The panel remains usable, but it is not live.",
    recommendedAction: "Open Debug if the live source does not recover.",
  },
  stale: {
    headline: "Last verified data.",
    shortBody: "The snapshot is older than ideal.",
    operatorImpact: "The value is usable but may lag recent activity.",
    recommendedAction: "Refresh or open Debug if the value stays delayed.",
  },
  unavailable: {
    headline: "Unavailable.",
    shortBody: "No verified source is ready yet.",
    operatorImpact: "The panel cannot show a trustworthy value yet.",
    recommendedAction: "Refresh or open Debug to see which source is missing.",
  },
  failed: {
    headline: "Needs review.",
    shortBody: "The source could not be loaded.",
    operatorImpact: "The panel should not be used until the source recovers.",
    recommendedAction: "Open Debug for the exact failure.",
  },
};
