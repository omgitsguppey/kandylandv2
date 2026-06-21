import type {
  DebugBacklogItem,
  DebugBacklogSeverity,
  DebugBacklogSource,
  DebugBacklogStatus,
  DebugBacklogSourceTruthState,
  ScoreDimensionImpact,
  DebugBacklogSummary,
} from "./debug-backlog-contract";
import {
  scoreDebugSignalActionability,
} from "./debug-signal-actionability";
import {
  groupDebugSignals,
  summarizeDebugSignalGroups,
} from "./debug-signal-grouping";

type RecordLike = Record<string, unknown>;

type PublicBetaScoreInput = {
  overallScore?: number;
  runtimeHealthScore?: number;
  evidenceCompletenessScore?: number;
  freshnessScore?: number;
  costRiskScore?: number;
  regressionRiskScore?: number;
  launchBlockers?: string[];
  evidenceCapDetails?: string[];
};

type Score80PathLockInput = {
  remainingScoreDrag?: Array<{
    dimension?: string;
    weightedPointImpact?: number;
    reason?: string;
  }>;
  artifactsBlocking80?: Array<{
    id?: string;
    status?: string;
    pointImpact?: number;
    refreshCommand?: string;
    nextAction?: string;
  }>;
};

type DebugRuntimeEvidenceInput = {
  unknownEvidenceCount?: number;
  unresolvedWarningCount?: number;
  criticalRuntimeIssueCount?: number;
  nextAction?: string;
};

type AdminTruthSampleInput = {
  status?: string;
  productionSampleAttached?: boolean;
  formalAdminTruthSamplePassed?: boolean;
};

type RouteDiagnosticInput = {
  context?: string;
  severity?: string;
  message?: string;
  route?: string;
  sourceFile?: string;
  owner?: string;
};

type TelemetryLaneInput = {
  lane?: string;
  status?: string;
  nextAction?: string;
};

type CostReadinessInput = {
  id?: string;
  status?: string;
  message?: string;
  sourceFile?: string;
  nextAction?: string;
};

type MobileResidualInput = {
  id?: string;
  status?: string;
  message?: string;
  sourceFile?: string;
  nextAction?: string;
};

type StaleArtifactInput = {
  artifactPath?: string;
  status?: string;
  message?: string;
  refreshCommand?: string;
  nextAction?: string;
};

export type DebugBacklogInput = {
  publicBetaScore?: PublicBetaScoreInput | null;
  score80PathLock?: Score80PathLockInput | null;
  debugRuntimeEvidence?: DebugRuntimeEvidenceInput | null;
  adminTruthSample?: AdminTruthSampleInput | null;
  routeDiagnostics?: RouteDiagnosticInput[];
  telemetryLanes?: TelemetryLaneInput[];
  costReadiness?: CostReadinessInput[];
  mobileResiduals?: MobileResidualInput[];
  staleArtifacts?: StaleArtifactInput[];
  debugPanelItems?: Array<RecordLike>;
};

const SCORE_DIMENSION_ALIASES: Record<string, ScoreDimensionImpact> = {
  sourcehealth: "sourceHealth",
  sourcehealthscore: "sourceHealth",
  runtimehealth: "runtimeHealth",
  runtimehealthscore: "runtimeHealth",
  evidencecompleteness: "evidenceCompleteness",
  evidencecompletenessscore: "evidenceCompleteness",
  freshness: "freshness",
  freshnessscore: "freshness",
  costrisk: "costRisk",
  costriskscore: "costRisk",
  regressionrisk: "regressionRisk",
  regressionriskscore: "regressionRisk",
};

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 120) || "debug-backlog-item";
}

function normalizeScoreDimension(value: unknown): ScoreDimensionImpact {
  const normalized = String(value ?? "").replace(/[^a-z]/giu, "").toLowerCase();
  return SCORE_DIMENSION_ALIASES[normalized] ?? "evidenceCompleteness";
}

function normalizeSeverity(value: unknown, fallback: DebugBacklogSeverity = "p2"): DebugBacklogSeverity {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "critical") return "critical";
  if (raw === "p0") return "p0";
  if (raw === "p1" || raw === "major" || raw === "error") return "p1";
  if (raw === "p2" || raw === "review" || raw === "warn" || raw === "warning") return "p2";
  if (raw === "p3" || raw === "minor") return "p3";
  if (raw === "info") return "info";
  return fallback;
}

function normalizeStatus(value: unknown): DebugBacklogStatus {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "fixed") return "fixed";
  if (raw === "deferred") return "deferred";
  if (raw === "not_applicable") return "not_applicable";
  if (raw === "blocked_manual") return "blocked_manual";
  if (raw === "blocked_external") return "blocked_external";
  if (raw === "stale_retired") return "stale_retired";
  return "open";
}

const DEBUG_BACKLOG_SOURCE_TRUTH_STATES: DebugBacklogSourceTruthState[] = [
  "source_backed",
  "source_fixable",
  "source_refresh_required",
  "runtime_proof_required",
  "provider_or_external_proof_required",
  "admin_truth_source_required",
  "manual_visual_required",
  "protected_manual_review",
  "stale_evidence_archive",
  "not_actionable",
  "unknown_source_state",
];

