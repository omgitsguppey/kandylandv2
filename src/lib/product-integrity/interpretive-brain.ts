import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import { BODY_SYSTEM_IDS, type BodySystemId } from "@/lib/product-integrity/product-body-system-contract";
import type {
  CentralNormalizerOutput,
} from "./central-normalizer-contract";
import {
  INTERPRETIVE_BRAIN_CONTRACT_VERSION,
  type BaseInterpretiveFinding,
  type InterpretiveBrainActionability,
  type InterpretiveBrainDebugLane,
  type InterpretiveBrainDebugTriageReport,
  type InterpretiveBrainDirtyClassification,
  type InterpretiveBrainDirtyFile,
  type InterpretiveBrainFinding,
  type InterpretiveBrainInput,
  type InterpretiveBrainNextAction,
  type InterpretiveBrainOpenPullRequest,
  type InterpretiveBrainOperatorSummary,
  type InterpretiveBrainRootCause,
  type InterpretiveBrainSeverity,
  type InterpretiveBrainTopAction,
  type ScoreDimensionInput,
} from "./interpretive-brain-contract";

export { INTERPRETIVE_BRAIN_CONTRACT_VERSION };

const SEVERITY_RANK: Record<InterpretiveBrainSeverity, number> = {
  critical: 6,
  p0: 5,
  p1: 4,
  p2: 3,
  p3: 2,
  info: 1,
};

const ACTIONABILITY_RANK: Record<InterpretiveBrainActionability, number> = {
  fix_now: 8,
  score_impacting: 7,
  evidence_required: 6,
  formal_gate: 5,
  blocked_external: 4,
  monitor: 2,
  informational: 1,
};

const DEFAULT_VALIDATOR = "npm run check:interpretive-brain-debug-triage";

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function slug(value: unknown, fallback = "finding"): string {
  return text(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 120) || fallback;
}

function bodySystemFor(input: InterpretiveBrainInput): BodySystemId | "missing" {
  const bodySystem = input.bodySystem ?? input.debugSignal?.bodySystem ?? input.scoreSignal?.bodySystem ?? input.globalMetricFact?.bodySystem ?? input.userMetricFact?.bodySystem;
  return BODY_SYSTEM_IDS.includes(bodySystem as BodySystemId) ? bodySystem as BodySystemId : "missing";
}

function confidenceFor(input: InterpretiveBrainInput): BaseInterpretiveFinding["confidence"] {
  return input.sourceEvidence?.find((evidence) => evidence.confidence)?.confidence
    ?? input.globalMetricFact?.confidence
    ?? input.userMetricFact?.confidence
    ?? "unknown";
}

function scoreDimensionFor(input: InterpretiveBrainInput): PublicBetaHealthDimension {
  return input.scoreSignal?.dimensions?.[0] ?? "evidenceCompleteness";
}

function makeNextAction(rootCause: InterpretiveBrainRootCause, action: string, owner?: string): InterpretiveBrainNextAction {
  return {
    actionId: `${rootCause}-${slug(action)}`,
    action,
    validator: DEFAULT_VALIDATOR,
    owner,
  };
}

function makeFinding(input: Omit<BaseInterpretiveFinding, "nextAction"> & {
  nextAction: string | InterpretiveBrainNextAction;
}): InterpretiveBrainFinding {
  const nextAction = typeof input.nextAction === "string"
    ? makeNextAction(input.rootCause, input.nextAction, input.owner)
    : input.nextAction;
  return {
    ...input,
    nextAction,
    evidence: [...new Set(input.evidence.filter(Boolean))],
    blockedBy: [...new Set(input.blockedBy.filter(Boolean))],
  } as InterpretiveBrainFinding;
}

function pointImpactForScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score >= 80) return 0;
  return Number(Math.min(10, Math.max(1, (80 - score) / 8)).toFixed(2));
}

