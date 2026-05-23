import type {
  DebugBacklogItem,
  DebugBacklogSeverity,
  DebugBacklogSource,
  DebugBacklogStatus,
  DebugFixClass,
  ScoreDimensionImpact,
  DebugBacklogSummary,
} from "./debug-backlog-contract";
import {
  scoreDebugSignalActionability,
} from "./debug-signal-actionability";

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

function buildBetaCapItems(publicBetaScore?: PublicBetaScoreInput | null): DebugBacklogItem[] {
  const caps = publicBetaScore?.evidenceCapDetails ?? [];
  return caps.map((cap, index) => {
    const [rawTitle, rawReason] = cap.split(/\s+-\s+/u);
    const lower = cap.toLowerCase();
    const runtime = lower.includes("runtime");
    const provider = lower.includes("provider");
    const adminTruth = lower.includes("admin truth");
    const visual = lower.includes("visual") || lower.includes("manual");
    const source: DebugBacklogSource = adminTruth ? "admin_truth" : "beta_score";
    const dimension: ScoreDimensionImpact = runtime || provider ? "runtimeHealth" : "evidenceCompleteness";
    const external = runtime || provider || visual || adminTruth;
    return makeItem({
      id: `beta-cap-${slug(rawTitle || cap)}-${index}`,
      title: rawTitle || "Beta score evidence cap",
      owner: adminTruth ? "admin_debug" : provider ? "provider_evidence" : runtime ? "runtime_evidence" : "beta_score",
      surface: adminTruth ? "admin_debug" : runtime || provider ? "runtime_evidence" : visual ? "mobile_ui" : "beta_score",
      severity: external ? "p1" : "p2",
      source,
      status: external ? "blocked_manual" : "open",
      fixClass: external ? "manual_required" : "evidence_refresh",
      scoreDimensionImpact: [dimension],
      scoreImpact: dimension === "runtimeHealth" ? publicBetaScore?.runtimeHealthScore : publicBetaScore?.evidenceCompletenessScore,
      sourceFiles: ["agent/state/public-beta-score.generated.json"],
      sourceRoute: adminTruth ? "/admin/debug" : "agent/state/public-beta-score.generated.json",
      evidenceStatus: runtime ? "runtime_unverified" : external ? "formal_missing" : "unknown",
      evidenceReason: runtime || external ? rawReason || cap : `Unknown evidence classification: ${rawReason || cap}`,
      exactNextAction: adminTruth
        ? "Attach a redacted first-party admin truth sample before clearing the formal admin truth evidence gate."
        : runtime || provider
          ? "Attach formal deployed runtime/provider smoke evidence before clearing this beta gate."
          : visual
            ? "Attach targeted manual or screenshot evidence before clearing visual/manual smoke."
            : "Refresh the owning evidence artifact and keep the beta cap visible until evidence is formal.",
      sourceMessage: cap,
      sourceValidator: "npm run check:beta-score",
      blockedReason: external ? "Formal evidence is required and cannot be generated from source-only validation." : undefined,
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
        ? "Attach deployed runtime smoke evidence before treating runtime health as proven."
        : "Work the score dimension owner lane and refresh score-80 path lock.",
      sourceMessage: toText(drag.reason, "Score drag remains."),
      sourceValidator: "npm run check:beta-score",
      blockedReason: dimension === "runtimeHealth" ? "Requires deployed runtime proof." : undefined,
    });
  });

  const artifacts = (score80PathLock?.artifactsBlocking80 ?? []).map((artifact) => {
    const artifactPath = toText(artifact.id, "unknown artifact");
    const nextAction = toText(artifact.nextAction, "Refresh or retire the stale artifact.");
    const refreshCommand = toText(artifact.refreshCommand);
    return makeItem({
      id: `stale-artifact-${slug(artifactPath)}`,
      title: `Stale artifact: ${artifactPath}`,
      owner: "evidence",
      surface: "agent_state",
      severity: toNumber(artifact.pointImpact) >= 2 ? "p1" : "p2",
      source: "evidence",
      status: refreshCommand ? "open" : "stale_retired",
      fixClass: refreshCommand ? "evidence_refresh" : "stale_retire",
      scoreDimensionImpact: ["freshness"],
      scoreImpact: artifact.pointImpact,
      sourceFiles: [artifactPath],
      sourceRoute: artifactPath,
      evidenceStatus: "stale",
      evidenceReason: toText(artifact.status, "stale_source_version"),
      exactNextAction: nextAction,
      sourceMessage: nextAction,
      refreshCommand,
      staleRetireReason: refreshCommand ? undefined : "No focused refresh command exists, so this remains evidence-only until an owner command is added.",
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
    evidenceReason: `${debugRuntimeEvidence.unknownEvidenceCount} unknown debug/runtime evidence lane(s) remain classified as source-backed but not deployed runtime proof.`,
    exactNextAction: toText(debugRuntimeEvidence.nextAction, "Classify the unknown evidence lane and keep deployed runtime smoke separate."),
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
    title: "Admin truth sample requires formal proof",
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
    evidenceReason: "Source-ready admin truth exists, but no redacted production admin truth sample is attached.",
    exactNextAction: "Attach a redacted production admin truth sample before clearing the formal admin truth gate.",
    sourceMessage: toText(adminTruthSample.status, "admin truth sample is source-ready only"),
    sourceValidator: "npm run check:admin-truth-source-sample",
    blockedReason: "Manual production evidence is required.",
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
      severity: actionability.severity,
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
    sourceFixable: fixClasses.filter((fixClass) => fixClass === "source_fix" || fixClass === "route_fix" || fixClass === "telemetry_closure" || fixClass === "cost_guard" || fixClass === "algorithm_refine").length,
    evidenceRefreshable: fixClasses.filter((fixClass) => fixClass === "evidence_refresh").length,
    manualRequired: fixClasses.filter((fixClass) => fixClass === "manual_required").length,
    p0P1Open: items.filter((item) => ["critical", "p0", "p1"].includes(item.severity) && ["open", "blocked_manual", "blocked_external"].includes(item.status)).length,
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
