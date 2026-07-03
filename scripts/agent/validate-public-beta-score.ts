import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assertAutofixGate, type PublicBetaAutofixPlan } from "../../src/lib/agent-score/autofix";
import type { PublicBetaEvidenceGate, PublicBetaFinding, PublicBetaScoreReport } from "../../src/lib/agent-score/core";
import { classifyGeneratedArtifactFromGit, isGeneratedArtifactCurrent } from "../../src/lib/agent-score/generated-artifact-version-policy";
import { PUBLIC_BETA_SCORE_REPORT_PATH } from "../../src/lib/agent-score/reporting";

const root = process.cwd();
const failures: string[] = [];
const RETIRED_UI_SCORE_GATE_ID = ["visual", "Manual", "Smoke"].join("");
const RETIRED_UI_FORMAL_GATE_KEY = ["manual", "Visual", "Evidence"].join("");
const PUBLIC_BETA_SCORE_OWNED_INPUT_PATHS = [
  "scripts/agent/score-public-beta-readiness.ts",
  "scripts/agent/validate-public-beta-score.ts",
  "src/lib/agent-score",
  "agent/state/evidence-capture-status.generated.json",
  "agent/state/creator-experience-simplification.generated.json",
  "agent/state/user-creator-ui-parity.generated.json",
  "agent/state/targeted-behavior-evidence.generated.json",
  "agent/state/final-parity-telemetry-lock.generated.json",
  "agent/state/media-discovery-score-lock.generated.json",
  "agent/state/creator-monetization-readiness-lock.generated.json",
  "agent/state/provider-smoke-evidence.generated.json",
  "agent/state/operator-revenue-smoke.generated.json",
  "agent/state/runtime-smoke-evidence.generated.json",
  "agent/state/source-backed-runtime-confidence.generated.json",
  "agent/state/runtime-smoke-substitute-matrix.generated.json",
  "agent/state/live-evidence-gate-replacement.generated.json",
  "agent/state/real-usage-confidence.generated.json",
  "agent/state/real-usage-confidence-calibration.generated.json",
  "agent/state/behavior-math-verification.generated.json",
  "agent/state/debug-runtime-evidence.generated.json",
  "agent/state/debug-signal-grouping.generated.json",
  "agent/state/event-translation-bridge.generated.json",
  "agent/state/person-metrics-hydration.generated.json",
  "agent/state/telemetry-trigger-test-matrix.generated.json",
  "agent/state/user-management-refactor.generated.json",
  "agent/state/admin-truth-sample-evidence.generated.json",
  "agent/state/admin-truth-source-sample.generated.json",
  "agent/state/regression-risk-high-blast-refresh.generated.json",
  "agent/state/ui-visual-smoke-minimal.generated.json",
  "agent/index/ui-surface-coverage.json",
  "scripts/agent/validate-ui-visual-smoke-minimal.ts",
  "scripts/agent/check-ui-surface-coverage.ts",
  "src/lib/evidence/ui-visual-smoke-contract.ts",
  "src/lib/frontend-hardening",
  "src/app/admin",
  "src/app/dashboard",
  "src/app/creators",
  "src/components",
] as const;

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function readReport() {
  const source = readRequired(PUBLIC_BETA_SCORE_REPORT_PATH);
  if (!source) {
    return null;
  }
  try {
    return JSON.parse(source) as PublicBetaScoreReport;
  } catch (error) {
    failures.push(`${PUBLIC_BETA_SCORE_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function validateEvidenceGate(gate: PublicBetaEvidenceGate, index: number) {
  for (const key of ["id", "label", "status", "detail", "recommendedAction"] as const) {
    if (typeof gate[key] !== "string" || gate[key].trim().length === 0) {
      failures.push(`evidenceGates[${index}].${key} must be a non-empty string.`);
    }
  }
  if (![
    "Ready",
    "Ready with smoke required",
    "Source validation only",
    "Source evidence required",
    "External proof required",
    "Needs review",
    "Blocked",
    "Unknown evidence",
    "Stale evidence",
    "Runtime unverified",
  ].includes(gate.status)) {
    failures.push(`evidenceGates[${index}].status is invalid.`);
  }
  requireNumber(gate.weight, `evidenceGates[${index}].weight`, 0, 100);
  requireNumber(gate.score, `evidenceGates[${index}].score`, 0, 100);
  requireNumber(gate.maxScore, `evidenceGates[${index}].maxScore`, 0, 100);
  requireNumber(gate.sourceCredit, `evidenceGates[${index}].sourceCredit`, 0, 100);
  requireNumber(gate.runtimeCredit, `evidenceGates[${index}].runtimeCredit`, 0, 100);
  requireNumber(gate.evidenceCredit, `evidenceGates[${index}].evidenceCredit`, 0, 100);
  requireNumber(gate.riskPenalty, `evidenceGates[${index}].riskPenalty`, 0, 100);
  requireNumber(gate.capImpact, `evidenceGates[${index}].capImpact`, 0, 100);
  if (!["high", "medium", "low", "none"].includes(String(gate.confidence))) {
    failures.push(`evidenceGates[${index}].confidence must be a v2 confidence state.`);
  }
  if (!["formal_passed", "formal_partial", "source_ready", "operator_reported", "stale", "missing", "unavailable", "failed", "owner_review"].includes(String(gate.evidenceQuality))) {
    failures.push(`evidenceGates[${index}].evidenceQuality must be a v2 evidence quality.`);
  }
  if (!["fresh", "stale", "missing", "unknown", "head_mismatch"].includes(String(gate.freshness))) {
    failures.push(`evidenceGates[${index}].freshness must be a v2 freshness state.`);
  }
  if (typeof gate.gateRequiredForExit !== "boolean") {
    failures.push(`evidenceGates[${index}].gateRequiredForExit must be boolean.`);
  }
  if (typeof gate.blocksLaunch !== "boolean") {
    failures.push(`evidenceGates[${index}].blocksLaunch must be boolean.`);
  }
  if (!Array.isArray(gate.evidence)) {
    failures.push(`evidenceGates[${index}].evidence must be an array.`);
  }
}

function validateFinding(finding: PublicBetaFinding, index: number) {
  for (const key of ["id", "domain", "category", "title", "severity", "filePath", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  requireNumber(finding.confidence, `findings[${index}].confidence`, 0, 1);
  requireNumber(finding.rawPenalty, `findings[${index}].rawPenalty`, 0, 100);
  requireNumber(finding.weightedPenalty, `findings[${index}].weightedPenalty`, 0, 200);
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    failures.push(`findings[${index}].evidence must be a non-empty array.`);
  }
  if (!Array.isArray(finding.docsBasis) || finding.docsBasis.length === 0) {
    failures.push(`findings[${index}].docsBasis must be a non-empty array.`);
  }
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  requireNumber(finding.autofixConfidence, `findings[${index}].autofixConfidence`, 0, 1);
}

const report = readReport();
if (report) {
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const version = classifyGeneratedArtifactFromGit({
    cwd: root,
    artifactPath: PUBLIC_BETA_SCORE_REPORT_PATH,
    artifactHead: report.currentHead,
    ownedSourcePaths: [...PUBLIC_BETA_SCORE_OWNED_INPUT_PATHS],
  });
  if (!isGeneratedArtifactCurrent(version)) {
    failures.push(`public beta score currentHead must match git HEAD (${headSha}) or an accepted generated artifact version.`);
  }
  requireNumber(report.scannerScore, "scannerScore", 0, 100);
  if (report.scoreVersion !== "beta_health_v2") {
    failures.push("scoreVersion must be beta_health_v2.");
  }
  for (const [key, value] of Object.entries({
    sourceHealthScore: report.sourceHealthScore,
    runtimeHealthScore: report.runtimeHealthScore,
    evidenceCompletenessScore: report.evidenceCompletenessScore,
    freshnessScore: report.freshnessScore,
    costRiskScore: report.costRiskScore,
    regressionRiskScore: report.regressionRiskScore,
    healthScore: report.healthScore,
  })) {
    requireNumber(value, key, 0, 100);
  }
  if (!["source_ready", "runtime_proven", "evidence_complete", "owner_review", "launch_ready", "blocked"].includes(String(report.launchGateStatus))) {
    failures.push("launchGateStatus must be a v2 launch gate status.");
  }
  if (!Array.isArray(report.launchBlockers)) {
    failures.push("launchBlockers must be an array.");
  }
  if (!Array.isArray(report.scoreDeltaDrivers) || report.scoreDeltaDrivers.length === 0) {
    failures.push("scoreDeltaDrivers must explain why the score changed.");
  }
  if (!Array.isArray(report.nuancedScoreExplanation) || report.nuancedScoreExplanation.length === 0) {
    failures.push("nuancedScoreExplanation must explain beta health v2 scoring.");
  }
  if (!report.healthScoreBreakdown || typeof report.healthScoreBreakdown !== "object") {
    failures.push("healthScoreBreakdown must be present.");
  }
  const healthDimensions = ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"];
  if (Object.keys(report.healthScoreBreakdown ?? {}).sort().join(",") !== healthDimensions.sort().join(",")) {
    failures.push("healthScoreBreakdown must keep the existing six beta health dimensions only.");
  }
  if (!report.studioDashboard || !Array.isArray(report.studioDashboard.sections)) {
    failures.push("studioDashboard.sections must summarize existing health and gate signals.");
  } else {
    const sectionLabels = report.studioDashboard.sections.map((section) => section.label);
    for (const expected of ["Audience Activity", "Runtime Confidence", "Source Quality", "Debug Signal", "Admin Hydration", "Evidence Gates"]) {
      if (!sectionLabels.includes(expected)) failures.push(`studioDashboard must include ${expected}.`);
    }
    for (const section of report.studioDashboard.sections) {
      requireNumber(section.score, `studioDashboard.${section.id}.score`, 0, 100);
      if (typeof section.detail !== "string" || section.detail.trim().length === 0) {
        failures.push(`studioDashboard.${section.id}.detail must be non-empty.`);
      }
      if (!["healthy", "watching", "needs_attention", "needs_proof"].includes(String(section.status))) {
        failures.push(`studioDashboard.${section.id}.status must be a Studio display status.`);
      }
    }
  }
  if (!report.launchClearance?.formalGates) {
    failures.push("launchClearance.formalGates must preserve compatibility gate status.");
  } else {
    const gates = report.launchClearance.formalGates;
    for (const key of ["providerSmoke", "deployedRuntimeSmoke", "adminTruthSample", "uiSurfaceCoverage"] as const) {
      if (typeof gates[key]?.cleared !== "boolean" || typeof gates[key]?.status !== "string" || typeof gates[key]?.source !== "string") {
        failures.push(`launchClearance.formalGates.${key} must include cleared, status, and source.`);
      }
    }
    if (RETIRED_UI_FORMAL_GATE_KEY in gates) {
      failures.push("launchClearance.formalGates must use uiSurfaceCoverage instead of the retired UI evidence gate.");
    }
    if (gates.paymentSourceOfFunds?.cleared !== false || gates.paymentSourceOfFunds.status !== "protected_not_evaluated_in_source_model") {
      failures.push("launchClearance must keep payment/source-of-funds protected outside the Studio source model.");
    }
  }
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.scannerStatus)) {
    failures.push("scannerStatus must be a valid public beta status.");
  }
  requireNumber(report.overallScore, "overallScore", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.overallStatus)) {
    failures.push("overallStatus must be a valid public beta status.");
  }
  if (![
    "Ready",
    "Ready with smoke required",
    "Source validation only",
    "Source evidence required",
    "External proof required",
    "Needs review",
    "Blocked",
    "Unknown evidence",
    "Stale evidence",
    "Runtime unverified",
  ].includes(report.readinessStatus)) {
    failures.push("readinessStatus must be an honest evidence-aware readiness status.");
  }
  if (typeof report.readinessStatusReason !== "string" || report.readinessStatusReason.trim().length === 0) {
    failures.push("readinessStatusReason must be non-empty.");
  }
  requireNumber(report.evidenceScore, "evidenceScore", 0, 100);
  if (!Array.isArray(report.evidenceGates) || report.evidenceGates.length === 0) {
    failures.push("evidenceGates must be a non-empty array.");
  } else {
    report.evidenceGates.forEach(validateEvidenceGate);
    if (report.evidenceGates.some((gate) => gate.id === RETIRED_UI_SCORE_GATE_ID)) {
      failures.push("UI visual source coverage must not be a Codex score evidence gate.");
    }
  }
  if (report.launchBlockers.some((blocker) => /visual|screenshot|manual smoke/iu.test(blocker))) {
    failures.push("Optional UI browser/screenshot reproduction must not block Codex source scoring.");
  }
  if (report.evidenceCapsApplied.some((cap) => /visual|screenshot|manual smoke|Visual QA required/iu.test(cap))) {
    failures.push("Optional UI browser/screenshot reproduction must not be a Codex evidence cap.");
  }
  if (!report.operatorFinalChecks?.uiVisualSurfaces) {
    failures.push("operatorFinalChecks.uiVisualSurfaces must keep UI source coverage visible.");
  } else {
    const visualChecklist = report.operatorFinalChecks.uiVisualSurfaces;
    if (visualChecklist.sourceChecksPassed !== true || visualChecklist.passedInCodex !== true) {
      failures.push("UI source coverage must be allowed to pass inside Codex.");
    }
    if (!visualChecklist.note.includes("source-reported UI issue")) {
      failures.push("UI source coverage must state browser reproduction is optional only for a source-reported UI issue.");
    }
    if (!Array.isArray(visualChecklist.surfaces) || visualChecklist.surfaces.length === 0) {
      failures.push("operator visual checklist must include tracked UI surfaces.");
    }
  }
  if (!Array.isArray(report.evidenceCapsApplied)) {
    failures.push("evidenceCapsApplied must be an array.");
  }
  if (!Array.isArray(report.evidenceCapDetails)) {
    failures.push("evidenceCapDetails must be an array.");
  } else if (report.evidenceCapDetails.length < report.evidenceCapsApplied.length) {
    failures.push("evidenceCapDetails must include at least every active evidence cap.");
  }
  if (!report.evidenceWeights || typeof report.evidenceWeights !== "object") {
    failures.push("evidenceWeights must be present.");
  }
  if (!report.scoreExplanation || typeof report.scoreExplanation !== "object") {
    failures.push("scoreExplanation must be present.");
  } else {
    requireIncludes(report.scoreExplanation.scannerScoreMeaning ?? "", "scanner-only", "scoreExplanation.scannerScoreMeaning");
    requireIncludes(report.scoreExplanation.sourcePassConfidence ?? "", "does not clear", "scoreExplanation.sourcePassConfidence");
    requireIncludes(report.scoreExplanation.evidenceScoreMeaning ?? "", "partial-credit", "scoreExplanation.evidenceScoreMeaning");
    if (/missing lanes score zero/iu.test(report.scoreExplanation.evidenceScoreMeaning ?? "")) {
      failures.push("scoreExplanation.evidenceScoreMeaning must not claim missing lanes simply score zero.");
    }
    if (report.scannerScore === 100 && /beta ready|readiness is ready/iu.test(report.scoreExplanation.scannerScoreMeaning ?? "")) {
      failures.push("scannerScore 100 must not be presented as beta readiness.");
    }
  }
  const costReadiness = report.costReadiness;
  if (!costReadiness || typeof costReadiness !== "object") {
    failures.push("costReadiness must be present.");
  } else {
    for (const key of ["cloudRunCostReadiness", "cloudSqlCostReadiness", "geminiCloudAssistCostReadiness", "route4xxReadiness"] as const) {
      const lane = costReadiness[key];
      if (!lane || typeof lane !== "object") {
        failures.push(`costReadiness.${key} must be present.`);
        continue;
      }
      if (typeof lane.status !== "string" || lane.status.length === 0) {
        failures.push(`costReadiness.${key}.status must be present.`);
      }
      if (lane.status === "pass" || lane.status === "passed") {
        failures.push("cost readiness lanes must not mark not-detected or source-only inventory as pass.");
      }
      if (!Array.isArray(lane.evidence) || lane.evidence.length === 0) {
        failures.push(`costReadiness.${key}.evidence must be present.`);
      }
    }
  }
  if (report.scannerScore === 100 && report.findings?.length === 0 && report.evidenceCapsApplied.length > 0) {
    if (report.overallScore >= 100 || report.overallStatus === "clean" || report.readinessStatus === "Ready") {
      failures.push("Zero scanner findings with missing evidence must not produce clean/Ready/100.");
    }
  }
  if (report.launchGateStatus === "launch_ready" && report.launchBlockers.length > 0) {
    failures.push("launch_ready cannot have launch blockers.");
  }
  if (
    report.launchGateStatus === "launch_ready"
    && report.evidenceGates.some((gate) => gate.gateRequiredForExit && gate.blocksLaunch)
  ) {
    failures.push("Required evidence gates that block launch cannot produce launch_ready.");
  }
  if (!report.domainScores || typeof report.domainScores !== "object") {
    failures.push("domainScores must be present.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
    const hasCritical = report.findings.some((finding) => finding.severity === "critical" && finding.confidence >= 0.85);
    if (hasCritical && report.overallStatus !== "fail") {
      failures.push("critical findings with confidence >= 0.85 must force overallStatus fail.");
    }
  }
  if (report.readinessStatus !== "Ready" && report.summary.includes("(clean)")) {
    failures.push("summary must not present evidence-capped readiness as clean.");
  }
  const hasEmptyDebugGate = report.evidenceGates?.some((gate) =>
    gate.id === "debugRuntimeEvidence" && gate.status === "Source evidence required");
  const hasSourceBackedDebugGate = report.evidenceGates?.some((gate) =>
    gate.id === "debugRuntimeEvidence"
    && (gate.status === "Ready" || gate.status === "Ready with smoke required")
    && (
      gate.evidence.join("\n").includes("source_ready_debug_runtime_evidence")
      || gate.evidence.join("\n").includes("debug_runtime_source_evidence")
      || gate.evidence.join("\n").includes("source_ready_event_translation_bridge")
      || gate.evidence.join("\n").includes("source_ready_person_metrics_hydration")
      || gate.evidence.join("\n").includes("source_ready_telemetry_trigger_test_matrix")
      || gate.evidence.join("\n").includes("source_ready_user_management_refactor")
    ));
  const debugEvidence = report.debugEvidence ?? {};
  const debugEvidenceEmpty = Object.values(debugEvidence).every((entries) => Array.isArray(entries) && entries.length === 0);
  if (debugEvidenceEmpty && !hasEmptyDebugGate && !hasSourceBackedDebugGate) {
    failures.push("Empty debugEvidence must be represented as Source evidence required.");
  }
  const debugRuntimeGate = report.evidenceGates?.find((gate) => gate.id === "debugRuntimeEvidence");
  if (
    (debugRuntimeGate?.status === "Ready" || debugRuntimeGate?.status === "Ready with smoke required")
    && debugRuntimeGate.evidence.join("\n").includes("launchGateImpact=does_not_clear_deployed_runtime_smoke") === false
  ) {
    failures.push("Source-backed debug runtime evidence must keep deployed route evidence gate separate.");
  }
  const runtimeProviderSmokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
  const operatorRevenueSmokeExists = existsSync(join(root, "agent/state/operator-revenue-smoke.generated.json"));
  if (!runtimeProviderSmokeGate) {
    failures.push("runtimeProviderSmoke gate must be present.");
  } else {
    const runtimeProviderEvidence = runtimeProviderSmokeGate.evidence.join("\n");
    requireIncludes(runtimeProviderEvidence, "providerArtifactStatus=", "runtimeProviderSmoke evidence");
    requireIncludes(runtimeProviderEvidence, "runtimeArtifactStatus=", "runtimeProviderSmoke evidence");
    if (
      runtimeProviderSmokeGate.status === "Ready"
      && /providerArtifactStatus=(operator_reported_not_formal_provider_smoke|missing_formal_evidence)/u.test(runtimeProviderEvidence)
    ) {
      failures.push("Provider smoke gate cannot be Ready when provider artifact is missing or operator-reported.");
    }
    if (
      runtimeProviderSmokeGate.status === "Ready"
      && /runtimeArtifactStatus=runtime_unverified/u.test(runtimeProviderEvidence)
    ) {
      failures.push("Runtime smoke gate cannot be Ready when runtime artifact is runtime_unverified.");
    }
    if (operatorRevenueSmokeExists) {
      requireIncludes(runtimeProviderEvidence, "operatorRevenueSmoke.status=operator_confirmed_revenue_smoke", "runtimeProviderSmoke evidence");
      requireIncludes(runtimeProviderEvidence, "operatorRevenueSmoke.amountUsdConfirmed=", "runtimeProviderSmoke evidence");
      requireIncludes(runtimeProviderEvidence, "operatorRevenueSmoke.providerBackedSiteActivityPassed=false", "runtimeProviderSmoke evidence");
      requireIncludes(runtimeProviderSmokeGate.detail.toLowerCase(), "provider-backed source activity evidence is still separate.", "runtimeProviderSmoke detail");
      if (runtimeProviderSmokeGate.status === "Ready") {
        failures.push("Operator-confirmed revenue smoke must not make runtimeProviderSmoke Ready.");
      }
    }
  }
  const adminTruthSamplesGate = report.evidenceGates.find((gate) => gate.id === "adminTruthSamples");
  if (!adminTruthSamplesGate) {
    failures.push("adminTruthSamples gate must be present.");
  } else {
    const adminTruthEvidence = adminTruthSamplesGate.evidence.join("\n");
    requireIncludes(adminTruthEvidence, "adminTruthSampleArtifactStatus=", "adminTruthSamples evidence");
    if (
      adminTruthSamplesGate.status === "Ready"
      && /adminTruthSampleArtifactStatus=missing_or_unknown/u.test(adminTruthEvidence)
    ) {
      failures.push("Admin truth samples cannot be Ready when artifact status is missing_or_unknown.");
    }
  }
  const targetedBehaviorGate = report.evidenceGates.find((gate) => gate.id === "targetedBehaviorTests");
  if (
    targetedBehaviorGate?.status === "Ready"
    && targetedBehaviorGate.evidence.join("\n").includes("targetedBehaviorArtifactStatus=missing_formal_evidence")
  ) {
    failures.push("Targeted behavior tests cannot be Ready when targeted artifact is missing.");
  }
  requireNumber(report.dedupedFindingCount, "dedupedFindingCount", 0, 10_000);
  requireNumber(report.safeAutofixesAvailable, "safeAutofixesAvailable", 0, 10_000);
  requireNumber(report.safeAutofixesApplied, "safeAutofixesApplied", 0, 10_000);
  if (!Array.isArray(report.recommendedNextActions)) {
    failures.push("recommendedNextActions must be an array.");
  }
  if (!Array.isArray(report.minimalVerificationCommands) || !report.minimalVerificationCommands.includes("npm run check:beta-score")) {
    failures.push("minimalVerificationCommands must include npm run check:beta-score.");
  }
  if (!Array.isArray(report.refreshPlan) || report.refreshPlan.length === 0) {
    failures.push("refreshPlan must be present on public beta score.");
  } else {
    const refreshPlanText = JSON.stringify(report.refreshPlan);
    requireIncludes(refreshPlanText, "npm run score:beta && npm run check:beta-score", "public beta score refreshPlan");
    requireIncludes(refreshPlanText, "agent/state/current-beta-exit-status.generated.json", "public beta score refreshPlan");
    requireIncludes(refreshPlanText, "agent/state/evidence-capture-status.generated.json", "public beta score refreshPlan");
    const hasStaleRefreshPlanEntry = report.refreshPlan.some((entry: unknown) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      return (entry as { needsRefresh?: unknown }).needsRefresh === true;
    });
    if (hasStaleRefreshPlanEntry) {
      requireIncludes(refreshPlanText, "Refresh this report from the latest code version", "public beta score refreshPlan");
    }
    if (/\bHEAD\b|currentHead/u.test(refreshPlanText)) {
      failures.push("public beta score refreshPlan user-facing messages must avoid raw source-control jargon.");
    }
  }
  if (!Array.isArray(report.staleArtifacts)) {
    failures.push("staleArtifacts must be present on public beta score.");
  } else if (report.staleArtifacts.some((entry) => {
    const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    return typeof record.nextAction !== "string" || record.nextAction.length === 0 || typeof record.refreshCommand !== "string";
  })) {
    failures.push("public beta score staleArtifacts must include nextAction and refreshCommand.");
  }
  if (!Array.isArray(report.exactRefreshCommands) || !report.exactRefreshCommands.includes("npm run score:beta && npm run check:beta-score")) {
    failures.push("exactRefreshCommands must include the beta score refresh command.");
  }
  if (!report.commandBudget?.forbiddenCommands?.includes("playwright")) {
    failures.push("commandBudget.forbiddenCommands must include playwright.");
  }
  if (report.commandBudget.allowedCommands.some((command) => /playwright|cypress|lighthouse/u.test(command))) {
    failures.push("Allowed default commands must not include Playwright, Cypress, or Lighthouse.");
  }
}

const scoreScript = readRequired("scripts/agent/score-public-beta-readiness.ts");
const repairScript = readRequired("scripts/agent/repair-public-beta-safe.ts");
const validatorScript = readRequired("scripts/agent/validate-public-beta-score.ts");
const core = readRequired("src/lib/agent-score/core.ts");
const weights = readRequired("src/lib/agent-score/weights.ts");
const reporting = readRequired("src/lib/agent-score/reporting.ts");
const autofix = readRequired("src/lib/agent-score/autofix.ts");
const scanner = readRequired("src/lib/agent-score/public-beta-scanner.ts");
const docs = readRequired("docs/agent-truth/public-beta-score.md");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");

for (const expected of [
  "agent/state/provider-smoke-evidence.generated.json",
  "agent/state/operator-revenue-smoke.generated.json",
  "agent/state/runtime-smoke-evidence.generated.json",
  "agent/state/admin-truth-sample-evidence.generated.json",
  "agent/state/targeted-behavior-evidence.generated.json",
]) {
  requireIncludes(scoreScript, expected, "score-public-beta-readiness evidence artifact readers");
}
const staleScoreTruthPatterns = [
  ["hasTargetedBehaviorEvidence:", " false"].join(""),
  ["function ", "hasProviderSmokeEvidence"].join(""),
  ["provider smoke", " missing"].join(""),
  ["provider-backed source activity evidence", " is missing"].join(""),
  ["hasAdminTruthSampleEvidence: ", "Object.values(debugEvidence)", ".some"].join(""),
  ["VISUAL_EVIDENCE_FILES", ".some"].join(""),
];
for (const forbidden of staleScoreTruthPatterns) {
  requireNotIncludes(scoreScript, forbidden, "score-public-beta-readiness stale score truth");
}
requireIncludes(core, "PublicBetaEvidenceArtifact", "Public beta score core");
requireIncludes(core, "evidenceArtifactPassed", "Public beta score core");
requireIncludes(core, "evidenceCapDetails", "Public beta score core");
requireIncludes(core, "scoreVersion: \"beta_health_v2\"", "Public beta score core");
requireIncludes(core, "sourceHealthScore", "Public beta score core");
requireIncludes(core, "runtimeHealthScore", "Public beta score core");
requireIncludes(core, "evidenceCompletenessScore", "Public beta score core");
requireIncludes(core, "launchGateStatus", "Public beta score core");
requireIncludes(core, "studioDashboard", "Public beta score core");
requireIncludes(core, "launchClearance", "Public beta score core");
requireIncludes(core, "scoreCostReadiness", "Public beta score core");
requireIncludes(core, "scoreRegressionRisk", "Public beta score core");
requireIncludes(core + weights, "PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS", "Public beta score math core");

for (const expected of [
  "PUBLIC_BETA_DOMAIN_WEIGHTS",
  "PUBLIC_BETA_EVIDENCE_WEIGHTS",
  "PUBLIC_BETA_SEVERITY_PENALTIES",
  "PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS",
  "buildPublicBetaScoreReport",
  "buildPublicBetaEvidenceGates",
  "dedupePublicBetaFindings",
  "readinessStatus",
  "critical",
]) {
  requireIncludes(core + weights, expected, "Public beta score math core");
}

for (const expected of [
  "buildSafeAutofixPlans",
  "assertAutofixGate",
  "autofixConfidence < 0.95",
  "src\\/lib\\/gumdrop-ledger\\.ts",
]) {
  requireIncludes(autofix, expected, "Public beta safe autofix gate");
}

for (const expected of [
  "collectPublicBetaFindings",
  "scanEconomy",
  "scanContentProtection",
  "scanTestingCoverage",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \\\"0px\\\"",
  "economics.bonusGumDrops, \\\"reward\\\"",
]) {
  requireIncludes(scanner, expected, "Public beta deterministic scanner");
}

for (const source of [scoreScript, repairScript, core, reporting, autofix, scanner]) {
  requireNotIncludes(source, "node:child_process", "Public beta score default path");
  requireNotIncludes(source, "execSync", "Public beta score default path");
  requireNotIncludes(source, "spawn(", "Public beta score default path");
}
requireNotIncludes(scoreScript + repairScript, "playwright", "Public beta score scripts");
requireNotIncludes(scoreScript + repairScript, "cypress", "Public beta score scripts");
requireNotIncludes(scoreScript + repairScript, "lighthouse", "Public beta score scripts");

const lowConfidenceFinding = {
  id: "test-low-confidence",
  domain: "layout",
  category: "viewport-unit",
  title: "Low confidence test",
  severity: "major",
  confidence: 0.9,
  blastRadius: "component",
  filePath: "src/components/Chat/ChatRouteShell.tsx",
  rawPenalty: 9,
  weightedPenalty: 9,
  canAutofix: true,
  autofixConfidence: 0.94,
  escalation: "test",
  evidence: ["test"],
  docsBasis: ["repo"],
} satisfies PublicBetaFinding;
const lowConfidencePlan = {
  findingId: "test-low-confidence",
  filePath: "src/components/Chat/ChatRouteShell.tsx",
  oldText: "100vh",
  newText: "100dvh",
  expectedOccurrences: 1,
  description: "test",
  confidence: 0.94,
} satisfies PublicBetaAutofixPlan;
if (!assertAutofixGate(lowConfidenceFinding, lowConfidencePlan, "height: 100vh;")) {
  failures.push("Autofix gate must refuse confidence below 0.95.");
}

const doctrineNote = "KandyDrops public beta scoring is deterministic and mathematical.";
for (const [label, source] of [
  ["public beta score doc", docs],
  ["README", readme],
  ["AGENTS", agents],
  ["FULL_SCALE_CODEBASE_AUDIT", auditLedger],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
for (const expected of [
  "\"score:beta\": \"tsx scripts/agent/score-public-beta-readiness.ts\"",
  "\"repair:beta\": \"tsx scripts/agent/repair-public-beta-safe.ts\"",
  "\"check:beta-score\": \"tsx scripts/agent/validate-public-beta-score.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}
requireIncludes(validatorScript, "commandBudget.forbiddenCommands", "Public beta score validator");
requireIncludes(validatorScript, "Zero scanner findings with missing evidence", "Public beta evidence-aware validator");

if (failures.length > 0) {
  console.error("Public beta score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public beta score validation passed.");