export function classifyRootCause(input: InterpretiveBrainInput): InterpretiveBrainRootCause {
  if (input.normalizationFailures?.length || input.debugSignal?.normalizationFailures?.length) return "normalization_failure";
  if (input.bodySystem === "missing" || input.debugSignal?.bodySystem === "missing" || input.scoreSignal?.bodySystem === "missing") return "missing_body_system";
  if (input.scoreSignal?.blockerType === "missing_identity") return "identity_gap";
  if (input.scoreSignal?.blockerType === "normalization_failure") return "normalization_failure";
  if (!input.globalMetricFact || !input.userMetricFact) return "metric_route_missing";
  if (!input.debugSignal) return "debug_route_missing";
  if (!input.exportFact) return "export_route_missing";
  if (input.costSignal?.costGuard === "unknown") return "cost_risk_review";
  return "source_ready";
}

export function calculateScoreImpact(input: InterpretiveBrainInput | ScoreDimensionInput): number {
  if ("score" in input) return pointImpactForScore(input.score);
  if (input.status === "failed") return 4;
  if (input.normalizationFailures?.length) return Math.min(10, input.normalizationFailures.length * 1.5);
  if (input.debugSignal?.normalizationFailures?.length) return Math.min(10, input.debugSignal.normalizationFailures.length * 1.5);
  if (input.scoreSignal?.blockerType && input.scoreSignal.blockerType !== "none") return 3;
  return 0;
}

function buildProductHealthFinding(input: InterpretiveBrainInput): InterpretiveBrainFinding {
  const rootCause = classifyRootCause(input);
  const bodySystem = bodySystemFor(input);
  const hasFailure = rootCause !== "source_ready";
  return makeFinding({
    findingType: "product_health",
    findingId: `product-health-${slug(bodySystem)}-${slug(rootCause)}`,
    bodySystem,
    severity: hasFailure ? "p1" : "info",
    actionability: hasFailure ? "fix_now" : "informational",
    rootCause,
    evidence: hasFailure
      ? [
        `normalizationFailures=${(input.normalizationFailures ?? input.debugSignal?.normalizationFailures ?? []).join(",") || "none"}`,
        `status=${input.status ?? input.debugSignal?.status ?? "unknown"}`,
      ]
      : [`${bodySystem} normalized signal is source-ready.`],
    scoreDimension: hasFailure ? scoreDimensionFor(input) : "none",
    estimatedPointImpact: calculateScoreImpact(input),
    owner: "product-integrity",
    nextAction: hasFailure
      ? "Repair the source signal, identity, metric, debug, or export route before hiding raw debug detail behind drilldowns."
      : "Keep this body system routed through the central normalizer before adding new debug lanes.",
    blockedBy: [],
    confidence: confidenceFor(input),
  });
}

function buildJourneyFinding(input: InterpretiveBrainInput): InterpretiveBrainFinding | null {
  if (!input.journeyEvent) return null;
  return makeFinding({
    findingType: "user_journey",
    findingId: `journey-${slug(input.journeyEvent.journeyEventId ?? input.eventName)}`,
    bodySystem: bodySystemFor(input),
    severity: "info",
    actionability: "monitor",
    rootCause: "source_ready",
    evidence: [`journeyEvent=${input.journeyEvent.journeyEventId}`],
    scoreDimension: "evidenceCompleteness",
    estimatedPointImpact: 0,
    owner: "behavioral-intelligence",
    nextAction: "Keep journey meaning derived from normalized facts instead of raw debug noise.",
    blockedBy: [],
    confidence: confidenceFor(input),
  });
}

function buildFailureCauseFindings(input: InterpretiveBrainInput): InterpretiveBrainFinding[] {
  const failures = [...new Set([
    ...(input.normalizationFailures ?? []),
    ...(input.debugSignal?.normalizationFailures ?? []),
  ].filter(Boolean))];
  return failures.map((failure) => makeFinding({
    findingType: "failure_cause",
    findingId: `failure-cause-${slug(bodySystemFor(input))}-${slug(failure)}`,
    bodySystem: bodySystemFor(input),
    severity: failure.includes("identity") || failure.includes("body") ? "p1" : "p2",
    actionability: "fix_now",
    rootCause: failure.includes("identity")
      ? "identity_gap"
      : failure.includes("body")
        ? "missing_body_system"
        : "normalization_failure",
    evidence: [failure],
    scoreDimension: scoreDimensionFor(input),
    estimatedPointImpact: 2,
    owner: "product-integrity",
    nextAction: `Repair ${failure} before trusting Product brain triage for this signal.`,
    blockedBy: [],
    confidence: confidenceFor(input),
  }));
}