function isSourceFixableClass(fixClass: DebugBacklogItem["fixClass"]) {
  return fixClass === "source_fix"
    || fixClass === "route_fix"
    || fixClass === "telemetry_closure"
    || fixClass === "cost_guard"
    || fixClass === "algorithm_refine";
}

export function resolveDebugBacklogSourceTruthState(item: DebugBacklogItem): DebugBacklogSourceTruthState {
  const searchable = `${item.id} ${item.title} ${item.source} ${item.surface} ${item.evidenceReason} ${item.exactNextAction} ${item.sourceMessage}`.toLowerCase();

  if (item.status === "stale_retired" || item.fixClass === "stale_retire") {
    return "stale_evidence_archive";
  }

  if (item.status === "not_applicable" || item.fixClass === "no_action") {
    return "not_actionable";
  }

  if (item.source === "admin_truth" && item.evidenceStatus === "formal_missing") {
    return "admin_truth_source_required";
  }

  if (item.evidenceStatus === "runtime_unverified") {
    return "runtime_proof_required";
  }

  if (item.evidenceStatus === "external_required" || item.status === "blocked_external") {
    return "provider_or_external_proof_required";
  }

  if (item.status === "blocked_manual" || item.fixClass === "manual_required") {
    return /visual|screenshot|layout|ui qa|ui source coverage/u.test(searchable)
      ? "source_refresh_required"
      : "protected_manual_review";
  }

  if (item.evidenceStatus === "stale" || item.evidenceStatus === "missing" || item.fixClass === "evidence_refresh") {
    return "source_refresh_required";
  }

  if (isSourceFixableClass(item.fixClass)) {
    return "source_fixable";
  }

  if (item.evidenceStatus === "source_backed" || item.evidenceStatus === "not_required") {
    return "source_backed";
  }

  return "unknown_source_state";
}

function makeItem(input: Omit<DebugBacklogItem,
  "sourceFiles"
  | "scoreDimensionImpact"
  | "scoreImpact"
  | "actionability"
  | "estimatedPointImpact"
  | "defaultVisible"
  | "dedupeKey"
  | "duplicateChildren"
> & {
  sourceFiles: string[] | string;
  scoreDimensionImpact: ScoreDimensionImpact[] | ScoreDimensionImpact;
  scoreImpact?: number;
}): DebugBacklogItem {
  const scoreDimensionImpact = Array.isArray(input.scoreDimensionImpact) ? input.scoreDimensionImpact : [input.scoreDimensionImpact];
  const scoreImpact = Number(toNumber(input.scoreImpact, 0).toFixed(2));
  const sourceFiles = Array.isArray(input.sourceFiles) ? input.sourceFiles.filter(Boolean) : [input.sourceFiles].filter(Boolean);
  const actionabilitySummary = scoreDebugSignalActionability([{
    signalId: input.id,
    signalType: input.source,
    severity: input.severity,
    scoreDimensionsAffected: scoreDimensionImpact,
    scoreImpact,
    owner: input.owner,
    nextAction: input.exactNextAction,
    sourceFiles,
    validator: input.sourceValidator,
    sourceMessage: input.sourceMessage,
    evidenceStatus: input.evidenceStatus,
    fixClass: input.fixClass,
  }]);
  const actionability = actionabilitySummary.defaultVisibleSignals[0] ?? actionabilitySummary.hiddenSignals[0];

  return {
    ...input,
    sourceFiles,
    scoreDimensionImpact,
    scoreImpact,
    actionability: actionability.actionability,
    estimatedPointImpact: actionability.estimatedPointImpact,
    defaultVisible: actionability.defaultVisible,
    dedupeKey: actionability.dedupeKey,
    duplicateChildren: actionability.duplicateChildren,
  };
}

function stripBetaCapPrefix(detail: string) {
  return detail
    .replace(/^(unknown evidence|stale evidence|runtime unverified|ready with smoke required|visual qa required|needs review):\s*/iu, "")
    .trim();
}

