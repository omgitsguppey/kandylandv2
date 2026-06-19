import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";

export type AdminAnalyticsPanelGroup =
  | "traffic"
  | "users"
  | "creators"
  | "drops"
  | "unlocks"
  | "watch"
  | "wallet"
  | "payments"
  | "gumdrops"
  | "tasks"
  | "chat"
  | "notifications"
  | "auth"
  | "media"
  | "search"
  | "support"
  | "errors"
  | "cost"
  | "journeys"
  | "realtime";

export type AdminAnalyticsPanelSourceType =
  | "event_fact"
  | "person_metric"
  | "global_metric"
  | "journey_summary"
  | "admin_summary"
  | "route_runtime_sample"
  | "debug_runtime_evidence"
  | "ledger_summary"
  | "cost_summary"
  | "external_required";

export type AdminAnalyticsPanelHydrationStatus =
  | "hydrated"
  | "stale"
  | "collecting"
  | "source_ready_waiting_for_activity"
  | "not_observed_but_expected"
  | "runtime_evidence_required"
  | "admin_truth_source_required"
  | "provider_gated"
  | "protected_payment_required"
  | "source_missing"
  | "materializer_missing"
  | "producer_missing"
  | "bridge_missing"
  | "permission_blocked"
  | "not_configured"
  | "external_required"
  | "hidden_by_role"
  | "broken";

export type AdminAnalyticsPanelConfidence = "exact" | "linked" | "inferred" | "weak" | "unknown";
export type AdminAnalyticsPanelFreshness = "fresh" | "stale" | "unknown";
export type AdminAnalyticsPanelDisplayState =
  | "show_value"
  | "show_collecting"
  | "show_no_recent_activity"
  | "show_stale"
  | "show_not_connected"
  | "show_external_required"
  | "show_permission_blocked"
  | "show_broken"
  | "show_hidden";

export type AdminAnalyticsPanelRuntimeSignal = {
  panelId: string;
  hasData?: boolean;
  provenZero?: boolean;
  lastSeenAt?: string | null;
  sourceLoaded?: boolean;
  permissionBlocked?: boolean;
  error?: string | null;
};

export type AdminAnalyticsPanelRegistryEntry = {
  panelId: string;
  panelLabel: string;
  panelGroup: AdminAnalyticsPanelGroup;
  sourceType: AdminAnalyticsPanelSourceType;
  expectedSource: string;
  expectedEvents: string[];
  personMetricIds: string[];
  expectedRecentWindow: "1h" | "24h" | "7d" | "none";
  sourcePath: string;
  materializerPath: string | null;
  debugLane: string;
  scoreImpact: Partial<Record<PublicBetaHealthDimension, number>>;
  costClass: "summary_first" | "bounded_admin_read" | "route_sample" | "external_review" | "debug_only";
  fallbackDisplayState: AdminAnalyticsPanelDisplayState;
  privacyRedactionRule: string;
  provenZeroRequiredForZero: true;
  expectedDaily: boolean;
};

export type AdminAnalyticsPanelHydrationRecord = AdminAnalyticsPanelRegistryEntry & {
  hydrationStatus: AdminAnalyticsPanelHydrationStatus;
  confidence: AdminAnalyticsPanelConfidence;
  freshness: AdminAnalyticsPanelFreshness;
  lastSeenAt: string | null;
  nextExactAction: string;
  userSafeDisplayState: AdminAnalyticsPanelDisplayState;
  reason: string;
  canDisplayZero: boolean;
  liveEvidenceContribution: "clears_live_evidence" | "source_exists_collecting" | "stale_not_live" | "actionable_gap" | "formal_evidence_required";
};

export type AnalyticsPanelHydrationDebugLane = {
  label: "Analytics panel hydration";
  totalPanels: number;
  hydrated: number;
  stale: number;
  collecting: number;
  sourceReadyWaitingForActivity: number;
  notObservedButExpected: number;
  sourceMissing: number;
  materializerMissing: number;
  bridgeMissing: number;
  runtimeEvidenceRequired: number;
  adminTruthSourceRequired: number;
  providerGated: number;
  externalRequired: number;
  hiddenByRole: number;
  broken: number;
  topNextActions: string[];
};

export type AnalyticsPanelHydrationReport = {
  reportKey: "analytics-panel-hydration";
  generatedAtUtc: string;
  currentHead: string;
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  rawSensitiveDataAllowed: false;
  scoreDimensions: Record<string, number>;
  totalPanels: number;
  hydratedPanels: number;
  stalePanels: number;
  collectingPanels: number;
  sourceReadyWaitingForActivityPanels: number;
  notObservedButExpectedPanels: number;
  sourceMissingPanels: number;
  materializerMissingPanels: number;
  bridgeMissingPanels: number;
  runtimeEvidenceRequiredPanels: number;
  adminTruthSourceRequiredPanels: number;
  providerGatedPanels: number;
  externalRequiredPanels: number;
  permissionBlockedPanels: number;
  brokenPanels: number;
  panelsByGroup: Record<AdminAnalyticsPanelGroup, {
    total: number;
    hydrated: number;
    collecting: number;
    gaps: number;
  }>;
  panelStatus: Record<string, AdminAnalyticsPanelHydrationRecord>;
  topPanelHydrationFailures: AdminAnalyticsPanelHydrationRecord[];
  liveEvidenceContribution: {
    contributes: string[];
    collecting: string[];
    blocked: string[];
    runtimeEvidenceRequired: string[];
    adminTruthSourceRequired: string[];
    externalRequired: string[];
    formalEvidenceRequired: string[];
  };
  betaGateImpact: {
    betaExitReadyBefore: boolean;
    betaExitReadyAfter: false;
    remainingBlockers: string[];
  };
  debugLane: AnalyticsPanelHydrationDebugLane;
  dirtyFiles: Array<{ path: string; classification: string }>;
  nextExactSteps: string[];
  validationFailures: string[];
};