function buildScoreFindings(input: InterpretiveBrainInput): InterpretiveBrainFinding[] {
  const fromSignal = (input.scoreSignal?.dimensions ?? []).map((dimension) => makeFinding({
    findingType: "score_impact",
    findingId: `score-signal-${slug(bodySystemFor(input))}-${dimension}`,
    bodySystem: bodySystemFor(input),
    severity: input.scoreSignal?.blockerType && input.scoreSignal.blockerType !== "none" ? "p1" : "p3",
    actionability: input.scoreSignal?.blockerType && input.scoreSignal.blockerType !== "none" ? "score_impacting" : "monitor",
    rootCause: input.scoreSignal?.blockerType === "missing_identity" ? "identity_gap" : input.scoreSignal?.blockerType === "missing_body_system" ? "missing_body_system" : "source_ready",
    evidence: [`scoreDimension=${dimension}`, `blockerType=${input.scoreSignal?.blockerType ?? "none"}`],
    scoreDimension: dimension,
    estimatedPointImpact: calculateScoreImpact(input),
    owner: "beta-score",
    nextAction: "Keep score impact mapped to a body system and exact next action before beta gates are interpreted.",
    blockedBy: input.scoreSignal?.blockerType && input.scoreSignal.blockerType !== "none" ? [input.scoreSignal.blockerType] : [],
    confidence: confidenceFor(input),
  }));

  const belowTarget = (input.scoreDimensions ?? [])
    .filter((dimension) => dimension.score < 80)
    .map((dimension) => makeFinding({
      findingType: "score_impact",
      findingId: `score-below-80-${dimension.dimension}`,
      bodySystem: bodySystemFor(input),
      severity: "p1",
      actionability: "score_impacting",
      rootCause: "source_ready",
      evidence: [`${dimension.dimension}=${dimension.score}`, dimension.reason],
      scoreDimension: dimension.dimension,
      estimatedPointImpact: calculateScoreImpact(dimension),
      owner: "beta-score",
      nextAction: dimension.nextAction,
      blockedBy: [],
      confidence: "linked",
    }));

  return [...fromSignal, ...belowTarget];
}

function buildCostFinding(input: InterpretiveBrainInput): InterpretiveBrainFinding | null {
  if (!input.costSignal) return null;
  const review = input.costSignal.costGuard === "unknown";
  return makeFinding({
    findingType: "cost_risk",
    findingId: `cost-${slug(bodySystemFor(input))}-${slug(input.costSignal.costGuard)}`,
    bodySystem: bodySystemFor(input),
    severity: review ? "p1" : "info",
    actionability: review ? "evidence_required" : "monitor",
    rootCause: review ? "cost_risk_review" : "cost_guard_ready",
    evidence: [
      `costClass=${input.costSignal.costClass}`,
      `costGuard=${input.costSignal.costGuard}`,
      `providerCallRequired=${input.costSignal.providerCallRequired}`,
    ],
    scoreDimension: "costRisk",
    estimatedPointImpact: review ? 4 : 0,
    owner: "cost-runtime-infrastructure",
    nextAction: input.costSignal.nextAction || "Keep cost evidence summary-first and do not call providers from debug triage.",
    blockedBy: review ? ["cost_guard_review"] : [],
    confidence: confidenceFor(input),
  });
}