function resolveBetaCapItemCopy(cap: string, rawTitle: string, rawReason: string) {
  const normalized = stripBetaCapPrefix(`${rawTitle}${rawReason ? ` - ${rawReason}` : ""}` || cap);
  const lower = normalized.toLowerCase();
  const runtime = lower.includes("runtime/provider smoke")
    || lower.includes("runtime smoke")
    || lower.includes("debug/runtime evidence")
    || lower.includes("deployed runtime")
    || lower.includes("deployed route evidence")
    || lower.includes("deployed runtime route evidence");
  const provider = lower.includes("provider smoke") || lower.includes("provider-backed site activity");
  const adminTruth = lower.includes("admin truth")
    || lower.includes("truth sample")
    || lower.includes("sample evidence")
    || lower.includes("admin source activity sample")
    || lower.includes("admin source sample");
  const visual = lower.includes("visual") || lower.includes("ui source coverage");
  const refresh = lower.includes("report freshness") || lower.includes("pr integrity") || lower.includes("freshness window");
  const sourceOnly = lower.includes("targeted behavior tests");

  if (sourceOnly) {
    return {
      title: "Source-only behavior evidence",
      severity: "info" as const,
      status: "not_applicable" as const,
      fixClass: "no_action" as const,
      evidenceStatus: "source_backed" as const,
      owner: "beta_score",
      surface: "beta_score",
      exactNextAction: "Keep targeted behavior checks as source-only evidence; keep provider-backed site activity, runtime/deployed route evidence, and admin source activity sample gates separate.",
      evidenceReason: "Implemented behavior validators passed. This does not prove runtime/deployed route evidence, provider-backed site activity, admin source activity sample, or optional visual confirmation evidence.",
      sourceMessage: "Source-only behavior evidence is present.",
    };
  }

  if (runtime || provider) {
    return {
      title: "Provider and route evidence required",
      severity: "p1" as const,
      status: "blocked_external" as const,
      fixClass: "manual_required" as const,
      evidenceStatus: runtime ? "runtime_unverified" as const : "external_required" as const,
      owner: provider ? "provider_evidence" : "runtime_evidence",
      surface: "runtime_evidence",
      exactNextAction: "Attach redacted provider-backed site activity evidence and deployed route evidence before clearing this beta gate.",
      evidenceReason: rawReason || "Provider-backed site activity or deployed route evidence is missing.",
      sourceMessage: /operator-confirmed|operator confirmed|paypal/iu.test(cap)
        ? "Payment context is product context only; provider-backed site activity and deployed route evidence are still required."
        : "Provider-backed site activity and deployed route evidence are still required.",
    };
  }

  if (adminTruth) {
    return {
      title: "Admin source activity sample required",
      severity: "p1" as const,
      status: "blocked_manual" as const,
      fixClass: "manual_required" as const,
      evidenceStatus: "formal_missing" as const,
      owner: "admin_debug",
      surface: "admin_debug",
      exactNextAction: "Attach a redacted admin source activity sample before clearing the admin source sample gate.",
      evidenceReason: rawReason || "A redacted admin source activity sample is missing.",
      sourceMessage: "Admin source sample evidence is required.",
    };
  }

  if (visual) {
    return {
      title: "UI source coverage required",
      severity: "p1" as const,
      status: "open" as const,
      fixClass: "evidence_refresh" as const,
      evidenceStatus: "missing" as const,
      owner: "ui_source_coverage",
      surface: "ui_source_coverage",
      exactNextAction: "Run deterministic UI source coverage and fix any source-reported surface gaps; use optional visual reproduction only after a reported issue exists.",
      evidenceReason: "UI readiness starts with source coverage. Visual reproduction is optional confirmation after the codebase reports a UI issue.",
      sourceMessage: "UI source coverage must run before optional visual review.",
    };
  }

  if (refresh) {
    return {
      title: "Report refresh required",
      severity: "p2" as const,
      status: "open" as const,
      fixClass: "evidence_refresh" as const,
      evidenceStatus: "stale" as const,
      owner: "evidence",
      surface: "agent_state",
      exactNextAction: "Refresh the required generated reports before treating the beta evidence snapshot as current.",
      evidenceReason: rawReason || "Required generated reports are outside the freshness window.",
      sourceMessage: "Report freshness is outside the accepted window.",
    };
  }

  return {
    title: stripBetaCapPrefix(rawTitle || cap) || "Evidence gate needs review",
    severity: "p2" as const,
    status: "open" as const,
    fixClass: "evidence_refresh" as const,
    evidenceStatus: "unknown" as const,
    owner: "beta_score",
    surface: "beta_score",
    exactNextAction: "Classify the owning evidence artifact and keep the beta cap visible until evidence is formal.",
    evidenceReason: rawReason || normalized || "Evidence gate needs classification.",
    sourceMessage: normalized || "Evidence gate needs classification.",
  };
}

function buildBetaCapItems(publicBetaScore?: PublicBetaScoreInput | null): DebugBacklogItem[] {
  const caps = publicBetaScore?.evidenceCapDetails ?? [];
  return caps.map((cap, index) => {
    const [rawTitle, rawReason] = cap.split(/\s+-\s+/u);
    const copy = resolveBetaCapItemCopy(cap, rawTitle || "", rawReason || "");
    const source: DebugBacklogSource = copy.surface === "admin_debug" ? "admin_truth" : copy.surface === "mobile_ui" ? "mobile_ui" : copy.owner === "evidence" ? "evidence" : "beta_score";
    const dimension: ScoreDimensionImpact = copy.evidenceStatus === "runtime_unverified" || copy.evidenceStatus === "external_required" ? "runtimeHealth" : "evidenceCompleteness";
    return makeItem({
      id: `beta-cap-${slug(rawTitle || cap)}-${index}`,
      title: copy.title,
      owner: copy.owner,
      surface: copy.surface,
      severity: copy.severity,
      source,
      status: copy.status,
      fixClass: copy.fixClass,
      scoreDimensionImpact: [dimension],
      scoreImpact: dimension === "runtimeHealth" ? publicBetaScore?.runtimeHealthScore : publicBetaScore?.evidenceCompletenessScore,
      sourceFiles: ["agent/state/public-beta-score.generated.json"],
      sourceRoute: copy.surface === "admin_debug" ? "/admin/debug" : "agent/state/public-beta-score.generated.json",
      evidenceStatus: copy.evidenceStatus,
      evidenceReason: copy.evidenceReason,
      exactNextAction: copy.exactNextAction,
      sourceMessage: copy.sourceMessage,
      sourceValidator: "npm run check:beta-score",
      blockedReason: copy.fixClass === "manual_required" ? "Typed provider-backed site activity, deployed route, or admin source activity evidence is required and cannot be generated from source-only validation." : undefined,
    });
  });
}

