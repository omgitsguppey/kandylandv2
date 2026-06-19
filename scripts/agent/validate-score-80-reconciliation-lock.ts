import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildScore80ReconciliationLock,
  validateScore80ReconciliationLock,
  type Score80ChangedFile,
  type Score80ChangedFileClassification,
  type Score80OpenPr,
  type Score80PrClassification,
  type Score80ReconciliationInput,
  type Score80ReconciliationLockReport,
} from "../../src/lib/agent-score/score-80-reconciliation-lock";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/score-80-reconciliation-lock.generated.json";
const DOC_PATH = "docs/agent-truth/score-80-reconciliation-lock.md";

function run(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function git(args: string[]) {
  return run("git", args);
}

function readJson(path: string): Record<string, unknown> | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function parseStatusPaths() {
  const status = git(["status", "--short"]);
  return status
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.replace(/^.. ?/u, "").replace(/\\/gu, "/"))
    .filter(Boolean);
}

function classifyChangedFile(path: string): Score80ChangedFile {
  const normalized = path.replace(/\\/gu, "/");
  let classification: Score80ChangedFileClassification = "unsafe_unknown";
  let reason = "";
  const retiredVisualEvidencePaths = new Set([
    "agent/evidence/admin-browser-surface-smoke/evidence.json",
    "agent/evidence/admin-browser-surface-smoke/template.json",
    "agent/evidence/ui-visual-smoke/README.md",
    "agent/evidence/ui-visual-smoke/template.json",
  ]);
  const validatorPaths = new Set([
    "scripts/agent/score-public-beta-readiness.ts",
    "scripts/agent/validate-admin-browser-surface-smoke.ts",
    "scripts/agent/validate-admin-debug-control-tower.ts",
    "scripts/agent/validate-analytics-semantics-final-lock.ts",
    "scripts/agent/validate-beta-evidence-gap-map.ts",
    "scripts/agent/validate-codex-visual-gate-removal.ts",
    "scripts/agent/validate-creator-dashboard-overview-stats.ts",
    "scripts/agent/validate-creator-dashboard-role-boundary.ts",
    "scripts/agent/validate-creator-drop-manager-mobile-refinement.ts",
    "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts",
    "scripts/agent/validate-creator-landing-dashboard-mobile.ts",
    "scripts/agent/validate-creator-nav-role-consolidation.ts",
    "scripts/agent/validate-creator-pricing-wiring.ts",
    "scripts/agent/validate-creator-profile-mobile-timeline.ts",
    "scripts/agent/validate-creator-settings-source-health.ts",
    "scripts/agent/validate-current-beta-exit-status.ts",
    "scripts/agent/validate-evidence-capture-status.ts",
    "scripts/agent/validate-final-phase-cleanup-lock.ts",
    "scripts/agent/validate-mobile-loading-hydration-stability.ts",
    "scripts/agent/validate-mobile-ui-final-lock.ts",
    "scripts/agent/validate-new-additions-score-coverage.ts",
    "scripts/agent/validate-overnight-beta-readiness-lock.ts",
    "scripts/agent/validate-public-beta-score.ts",
    "scripts/agent/validate-score-80-reconciliation-lock.ts",
    "scripts/agent/validate-ui-visual-smoke-minimal.ts",
    "scripts/agent/validate-user-creator-logic-cleanup.ts",
  ]);
  const sourcePaths = new Set([
    "src/lib/admin-analytics/panel-hydration-resolver.ts",
    "src/lib/agent-score/algorithmic-evidence-policy.ts",
    "src/lib/agent-score/core.ts",
    "src/lib/errors/error-dictionary.ts",
    "src/lib/evidence/admin-browser-surface-smoke-contract.ts",
    "src/lib/evidence/ui-visual-smoke-contract.ts",
    "src/lib/release-readiness/final-beta-exit-closure.ts",
    "src/lib/release-readiness/final-release-readiness.ts",
    "src/lib/release-readiness/live-evidence-gate-contract.ts",
    "src/lib/release-readiness/live-evidence-resolver.ts",
  ]);
  const testPaths = new Set([
    "tests/unit/admin-browser-surface-smoke.spec.ts",
    "tests/unit/analytics-semantics-final-lock.spec.ts",
    "tests/unit/current-beta-exit-status.spec.ts",
    "tests/unit/final-operator-evidence-needed.spec.ts",
    "tests/unit/final-release-exit-readiness-packet.spec.ts",
    "tests/unit/live-evidence-gate-replacement.spec.ts",
    "tests/unit/new-additions-score-coverage.spec.ts",
    "tests/unit/operator-final-qa-packet.spec.ts",
    "tests/unit/ui-visual-smoke-minimal.spec.ts",
  ]);

  if (normalized === "debug-output.json" || normalized === "git_diff.txt" || normalized === "git_log_output.txt") {
    classification = "deleted_obsolete_log";
    reason = "Deleted obsolete root log dump; logs do not belong in committed source truth.";
  } else if (retiredVisualEvidencePaths.has(normalized)) {
    classification = "deleted_obsolete_log";
    reason = "Deleted obsolete checked-in visual/browser evidence logs and templates; source coverage owns this gate now.";
  } else if (/^agent\/state\/.*\.generated\.json$/u.test(normalized)) {
    classification = "current_generated_artifact_to_commit";
    reason = "Generated score/debug evidence artifact refreshed by requested validators.";
  } else if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) {
    classification = "release_artifact_expected";
    reason = "Same-commit public beta release note artifact requested by this batch.";
  } else if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) {
    classification = "documentation_artifact_expected";
    reason = "Generated agent-truth documentation refreshed by requested score/debug validators.";
  } else if (normalized === "EVERY_FILE_FUNCTION_CHECKLIST.md") {
    classification = "documentation_artifact_expected";
    reason = "Removed obsolete root log dump entries from the file checklist.";
  } else if (validatorPaths.has(normalized) || normalized.startsWith("scripts/agent/") && normalized.endsWith(".ts")) {
    classification = "validator_artifact_expected";
    reason = "Scoped score/evidence validator updated for this score cleanup batch.";
  } else if (normalized === "tests/unit/score-80-reconciliation-lock.spec.ts"
    || normalized === "tests/unit/self-healing-refresh-queue.spec.ts"
    || normalized === "tests/unit/codex-visual-gate-removal.spec.ts"
    || normalized === "tests/unit/ui-visual-smoke-minimal.spec.ts"
    || normalized === "tests/unit/creator-dashboard-error-cost-inventory.spec.ts"
    || normalized === "tests/unit/creator-experiences-panel.spec.tsx"
    || normalized === "tests/unit/post-economy-creator-flow-qa.spec.ts"
    || normalized === "tests/unit/purchase-modal.spec.tsx"
    || normalized === "tests/unit/public-beta-score.spec.ts"
    || normalized === "tests/unit/final-behavioral-privacy-telemetry-lock.spec.ts"
    || normalized === "tests/unit/final-beta-exit-gate-readiness.spec.ts"
    || normalized === "tests/unit/real-usage-confidence-calibration.spec.ts"
    || normalized === "tests/unit/real-usage-confidence.spec.ts"
    || normalized === "tests/unit/runtime-smoke-substitute-matrix.spec.ts"
    || normalized === "tests/unit/regression-risk-high-blast-refresh.spec.ts"
    || testPaths.has(normalized)) {
    classification = "test_artifact_expected";
    reason = "Dedicated score/evidence unit coverage for this batch.";
  } else if (normalized === "src/lib/agent-score/score-80-reconciliation-lock.ts"
    || normalized === "src/lib/agent-score/self-healing-refresh-queue.ts"
    || normalized === "src/lib/agent-score/core.ts"
    || normalized === "src/lib/agent-score/weights.ts"
    || normalized === "src/lib/agent-score/algorithmic-evidence-policy.ts"
    || normalized === "src/lib/agent-score/evidence-quality.ts"
    || normalized === "src/lib/agent-score/formal-evidence-bridge.ts"
    || normalized === "src/lib/agent-score/regression-risk-refresh-plan.ts"
    || normalized === "src/lib/analytics/real-usage-confidence-calibration.ts"
    || normalized === "src/lib/analytics/real-usage-confidence-engine.ts"
    || normalized === "src/lib/evidence/ui-visual-smoke-contract.ts"
    || normalized === "src/lib/release-readiness/automated-truth-reconciliation.ts"
    || normalized === "src/lib/runtime/runtime-smoke-substitute-matrix.ts"
    || normalized === "package.json"
    || sourcePaths.has(normalized)) {
    classification = "real_source_change_needs_review";
    reason = "Scoped score/evidence source wiring required for this cleanup batch.";
  } else if (normalized.startsWith("agent/context/") || normalized.startsWith("agent/index/")) {
    classification = "unrelated_agent_context_file_to_ignore";
    reason = "Agent context output is not part of this lock unless explicitly staged.";
  } else if (normalized === "scripts/agent/validate-regression-risk-high-blast-refresh.ts") {
    classification = "validator_artifact_expected";
    reason = "Regression-risk source refresh classifier updated for this score cleanup batch.";
  }

  return { path: normalized, classification, reason };
}