function buildFormalGateFindings(input: InterpretiveBrainInput): InterpretiveBrainFinding[] {
  const formal = (input.formalEvidence ?? [])
    .filter((evidence) => evidence.status !== "passed")
    .map((evidence) => makeFinding({
      findingType: "formal_gate",
      findingId: `formal-gate-${slug(evidence.gateId)}`,
      bodySystem: bodySystemFor(input),
      severity: "p1",
      actionability: "formal_gate",
      rootCause: "formal_evidence_missing",
      evidence: [`${evidence.gateId}:${evidence.status}`],
      scoreDimension: "formalGate",
      estimatedPointImpact: 0,
      owner: evidence.owner,
      nextAction: evidence.nextAction,
      blockedBy: [evidence.status],
      confidence: "linked",
    }));

  const runtime = (input.runtimeSample ?? [])
    .filter((sample) => sample.status !== "present")
    .map((sample) => makeFinding({
      findingType: "formal_gate",
      findingId: `runtime-sample-${slug(sample.sampleId)}`,
      bodySystem: bodySystemFor(input),
      severity: "p1",
      actionability: "formal_gate",
      rootCause: "runtime_sample_missing",
      evidence: [`${sample.sampleId}:${sample.status}`],
      scoreDimension: "runtimeHealth",
      estimatedPointImpact: 0,
      owner: "runtime-evidence",
      nextAction: sample.nextAction,
      blockedBy: [sample.status],
      confidence: "linked",
    }));

  const admin = (input.adminTruthSample ?? [])
    .filter((sample) => sample.status !== "present")
    .map((sample) => makeFinding({
      findingType: "formal_gate",
      findingId: `admin-truth-sample-${slug(sample.sampleId)}`,
      bodySystem: "admin_debug_ops",
      severity: "p1",
      actionability: "formal_gate",
      rootCause: "admin_truth_sample_missing",
      evidence: [`${sample.sampleId}:${sample.status}`],
      scoreDimension: "evidenceCompleteness",
      estimatedPointImpact: 0,
      owner: "admin-debug",
      nextAction: sample.nextAction,
      blockedBy: [sample.status],
      confidence: "linked",
    }));

  return [...formal, ...runtime, ...admin];
}

function buildStaleArtifactFindings(input: InterpretiveBrainInput): InterpretiveBrainFinding[] {
  return (input.staleArtifact ?? [])
    .filter((artifact) => artifact.status !== "current")
    .map((artifact) => makeFinding({
      findingType: "product_health",
      findingId: `stale-artifact-${slug(artifact.artifactPath)}`,
      bodySystem: "admin_debug_ops",
      severity: artifact.status === "in_flight" ? "p3" : "p2",
      actionability: artifact.status === "in_flight" ? "monitor" : "evidence_required",
      rootCause: artifact.status === "in_flight" ? "in_flight_lane" : "stale_evidence",
      evidence: [`${artifact.artifactPath}:${artifact.status}`],
      scoreDimension: "freshness",
      estimatedPointImpact: artifact.status === "in_flight" ? 0 : 2,
      owner: "agent-evidence",
      nextAction: artifact.nextAction,
      blockedBy: [artifact.status],
      confidence: "linked",
    }));
}

export function interpretNormalizedSignal(input: InterpretiveBrainInput): InterpretiveBrainFinding[] {
  const journeyFinding = buildJourneyFinding(input);
  const costFinding = buildCostFinding(input);
  return collapseDuplicateFindings([
    buildProductHealthFinding(input),
    ...(journeyFinding ? [journeyFinding] : []),
    ...buildFailureCauseFindings(input),
    ...buildScoreFindings(input),
    ...(costFinding ? [costFinding] : []),
    ...buildFormalGateFindings(input),
    ...buildStaleArtifactFindings(input),
  ]);
}

export function interpretBodySystemHealth(input: { findings: readonly InterpretiveBrainFinding[] }): Record<string, "healthy" | "degraded" | "blocked"> {
  const status: Record<string, "healthy" | "degraded" | "blocked"> = {};
  for (const system of BODY_SYSTEM_IDS) status[system] = "healthy";
  for (const finding of input.findings) {
    if (finding.severity === "critical" || finding.severity === "p0" || finding.actionability === "formal_gate") {
      status[finding.bodySystem] = "blocked";
      continue;
    }
    if (["p1", "p2"].includes(finding.severity) && status[finding.bodySystem] !== "blocked") {
      status[finding.bodySystem] = "degraded";
    }
  }
  return status;
}

export function prioritizeFindings(findings: readonly InterpretiveBrainFinding[]): InterpretiveBrainFinding[] {
  return [...findings].sort((left, right) =>
    SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]
    || ACTIONABILITY_RANK[right.actionability] - ACTIONABILITY_RANK[left.actionability]
    || right.estimatedPointImpact - left.estimatedPointImpact
    || left.findingId.localeCompare(right.findingId));
}

function collapseKey(finding: InterpretiveBrainFinding): string {
  return [
    finding.findingType,
    finding.bodySystem,
    finding.rootCause,
    finding.scoreDimension,
    slug(finding.nextAction.action),
  ].join("|");
}