function buildScoreDragItems(score80PathLock?: Score80PathLockInput | null): DebugBacklogItem[] {
  const dragItems = (score80PathLock?.remainingScoreDrag ?? []).map((drag) => {
    const dimension = normalizeScoreDimension(drag.dimension);
    const pointImpact = toNumber(drag.weightedPointImpact);
    return makeItem({
      id: `score-drag-${slug(String(drag.dimension ?? dimension))}`,
      title: `Score drag: ${String(drag.dimension ?? dimension)}`,
      owner: dimension === "costRisk" ? "cost" : dimension === "runtimeHealth" ? "runtime_evidence" : "beta_score",
      surface: dimension === "costRisk" ? "cost" : "beta_score",
      severity: pointImpact >= 10 ? "p1" : "p2",
      source: dimension === "costRisk" ? "cost" : "beta_score",
      status: dimension === "runtimeHealth" ? "blocked_external" : "open",
      fixClass: dimension === "runtimeHealth" ? "manual_required" : dimension === "costRisk" ? "cost_guard" : "evidence_refresh",
      scoreDimensionImpact: [dimension],
      scoreImpact: pointImpact,
      sourceFiles: ["agent/state/score-80-path-lock.generated.json"],
      sourceRoute: "agent/state/score-80-path-lock.generated.json",
      evidenceStatus: dimension === "runtimeHealth" ? "runtime_unverified" : "source_backed",
      evidenceReason: toText(drag.reason, "Score drag was reported by the score-80 path lock."),
      exactNextAction: dimension === "runtimeHealth"
        ? "Attach deployed route evidence before treating runtime health as current."
        : "Work the score dimension owner lane and refresh score-80 path lock.",
      sourceMessage: toText(drag.reason, "Score drag remains."),
      sourceValidator: "npm run check:beta-score",
      blockedReason: dimension === "runtimeHealth" ? "Requires deployed route evidence." : undefined,
    });
  });

  const artifacts = (score80PathLock?.artifactsBlocking80 ?? []).map((artifact) => {
    const artifactPath = toText(artifact.id, "unknown artifact");
    const nextAction = toText(artifact.nextAction, "Refresh or retire the stale artifact.");
    const refreshCommand = toText(artifact.refreshCommand);
    const copy = resolveBetaCapItemCopy(
      `${toText(artifact.status)} - ${nextAction}`,
      toText(artifact.status),
      nextAction,
    );
    const formalGate = copy.fixClass === "manual_required";
    const dimension: ScoreDimensionImpact = copy.evidenceStatus === "runtime_unverified" || copy.evidenceStatus === "external_required" ? "runtimeHealth" : "freshness";
    return makeItem({
      id: `${formalGate ? "formal-evidence" : "stale-artifact"}-${slug(artifactPath)}`,
      title: formalGate ? copy.title : `Stale artifact: ${artifactPath}`,
      owner: formalGate ? copy.owner : "evidence",
      surface: formalGate ? copy.surface : "agent_state",
      severity: toNumber(artifact.pointImpact) >= 2 ? "p1" : "p2",
      source: formalGate && copy.surface === "admin_debug" ? "admin_truth" : formalGate && copy.surface === "mobile_ui" ? "mobile_ui" : "evidence",
      status: formalGate ? copy.status : refreshCommand ? "open" : "stale_retired",
      fixClass: formalGate ? copy.fixClass : refreshCommand ? "evidence_refresh" : "stale_retire",
      scoreDimensionImpact: [dimension],
      scoreImpact: artifact.pointImpact,
      sourceFiles: [artifactPath],
      sourceRoute: formalGate && copy.surface === "admin_debug" ? "/admin/debug" : artifactPath,
      evidenceStatus: formalGate ? copy.evidenceStatus : "stale",
      evidenceReason: formalGate ? copy.evidenceReason : toText(artifact.status, "stale_source_version"),
      exactNextAction: formalGate ? copy.exactNextAction : nextAction,
      sourceMessage: formalGate ? copy.sourceMessage : nextAction,
      refreshCommand,
      staleRetireReason: formalGate || refreshCommand ? undefined : "No focused refresh command exists, so this remains evidence-only until an owner command is added.",
    });
  });

  return [...dragItems, ...artifacts];
}

function buildDebugRuntimeItems(debugRuntimeEvidence?: DebugRuntimeEvidenceInput | null): DebugBacklogItem[] {
  if (!debugRuntimeEvidence || toNumber(debugRuntimeEvidence.unknownEvidenceCount) <= 0) {
    return [];
  }

  return [makeItem({
    id: "debug-runtime-unknown-evidence",
    title: "Debug/runtime evidence still has unknown lanes",
    owner: "admin_debug",
    surface: "admin_debug",
    severity: "p2",
    source: "runtime_warning",
    status: "open",
    fixClass: "evidence_refresh",
    scoreDimensionImpact: ["runtimeHealth", "evidenceCompleteness"],
    scoreImpact: 0.01,
    sourceFiles: ["agent/state/debug-runtime-evidence.generated.json"],
    sourceRoute: "/admin/debug",
    evidenceStatus: "unknown",
    evidenceReason: `${debugRuntimeEvidence.unknownEvidenceCount} unknown debug/runtime evidence lane(s) remain classified as source-backed but not deployed route evidence.`,
    exactNextAction: toText(debugRuntimeEvidence.nextAction, "Classify the unknown evidence lane and keep deployed route evidence separate."),
    sourceMessage: "Unknown debug/runtime evidence remains.",
    sourceValidator: "npm run check:debug-runtime-evidence",
  })];
}