function classifyOpenPr(pr: Record<string, unknown>): Score80OpenPr {
  const number = numberValue(pr.number);
  const title = stringValue(pr.title, "untitled");
  const url = stringValue(pr.url);
  const haystack = title.toLowerCase();
  let classification: Score80PrClassification = "unsafe_unknown";
  let reason = "";

  if (number === 278 || /duplicate computation|aggregation hotspot|performance/u.test(haystack)) {
    classification = "deferred_unrelated";
    reason = "Analytics performance branch is outside this score-80 reconciliation lock.";
  } else if (number === 277 || /package metadata|source-of-funds|gumdrop|payment/u.test(haystack)) {
    classification = "deferred_forbidden_surface";
    reason = "Payment/source-of-funds adjacent branch is intentionally deferred by hard-rule scope.";
  } else if (/debug|score|runtime|evidence/u.test(haystack)) {
    classification = "deferred_high_risk";
    reason = "Potentially related PR was not tiny enough to merge without direct debug-backed review.";
  }

  return { number, title, url, classification, reason };
}

function readOpenPrs(): Score80OpenPr[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return [{
      number: 0,
      title: "GitHub open PR evidence not queried",
      url: "",
      classification: "external_evidence_required",
      reason: "Live `gh pr list` is opt-in only. Set ALLOW_GH_PR_LIST=1 for an operator-approved external PR query; absence of this query cannot clear source, runtime, provider, or release gates.",
    }];
  }
  const raw = run("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,updatedAt,url",
  ]);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((entry) => classifyOpenPr(record(entry)))
      : [];
  } catch {
    return [{
      number: 0,
      title: "gh pr list parse failure",
      url: "",
      classification: "external_evidence_required",
      reason: "GitHub PR evidence could not be parsed. Treat as external evidence required instead of a source validation failure.",
    }];
  }
}