function pickParent(left: InterpretiveBrainFinding, right: InterpretiveBrainFinding): InterpretiveBrainFinding {
  const [winner] = prioritizeFindings([left, right]);
  return winner;
}

export function collapseDuplicateFindings(findings: readonly InterpretiveBrainFinding[]): InterpretiveBrainFinding[] {
  const byKey = new Map<string, InterpretiveBrainFinding>();
  for (const finding of findings) {
    const key = collapseKey(finding);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...finding, duplicateChildren: [] });
      continue;
    }

    const parent = pickParent(existing, finding);
    const child = parent.findingId === existing.findingId ? finding : existing;
    byKey.set(key, {
      ...parent,
      evidence: [...new Set([...existing.evidence, ...finding.evidence])],
      blockedBy: [...new Set([...existing.blockedBy, ...finding.blockedBy])],
      estimatedPointImpact: Math.max(existing.estimatedPointImpact, finding.estimatedPointImpact),
      duplicateChildren: [...new Set([
        ...(existing.duplicateChildren ?? []),
        ...(finding.duplicateChildren ?? []),
        child.findingId,
      ].filter((id) => id !== parent.findingId))],
    } as InterpretiveBrainFinding);
  }
  return prioritizeFindings([...byKey.values()]);
}

export function buildNextAction(input: InterpretiveBrainFinding | InterpretiveBrainRootCause): InterpretiveBrainNextAction {
  if (typeof input !== "string") return input.nextAction;
  const action = input === "formal_evidence_missing"
    ? "Attach the formal evidence artifact before clearing the gate."
    : input === "stale_evidence"
      ? "Refresh or retire the stale generated artifact before interpreting beta readiness."
      : input === "cost_risk_review"
        ? "Attach source cost guard evidence and keep external billing review separate."
        : "Route the source signal through central normalization and debug triage.";
  return makeNextAction(input, action, "product-integrity");
}

export function buildInterpretiveBrainDebugLane(summaryOrFindings: InterpretiveBrainOperatorSummary | readonly InterpretiveBrainFinding[]): InterpretiveBrainDebugLane {
  const findings: readonly InterpretiveBrainFinding[] = "findings" in summaryOrFindings ? summaryOrFindings.findings : summaryOrFindings;
  const status = interpretBodySystemHealth({ findings });
  return {
    label: "Product brain",
    topActionCount: Math.min(prioritizeFindings(findings).length, 10),
    criticalFindingCount: findings.filter((finding) => finding.severity === "critical" || finding.severity === "p0").length,
    bodySystemsHealthy: Object.values(status).filter((value) => value === "healthy").length,
    bodySystemsDegraded: Object.values(status).filter((value) => value === "degraded").length,
    bodySystemsBlocked: Object.values(status).filter((value) => value === "blocked").length,
    scoreBelow80Reasons: findings.filter((finding) => finding.findingId.startsWith("score-below-80-")).length,
    formalGateFindings: findings.filter((finding) => finding.findingType === "formal_gate").length,
    costRiskFindings: findings.filter((finding) => finding.findingType === "cost_risk").length,
    staleArtifactFindings: findings.filter((finding) => finding.rootCause === "stale_evidence").length,
    inFlightFindings: findings.filter((finding) => finding.rootCause === "in_flight_lane").length,
    unsafeUnknownCount: findings.filter((finding) => finding.rootCause === "unsafe_unknown").length,
    defaultView: "product_brain_summary",
    rawLanesDefaultOpen: false,
    sourceOfTruth: "src/lib/product-integrity/interpretive-brain.ts",
  };
}

function topAction(finding: InterpretiveBrainFinding): InterpretiveBrainTopAction {
  return {
    findingId: finding.findingId,
    bodySystem: finding.bodySystem,
    severity: finding.severity,
    rootCause: finding.rootCause,
    scoreDimension: finding.scoreDimension,
    nextAction: finding.nextAction.action,
    validator: finding.nextAction.validator,
    owner: finding.owner,
  };
}