function buildAdminTruthItems(adminTruthSample?: AdminTruthSampleInput | null): DebugBacklogItem[] {
  if (!adminTruthSample || adminTruthSample.productionSampleAttached === true || adminTruthSample.formalAdminTruthSamplePassed === true) {
    return [];
  }

  return [makeItem({
    id: "admin-truth-formal-sample-required",
    title: "Admin source sample required",
    owner: "admin_debug",
    surface: "admin_debug",
    severity: "p1",
    source: "admin_truth",
    status: "blocked_manual",
    fixClass: "manual_required",
    scoreDimensionImpact: ["evidenceCompleteness"],
    scoreImpact: 4.5,
    sourceFiles: ["agent/state/admin-truth-source-sample.generated.json", "src/lib/admin-debug-control-tower.ts"],
    sourceRoute: "/admin/debug",
    evidenceStatus: "formal_missing",
    evidenceReason: "Source-ready admin model evidence exists, but no redacted admin source activity sample is attached.",
    exactNextAction: "Attach a redacted admin source activity sample before clearing the admin source sample gate.",
    sourceMessage: toText(adminTruthSample.status, "admin source activity sample is source-ready only"),
    sourceValidator: "npm run check:admin-truth-source-sample",
    blockedReason: "Redacted admin source sample evidence is required.",
  })];
}

function buildRouteDiagnosticItems(routeDiagnostics?: RouteDiagnosticInput[]): DebugBacklogItem[] {
  return (routeDiagnostics ?? []).map((diagnostic, index) => makeItem({
    id: `route-diagnostic-${slug(toText(diagnostic.context ?? diagnostic.route, `route-${index}`))}`,
    title: toText(diagnostic.message, "Route diagnostic needs review"),
    owner: toText(diagnostic.owner, "platform"),
    surface: "admin_debug",
    severity: normalizeSeverity(diagnostic.severity, "p2"),
    source: "route_diagnostics",
    status: "open",
    fixClass: "route_fix",
    scoreDimensionImpact: ["runtimeHealth", "regressionRisk"],
    scoreImpact: normalizeSeverity(diagnostic.severity) === "p1" ? 2 : 1,
    sourceFiles: [toText(diagnostic.sourceFile, "src/lib/server/route-diagnostics.ts")],
    sourceRoute: toText(diagnostic.route ?? diagnostic.context, "/api/admin/debug"),
    evidenceStatus: "source_backed",
    evidenceReason: "Route diagnostic was emitted by the server diagnostic path.",
    exactNextAction: "Inspect the route diagnostic owner and fix the route source or keep the warning open.",
    sourceMessage: toText(diagnostic.message, "Route diagnostic needs review"),
    sourceValidator: "npm run check:debug-backlog-engine",
  }));
}

function buildTelemetryItems(telemetryLanes?: TelemetryLaneInput[]): DebugBacklogItem[] {
  return (telemetryLanes ?? []).filter((lane) => toText(lane.status) && !["live", "ready", "passed"].includes(toText(lane.status).toLowerCase())).map((lane, index) => makeItem({
    id: `telemetry-lane-${slug(toText(lane.lane, `lane-${index}`))}`,
    title: `Telemetry lane needs closure: ${toText(lane.lane, "unknown")}`,
    owner: "telemetry",
    surface: "telemetry",
    severity: "p2",
    source: "telemetry",
    status: "open",
    fixClass: "telemetry_closure",
    scoreDimensionImpact: ["runtimeHealth", "evidenceCompleteness"],
    scoreImpact: 2,
    sourceFiles: ["agent/state/telemetry-admin-debug-truth.generated.json"],
    sourceRoute: "/admin/debug",
    evidenceStatus: toText(lane.status).includes("unknown") ? "unknown" : "source_backed",
    evidenceReason: `Telemetry lane status is ${toText(lane.status, "unknown")}.`,
    exactNextAction: toText(lane.nextAction, "Refresh telemetry admin truth before treating this lane as live."),
    sourceMessage: `Telemetry lane ${toText(lane.lane, "unknown")} is ${toText(lane.status, "unknown")}.`,
    sourceValidator: "npm run check:telemetry-admin-debug-truth",
  }));
}