function readDimensions(score: Record<string, unknown> | null) {
  return {
    sourceHealth: numberValue(score?.sourceHealthScore),
    runtimeHealth: numberValue(score?.runtimeHealthScore),
    evidenceCompleteness: numberValue(score?.evidenceCompletenessScore),
    freshness: numberValue(score?.freshnessScore),
    costRisk: numberValue(score?.costRiskScore),
    regressionRisk: numberValue(score?.regressionRiskScore),
  };
}

function countQueueEntries(queue: Record<string, unknown> | null) {
  const entries = Array.isArray(queue?.queue) ? queue.queue.map(record) : [];
  return {
    totalEntries: entries.length,
    automaticEntries: entries.filter((entry) => entry.canRunAutomatically === true).length,
    blockedEntries: entries.filter((entry) => entry.canRunAutomatically === false).length,
  };
}

function countStaleSafeguards(report: Record<string, unknown> | null) {
  const entries = Array.isArray(report?.refreshPlan) ? report.refreshPlan.map(record) : [];
  const explicit = numberValue(report?.staleArtifactsNeedingAction, -1);
  if (explicit >= 0) return explicit;
  return entries.filter((entry) => entry.needsRefresh === true).length;
}

function renderDoc(report: Score80ReconciliationLockReport) {
  const section = (title: string, items: { label: string; proofType: string; nextAction: string }[]) => [
    `## ${title}`,
    "",
    ...(items.length
      ? items.map((item) => `- ${item.label}: ${item.proofType}; next=${item.nextAction}`)
      : ["- None."]),
    "",
  ];

  return [
    "# Score 80 Reconciliation Lock",
    "",
    "Status: score-80 path reconciled after AI critic, algorithmic evidence, real usage confidence, and runtime substitute matrix refinements. This lock does not mark beta exit ready or clear formal gates.",
    "",
    "## Summary",
    "",
    `- Previous score: ${report.previousScore}`,
    `- Current score: ${report.currentScore}`,
    `- Distance to 80: ${report.distanceTo80}`,
    `- Readiness status: ${report.readinessStatus}`,
    `- Can start beta exit review: ${report.canStartBetaExitReview}`,
    `- P0/P1/P2: ${report.p0Count}/${report.p1Count}/${report.p2Count}`,
    "",
    "## Dimensions",
    "",
    `- Source health: ${report.dimensions.sourceHealth}`,
    `- Runtime health: ${report.dimensions.runtimeHealth}`,
    `- Evidence completeness: ${report.dimensions.evidenceCompleteness}`,
    `- Freshness: ${report.dimensions.freshness}`,
    `- Cost risk: ${report.dimensions.costRisk}`,
    `- Regression risk: ${report.dimensions.regressionRisk}`,
    "",
    ...section("Algorithmic", report.remainingAlgorithmicItems),
    ...section("Runtime Required", report.remainingRuntimeRequiredItems),
    ...section("Provider Required", report.remainingProviderRequiredItems),
    ...section("Admin Truth", report.remainingAdminTruthItems),
    "## Ranked Next Actions",
    "",
    ...report.topNextActions.map((action) => `${action.rank}. ${action.label}: ${action.nextAction}`),
    "",
    "## Formal Gate Impact",
    "",
    `- Clears deployed runtime: ${report.formalGateImpact.clearsDeployedRuntime}`,
    `- Clears formal provider: ${report.formalGateImpact.clearsFormalProvider}`,
    `- Clears formal admin truth: ${report.formalGateImpact.clearsFormalAdminTruth}`,
    "",
    "## Dirty File Classification",
    "",
    ...(report.dirtyFiles.length
      ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}; ${file.reason}`)
      : ["- Clean at validator read time."]),
    "",
    "## Open PR Classification",
    "",
    ...(report.openPrs.length
      ? report.openPrs.map((pr) => `- #${pr.number} ${pr.title}: ${pr.classification}; ${pr.reason}`)
      : ["- No open PR evidence attached. This cannot clear PR/release gates."]),
    "",
  ].join("\n");
}