export function buildOperatorSummary(input: {
  findings?: readonly InterpretiveBrainFinding[];
  normalizedSignals?: readonly (CentralNormalizerOutput | InterpretiveBrainInput)[];
}): InterpretiveBrainOperatorSummary {
  const findings = collapseDuplicateFindings(input.findings ?? (input.normalizedSignals ?? []).flatMap((signal) => interpretNormalizedSignal(signal)));
  const prioritized = prioritizeFindings(findings);
  const bodySystemStatus = interpretBodySystemHealth({ findings: prioritized });
  return {
    defaultView: "product_brain_summary",
    rawLanesDefaultOpen: false,
    rawDetailPolicy: "drilldown_only",
    topActions: prioritized.slice(0, 10).map(topAction),
    bodySystemStatus,
    scoreBelow80Reasons: prioritized
      .filter((finding) => finding.findingId.startsWith("score-below-80-") && finding.scoreDimension !== "formalGate" && finding.scoreDimension !== "none")
      .map((finding) => ({
        dimension: finding.scoreDimension as PublicBetaHealthDimension,
        reason: finding.evidence.join("; "),
        nextAction: finding.nextAction.action,
      })),
    formalGates: prioritized.filter((finding) => finding.findingType === "formal_gate"),
    costRisks: prioritized.filter((finding) => finding.findingType === "cost_risk"),
    staleArtifacts: prioritized.filter((finding) => finding.rootCause === "stale_evidence"),
    inFlightLanes: prioritized.filter((finding) => finding.rootCause === "in_flight_lane"),
    findings: prioritized,
    debugLane: buildInterpretiveBrainDebugLane(prioritized),
    hiddenCriticalCount: 0,
  };
}

export function buildAiRepairWorkbenchFindingFeed(summary: InterpretiveBrainOperatorSummary) {
  return {
    source: "prioritized_findings" as const,
    paidAiRuntimeAllowed: false as const,
    findings: summary.topActions,
    nextAction: "Use these prioritized findings as context only; do not call paid AI repair runtime without explicit approval.",
  };
}

export function buildOperatorSummaryFromNormalizedSignals(signals: readonly CentralNormalizerOutput[]): InterpretiveBrainOperatorSummary {
  return buildOperatorSummary({ normalizedSignals: signals });
}