function buildCostItems(costReadiness?: CostReadinessInput[]): DebugBacklogItem[] {
  return (costReadiness ?? []).filter((item) => toText(item.status).toLowerCase().includes("review") || toText(item.status).toLowerCase().includes("required")).map((item, index) => makeItem({
    id: `cost-${slug(toText(item.id, `cost-${index}`))}`,
    title: toText(item.message, `Cost lane needs owner review: ${toText(item.id, "unknown")}`),
    owner: "cost",
    surface: "cost",
    severity: "p2",
    source: "cost",
    status: "blocked_external",
    fixClass: "cost_guard",
    scoreDimensionImpact: ["costRisk"],
    scoreImpact: 2,
    sourceFiles: [toText(item.sourceFile, "agent/state/public-beta-score.generated.json")],
    sourceRoute: "/admin/debug",
    evidenceStatus: "external_required",
    evidenceReason: `Cost lane status is ${toText(item.status, "owner_review")}.`,
    exactNextAction: toText(item.nextAction, "Keep cost lane in owner review until external billing/provider status is attached."),
    sourceMessage: toText(item.message, "Cost lane needs owner review."),
    sourceValidator: "npm run check:beta-score",
  }));
}

function buildMobileResidualItems(mobileResiduals?: MobileResidualInput[]): DebugBacklogItem[] {
  return (mobileResiduals ?? []).filter((item) => !["fixed", "passed", "current"].includes(toText(item.status).toLowerCase())).map((item, index) => makeItem({
    id: `mobile-ui-${slug(toText(item.id, `mobile-${index}`))}`,
    title: toText(item.message, `Mobile residual needs review: ${toText(item.id, "unknown")}`),
    owner: "mobile",
    surface: "mobile_ui",
    severity: "p2",
    source: "mobile_ui",
    status: "open",
    fixClass: "source_fix",
    scoreDimensionImpact: ["regressionRisk"],
    scoreImpact: 1,
    sourceFiles: [toText(item.sourceFile, "agent/state/mobile-ui-final-lock.generated.json")],
    sourceRoute: "/admin/debug",
    evidenceStatus: "source_backed",
    evidenceReason: `Mobile residual status is ${toText(item.status, "review")}.`,
    exactNextAction: toText(item.nextAction, "Fix the source residual or keep the item open."),
    sourceMessage: toText(item.message, "Mobile UI residual needs review."),
    sourceValidator: "npm run check:mobile-ui-final-lock",
  }));
}

function buildStaleArtifactItems(staleArtifacts?: StaleArtifactInput[]): DebugBacklogItem[] {
  return (staleArtifacts ?? []).map((artifact) => {
    const artifactPath = toText(artifact.artifactPath, "unknown artifact");
    const refreshCommand = toText(artifact.refreshCommand);
    return makeItem({
      id: `stale-refresh-plan-${slug(artifactPath)}`,
      title: `Refresh stale artifact: ${artifactPath}`,
      owner: "evidence",
      surface: "agent_state",
      severity: "p2",
      source: "evidence",
      status: refreshCommand ? "open" : "stale_retired",
      fixClass: refreshCommand ? "evidence_refresh" : "stale_retire",
      scoreDimensionImpact: ["freshness"],
      scoreImpact: 1,
      sourceFiles: [artifactPath],
      sourceRoute: artifactPath,
      evidenceStatus: "stale",
      evidenceReason: toText(artifact.message ?? artifact.status, "Artifact is stale."),
      exactNextAction: toText(artifact.nextAction, refreshCommand ? `Run ${refreshCommand}.` : "Retire this stale artifact from active backlog until an owner command exists."),
      sourceMessage: toText(artifact.message, "Stale artifact needs refresh or retirement."),
      refreshCommand,
      staleRetireReason: refreshCommand ? undefined : "No owner refresh command was present.",
    });
  });
}

function buildDebugPanelItems(debugPanelItems?: Array<RecordLike>): DebugBacklogItem[] {
  return (debugPanelItems ?? [])
    .filter((item) => !["live", "archive"].includes(toText(item.uiTruthState).toLowerCase()))
    .map((item) => {
      const key = toText(item.key, "debug-panel-item");
      const freshness = toText(item.freshness);
      const refreshCommand = toText(item.refreshCommand);
      const stale = freshness === "stale";
      return makeItem({
        id: `debug-panel-${slug(key)}`,
        title: toText(item.label, key),
        owner: "admin_debug",
        surface: "admin_debug",
        severity: toText(item.blocksPhaseOne) === "true" || item.blocksPhaseOne === true ? "p1" : "p2",
        source: "debug_panel",
        status: stale && !refreshCommand ? "stale_retired" : "open",
        fixClass: stale ? (refreshCommand ? "evidence_refresh" : "stale_retire") : "evidence_refresh",
        scoreDimensionImpact: [stale ? "freshness" : "evidenceCompleteness"],
        scoreImpact: item.blocksPhaseOne === true ? 4 : 1,
        sourceFiles: [toText(item.sourceArtifact, "agent/state/debug-panel-output-triage.generated.json")],
        sourceRoute: "/admin/debug",
        evidenceStatus: stale ? "stale" : toText(item.uiTruthState).includes("missing") ? "missing" : "source_backed",
        evidenceReason: toText(item.issue, "Debug panel item needs review."),
        exactNextAction: toText(item.recommendedAction, refreshCommand ? `Run ${refreshCommand}.` : "Classify this debug panel item before calling it healthy."),
        sourceMessage: toText(item.issue, "Debug panel item needs review."),
        sourceValidator: toText(item.owningValidator),
        refreshCommand,
        staleRetireReason: stale && !refreshCommand ? "Debug panel item is stale without an owner refresh command." : undefined,
      });
    });
}