const score = readJson("agent/state/public-beta-score.generated.json");
const finalLock = readJson("agent/state/final-algorithmic-debug-lock.generated.json");
const aiTriage = readJson("agent/state/ai-critic-p1-triage.generated.json");
const runtimeMatrix = readJson("agent/state/runtime-smoke-substitute-matrix.generated.json");
const realUsage = readJson("agent/state/real-usage-confidence-calibration.generated.json");
const currentExit = readJson("agent/state/current-beta-exit-status.generated.json");
const refreshQueue = readJson("agent/state/self-healing-refresh-queue.generated.json");
const refreshSafeguards = readJson("agent/state/refresh-safeguards.generated.json");
const runtimeFormalGateImpact = record(runtimeMatrix?.formalGateImpact);
const realUsageFormalGateImpact = record(realUsage?.formalGateImpact);

const input: Score80ReconciliationInput = {
  generatedAtUtc: new Date().toISOString(),
  currentHead: git(["rev-parse", "HEAD"]),
  previousScore: numberValue(finalLock?.scoreAfter, numberValue(score?.overallScore ?? score?.healthScore)),
  currentScore: numberValue(score?.overallScore ?? score?.healthScore),
  dimensions: readDimensions(score),
  readinessStatus: stringValue(score?.readinessStatus, stringValue(record(currentExit?.summary).betaStatus, "unknown")),
  betaExitCanStart: booleanValue(record(currentExit?.summary).canStartBetaExitReview),
  aiCritic: {
    criticStatus: stringValue(aiTriage?.criticStatusAfter, stringValue(aiTriage?.criticStatus)),
    p0Count: numberValue(aiTriage?.p0Count),
    p1Count: numberValue(aiTriage?.p1Count),
    p2Count: numberValue(aiTriage?.p2Count),
  },
  runtimeMatrix: {
    formalRuntimeRequiredRows: numberValue(record(runtimeMatrix?.currentProofSummary).formalRuntimeRequiredRows),
    deployedRuntimeSmokeStillRequired: booleanValue(runtimeMatrix?.deployedRuntimeSmokeStillRequired, true),
    formalGateImpact: {
      clearsDeployedRuntime: booleanValue(runtimeFormalGateImpact.clearsDeployedRuntime),
      clearsFormalProvider: booleanValue(runtimeFormalGateImpact.clearsFormalProvider),
    },
  },
  realUsageConfidence: {
    status: stringValue(realUsage?.status),
    runtimeHealthCredit: numberValue(realUsage?.runtimeHealthCredit),
    formalGateImpact: {
      clearsFormalProvider: booleanValue(realUsageFormalGateImpact.clearsFormalProvider),
      clearsDeployedRuntime: booleanValue(realUsageFormalGateImpact.clearsDeployedRuntime),
    },
  },
  refreshQueue: countQueueEntries(refreshQueue),
  refreshSafeguards: {
    staleArtifactsNeedingAction: countStaleSafeguards(refreshSafeguards),
  },
  dirtyFiles: parseStatusPaths().map(classifyChangedFile),
  openPrs: readOpenPrs(),
};

const report = buildScore80ReconciliationLock(input);
const validationFailures = validateScore80ReconciliationLock(report);
const output = {
  ...report,
  status: validationFailures.length > 0 ? "blocked_reconciliation_lock" as const : report.status,
  validationFailures,
};

write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
write(DOC_PATH, renderDoc(output));

if (validationFailures.length > 0) {
  console.error("Score 80 reconciliation lock failed:");
  for (const failure of validationFailures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Score 80 reconciliation lock OK: score=${output.currentScore}, distanceTo80=${output.distanceTo80}, p1=${output.p1Count}, p2=${output.p2Count}.`,
);