export function classifyInterpretiveBrainDirtyFile(path: string): InterpretiveBrainDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/state/interpretive-brain-debug-triage.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/final-product-integrity-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/product-body-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/body-system-wiring-repair.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/interpretive-brain-debug-triage.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/final-product-integrity-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/product-body-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/body-system-wiring-repair.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-interpretive-brain-debug-triage.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-product-integrity-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-body-system-wiring-repair.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/interpretive-brain-debug-triage.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-product-integrity-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/body-system-wiring-repair.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/product-integrity/interpretive-brain.ts" || normalized === "src/lib/product-integrity/interpretive-brain-contract.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "src/lib/product-integrity/body-system-wiring-repair.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/final-product-integrity-lock.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts" || normalized === "src/lib/product-integrity/product-body-map.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "src/lib/product-integrity/central-normalizer.ts" || normalized === "src/lib/product-integrity/central-normalizer-contract.ts") {
    return "real_source_change_needs_review";
  }
  if (normalized === "package.json") return "validator_artifact_expected";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) {
    return "release_artifact_expected";
  }
  if (/wallet|paypal|payment|gumdrop|navbar|bottom-nav/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

export function classifyInterpretiveBrainOpenPullRequest(input: { number: number; title: string; url: string; mergeStateStatus?: string; isDraft?: boolean }): InterpretiveBrainOpenPullRequest {
  const title = input.title.toLowerCase();
  let classification = "external_review_required";
  if (/depend|knip|syncpack|npm|puppeteer/iu.test(title)) {
    classification = "dependency_update_external_review_required";
  } else if (/math\.random|security|sentinel/iu.test(title)) {
    classification = "security_patch_external_review_required";
  } else if (/palette|accessibility|loading/iu.test(title)) {
    classification = "accessibility_patch_external_review_required";
  } else if (/map lookup|debug route|performance/iu.test(title)) {
    classification = "performance_patch_external_review_required";
  } else if (/doctrine|banned-pattern|drift/iu.test(title)) {
    classification = "doctrine_governance_external_review_required";
  } else if (/monolith|responsibility boundaries|file risk/iu.test(title)) {
    classification = "architecture_refactor_external_review_required";
  } else if (/onboarding|friction|rescue/iu.test(title)) {
    classification = "onboarding_telemetry_external_review_required";
  }
  return { ...input, classification };
}

export function validateInterpretiveBrainReport(report: InterpretiveBrainDebugTriageReport): string[] {
  const failures: string[] = [];
  if (report.operatorSummary.defaultView !== "product_brain_summary") failures.push("Product brain summary is not the default view.");
  if (report.operatorSummary.rawLanesDefaultOpen !== false) failures.push("Raw debug lanes are default-open.");
  if (report.debugLane.label !== "Product brain") failures.push("Product brain debug lane is missing.");
  if (report.rawDebugLanesDefaultOpen !== false) failures.push("Raw debug lanes must remain drilldown-only.");
  if (report.operatorSummary.hiddenCriticalCount !== 0) failures.push("Critical findings are hidden.");
  if (report.scoreDimensions.length === 0) failures.push("Score dimensions are missing.");
  for (const finding of report.findings) {
    if (!finding.rootCause) failures.push(`${finding.findingId} lacks rootCause.`);
    if (!finding.bodySystem) failures.push(`${finding.findingId} lacks bodySystem.`);
    if (!finding.owner) failures.push(`${finding.findingId} lacks owner.`);
    if (!finding.nextAction?.action) failures.push(`${finding.findingId} lacks nextAction.`);
    if (!finding.evidence.length) failures.push(`${finding.findingId} lacks evidence.`);
  }
  if (!report.findings.some((finding) => finding.findingType === "cost_risk")) failures.push("Cost risk findings are missing.");
  if (!report.findings.some((finding) => finding.findingType === "formal_gate")) failures.push("Formal gate findings are missing.");
  if (report.operatorSummary.scoreBelow80Reasons.some((reason) => !reason.nextAction)) failures.push("Score below-80 reason lacks next action.");
  const unsafeDirty = report.dirtyFiles.filter((file) => file.classification === "unsafe_unknown");
  if (unsafeDirty.length > 0) failures.push(`Dirty files unclassified: ${unsafeDirty.map((file) => file.path).join(", ")}`);
  return failures;
}

export function buildInterpretiveBrainDebugTriageReport(input: {
  findings: readonly InterpretiveBrainFinding[];
  currentHead?: string;
  dirtyFiles?: readonly string[];
  openPullRequests?: ReadonlyArray<{ number: number; title: string; url: string; mergeStateStatus?: string; isDraft?: boolean }>;
  scoreDimensions?: PublicBetaHealthDimension[];
  generatedAtUtc?: string;
}): InterpretiveBrainDebugTriageReport {
  const collapsed = collapseDuplicateFindings(input.findings);
  const summary = buildOperatorSummary({ findings: collapsed });
  const dirtyFiles: InterpretiveBrainDirtyFile[] = (input.dirtyFiles ?? []).map((path) => ({
    path,
    classification: classifyInterpretiveBrainDirtyFile(path),
  }));
  const duplicateDebugFindingsCollapsed = input.findings.length - collapsed.length;
  const report: InterpretiveBrainDebugTriageReport = {
    reportKey: "interpretive-brain-debug-triage",
    contractVersion: INTERPRETIVE_BRAIN_CONTRACT_VERSION,
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead,
    status: "pass",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    paidAiRuntimeCallsAllowed: false,
    findings: collapsed,
    operatorSummary: summary,
    debugLane: summary.debugLane,
    dirtyFiles,
    openPullRequests: (input.openPullRequests ?? []).map(classifyInterpretiveBrainOpenPullRequest),
    scoreDimensions: input.scoreDimensions?.length ? input.scoreDimensions : ["evidenceCompleteness", "runtimeHealth", "costRisk", "freshness"],
    duplicateDebugFindingsCollapsed,
    rawDebugLanesDefaultOpen: false,
    remainingGaps: summary.formalGates.length > 0
      ? ["Formal runtime/provider/admin gates remain external until artifacts are attached."]
      : [],
    nextExactSteps: summary.topActions.map((action) => action.nextAction),
    validationFailures: [],
  };
  const validationFailures = validateInterpretiveBrainReport(report);
  return {
    ...report,
    status: validationFailures.length > 0 ? "fail" : "pass",
    validationFailures,
  };
}
