export type DebugBacklogSeverity = "critical" | "p0" | "p1" | "p2" | "p3" | "info";

export type DebugBacklogSource =
  | "debug_panel"
  | "beta_score"
  | "route_diagnostics"
  | "telemetry"
  | "admin_truth"
  | "mobile_ui"
  | "cost"
  | "evidence"
  | "runtime_warning";

export type DebugFixClass =
  | "source_fix"
  | "evidence_refresh"
  | "stale_retire"
  | "algorithm_refine"
  | "route_fix"
  | "telemetry_closure"
  | "cost_guard"
  | "manual_required"
  | "no_action";

export type ScoreDimensionImpact =
  | "sourceHealth"
  | "runtimeHealth"
  | "evidenceCompleteness"
  | "freshness"
  | "costRisk"
  | "regressionRisk";

export type DebugBacklogStatus =
  | "open"
  | "fixed"
  | "deferred"
  | "not_applicable"
  | "blocked_manual"
  | "blocked_external"
  | "stale_retired";

export type DebugSignalActionability =
  | "fix_now"
  | "score_impacting"
  | "evidence_required"
  | "formal_gate"
  | "quiet_future_activity"
  | "informational"
  | "duplicate"
  | "superseded"
  | "not_actionable";

export type DebugBacklogEvidenceStatus =
  | "source_backed"
  | "formal_missing"
  | "runtime_unverified"
  | "unknown"
  | "stale"
  | "missing"
  | "external_required"
  | "not_required";

export type DebugBacklogItem = {
  id: string;
  title: string;
  owner: string;
  surface: string;
  severity: DebugBacklogSeverity;
  source: DebugBacklogSource;
  status: DebugBacklogStatus;
  fixClass: DebugFixClass;
  scoreDimensionImpact: ScoreDimensionImpact[];
  scoreImpact: number;
  actionability?: DebugSignalActionability;
  estimatedPointImpact?: number;
  defaultVisible?: boolean;
  dedupeKey?: string;
  duplicateChildren?: string[];
  sourceFiles: string[];
  sourceRoute: string;
  evidenceStatus: DebugBacklogEvidenceStatus;
  evidenceReason: string;
  exactNextAction: string;
  sourceMessage: string;
  sourceValidator?: string;
  refreshCommand?: string;
  staleRetireReason?: string;
  blockedReason?: string;
};

export type DebugBacklogSummary = {
  total: number;
  bySeverity: Record<DebugBacklogSeverity, number>;
  byStatus: Record<DebugBacklogStatus, number>;
  bySource: Record<DebugBacklogSource, number>;
  byFixClass: Record<DebugFixClass, number>;
  open: number;
  fixed: number;
  deferred: number;
  blockedManual: number;
  blockedExternal: number;
  staleRetired: number;
  sourceFixable: number;
  evidenceRefreshable: number;
  manualRequired: number;
  p0P1Open: number;
  defaultVisible: number;
  hiddenByDefault: number;
  quietFutureActivity: number;
  duplicateSignalsCollapsed: number;
  formalGates: number;
  scoreImpacting: number;
  byActionability: Record<DebugSignalActionability, number>;
};