function dedupeBacklog(items: DebugBacklogItem[]) {
  const scored = scoreDebugSignalActionability(items.map((item) => ({
    signalId: item.id,
    signalType: item.source,
    severity: item.severity,
    scoreDimensionsAffected: item.scoreDimensionImpact,
    scoreImpact: item.scoreImpact,
    owner: item.owner,
    nextAction: item.exactNextAction,
    sourceFiles: item.sourceFiles,
    validator: item.sourceValidator,
    sourceMessage: item.sourceMessage,
    evidenceStatus: item.evidenceStatus,
    fixClass: item.fixClass,
    dedupeKey: item.dedupeKey,
  })));
  const scoredById = new Map([...scored.defaultVisibleSignals, ...scored.hiddenSignals].map((signal) => [signal.signalId, signal]));
  const duplicateIds = new Set([...scored.defaultVisibleSignals, ...scored.hiddenSignals].flatMap((signal) => signal.duplicateChildren));
  const seen = new Set<string>();
  const output: DebugBacklogItem[] = [];
  for (const item of items) {
    if (seen.has(item.id) || duplicateIds.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    const actionability = scoredById.get(item.id);
    output.push(actionability ? {
      ...item,
      severity: item.fixClass === "no_action" || item.status === "not_applicable" ? item.severity : actionability.severity,
      actionability: actionability.actionability,
      estimatedPointImpact: actionability.estimatedPointImpact,
      defaultVisible: actionability.defaultVisible,
      dedupeKey: actionability.dedupeKey,
      duplicateChildren: actionability.duplicateChildren,
      sourceFiles: actionability.sourceFiles.length ? actionability.sourceFiles : item.sourceFiles,
    } : item);
  }
  return output.sort((left, right) => {
    const rank: Record<DebugBacklogSeverity, number> = { critical: 6, p0: 5, p1: 4, p2: 3, p3: 2, info: 1 };
    return rank[right.severity] - rank[left.severity] || right.scoreImpact - left.scoreImpact || left.id.localeCompare(right.id);
  });
}

export function buildDebugBacklog(input: DebugBacklogInput): DebugBacklogItem[] {
  return dedupeBacklog([
    ...buildBetaCapItems(input.publicBetaScore),
    ...buildScoreDragItems(input.score80PathLock),
    ...buildDebugRuntimeItems(input.debugRuntimeEvidence),
    ...buildAdminTruthItems(input.adminTruthSample),
    ...buildRouteDiagnosticItems(input.routeDiagnostics),
    ...buildTelemetryItems(input.telemetryLanes),
    ...buildCostItems(input.costReadiness),
    ...buildMobileResidualItems(input.mobileResiduals),
    ...buildStaleArtifactItems(input.staleArtifacts),
    ...buildDebugPanelItems(input.debugPanelItems),
  ]);
}

function countBy<T extends string>(values: readonly T[], allValues: readonly T[]): Record<T, number> {
  const output = Object.fromEntries(allValues.map((value) => [value, 0])) as Record<T, number>;
  values.forEach((value) => {
    output[value] += 1;
  });
  return output;
}

export function summarizeDebugBacklog(items: DebugBacklogItem[]): DebugBacklogSummary {
  const statuses = items.map((item) => item.status);
  const fixClasses = items.map((item) => item.fixClass);
  const actionability = scoreDebugSignalActionability(items.map((item) => ({
    signalId: item.id,
    signalType: item.source,
    severity: item.severity,
    scoreDimensionsAffected: item.scoreDimensionImpact,
    scoreImpact: item.scoreImpact,
    owner: item.owner,
    nextAction: item.exactNextAction,
    sourceFiles: item.sourceFiles,
    validator: item.sourceValidator,
    sourceMessage: item.sourceMessage,
    evidenceStatus: item.evidenceStatus,
    fixClass: item.fixClass,
    dedupeKey: item.dedupeKey,
  })));
  const groupedSignals = groupDebugSignals(items.map((item) => ({
    signalId: item.id,
    signalType: item.source,
    severity: item.severity,
    actionability: item.actionability ?? "informational",
    rootCause: item.evidenceStatus === "formal_missing" || item.evidenceStatus === "runtime_unverified" || item.evidenceStatus === "external_required"
      ? "blocked_formal_evidence"
      : item.fixClass,
    featureId: item.surface,
    eventFamily: item.source,
    metricFamily: item.scoreDimensionImpact.join(","),
    scoreDimensionsAffected: item.scoreDimensionImpact,
    owner: item.owner,
    estimatedPointImpact: item.estimatedPointImpact ?? item.scoreImpact,
    nextAction: item.exactNextAction,
    sourceFiles: item.sourceFiles,
    validator: item.sourceValidator,
  })));
  const groupedSummary = summarizeDebugSignalGroups(groupedSignals, items.length);
  return {
    total: items.length,
    bySeverity: countBy(items.map((item) => item.severity), ["critical", "p0", "p1", "p2", "p3", "info"]),
    byStatus: countBy(statuses, ["open", "fixed", "deferred", "not_applicable", "blocked_manual", "blocked_external", "stale_retired"]),
    bySource: countBy(items.map((item) => item.source), ["debug_panel", "beta_score", "route_diagnostics", "telemetry", "admin_truth", "mobile_ui", "cost", "evidence", "runtime_warning"]),
    byFixClass: countBy(fixClasses, ["source_fix", "evidence_refresh", "stale_retire", "algorithm_refine", "route_fix", "telemetry_closure", "cost_guard", "manual_required", "no_action"]),
    open: statuses.filter((status) => status === "open").length,
    fixed: statuses.filter((status) => status === "fixed").length,
    deferred: statuses.filter((status) => status === "deferred").length,
    blockedManual: statuses.filter((status) => status === "blocked_manual").length,
    blockedExternal: statuses.filter((status) => status === "blocked_external").length,
    staleRetired: statuses.filter((status) => status === "stale_retired").length,
    sourceFixable: fixClasses.filter(isSourceFixableClass).length,
    evidenceRefreshable: fixClasses.filter((fixClass) => fixClass === "evidence_refresh").length,
    sourceTruthStates: countBy(items.map(resolveDebugBacklogSourceTruthState), DEBUG_BACKLOG_SOURCE_TRUTH_STATES),
    p0P1Open: items.filter((item) => ["critical", "p0", "p1"].includes(item.severity) && ["open", "blocked_manual", "blocked_external"].includes(item.status)).length,
    p0P1GroupOpen: groupedSignals.filter((group) => ["critical", "p0", "p1"].includes(group.severity) && !group.hiddenByDefault).length,
    p2GroupOpen: groupedSignals.filter((group) => group.severity === "p2" && !group.hiddenByDefault).length,
    p1P2GroupOpen: groupedSignals.filter((group) => ["critical", "p0", "p1", "p2"].includes(group.severity) && !group.hiddenByDefault).length,
    rawP1P2SignalCount: groupedSummary.rawP1P2SignalCount,
    groupedSignalCount: groupedSummary.groupedSignalCount,
    defaultVisibleGroups: groupedSummary.defaultVisibleGroupCount,
    hiddenByDefaultGroups: groupedSummary.hiddenByDefaultGroupCount,
    defaultVisible: actionability.defaultVisibleCount,
    hiddenByDefault: actionability.hiddenByDefaultCount,
    quietFutureActivity: actionability.quietFutureActivityCount,
    duplicateSignalsCollapsed: actionability.duplicateSignalCount,
    formalGates: actionability.formalGateCount,
    scoreImpacting: actionability.scoreImpactingCount,
    byActionability: actionability.byActionability,
  };
}

export function validateDebugBacklog(items: DebugBacklogItem[]): string[] {
  const failures: string[] = [];
  const ids = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      failures.push(`${item.id} is duplicated.`);
    }
    ids.add(item.id);

    if (!item.owner) failures.push(`${item.id} lacks owner.`);
    if (!item.surface) failures.push(`${item.id} lacks surface.`);
    if (!item.sourceFiles.length) failures.push(`${item.id} lacks sourceFiles.`);
    if (!item.sourceRoute) failures.push(`${item.id} lacks sourceRoute.`);
    if (!item.scoreDimensionImpact.length) failures.push(`${item.id} lacks scoreDimensionImpact.`);
    if (!item.fixClass) failures.push(`${item.id} lacks fixClass.`);
    if (!item.actionability) failures.push(`${item.id} lacks actionability.`);
    if (item.actionability === "quiet_future_activity" && ["critical", "p0", "p1", "p2"].includes(item.severity)) {
      failures.push(`${item.id} quiet future activity appears as P1/P2.`);
    }
    if (item.actionability === "quiet_future_activity" && item.defaultVisible === true) {
      failures.push(`${item.id} quiet future activity is default visible.`);
    }
    if (item.actionability && ["fix_now", "score_impacting", "formal_gate"].includes(item.actionability) && item.scoreDimensionImpact.length > 0 && toNumber(item.estimatedPointImpact) <= 0) {
      failures.push(`${item.id} score-impacting signal lacks estimatedPointImpact.`);
    }
    if (!item.evidenceStatus) failures.push(`${item.id} lacks evidenceStatus.`);
    if (item.evidenceStatus === "unknown" && !item.evidenceReason) {
      failures.push(`${item.id} unknown evidence lacks reason.`);
    }
    if (item.evidenceStatus === "stale" && item.fixClass !== "evidence_refresh" && item.fixClass !== "stale_retire") {
      failures.push(`${item.id} stale issue lacks refresh/retire action.`);
    }
    if (item.evidenceStatus === "stale" && item.fixClass === "evidence_refresh" && !item.refreshCommand && !/run|refresh|attach/i.test(item.exactNextAction)) {
      failures.push(`${item.id} stale issue lacks refresh/retire action.`);
    }
    if (["critical", "p0", "p1"].includes(item.severity) && !item.exactNextAction) {
      failures.push(`${item.id} p0/p1 issue lacks exact next action.`);
    }
    if (/(healthy|live)/iu.test(item.sourceMessage) && !/(source-backed|formal|sample|snapshot|route|loaded|current)/iu.test(item.evidenceReason)) {
      failures.push(`${item.id} debug panel claims healthy/live without backing data.`);
    }
  }

  return failures;
}
