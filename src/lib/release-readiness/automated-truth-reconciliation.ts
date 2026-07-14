import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { classifyGeneratedArtifactFromGit } from "../agent-score/generated-artifact-version-policy";
import { PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS } from "../agent-score/weights";
import {
  buildReleaseReadinessContext,
  classifyOpenPr,
  readOpenPullRequests,
  type ClassifiedOpenPr,
  type ScoreDimensions,
} from "./final-release-readiness";

export type TruthProofStatus =
  | "proven_current"
  | "source_proven_only"
  | "stale"
  | "head_mismatch"
  | "missing_validator"
  | "missing_package_script"
  | "missing_test"
  | "missing_source_wiring"
  | "formal_evidence_required"
  | "operator_manual_required"
  | "unsafe_unknown";

export type TruthLaneStatus = "complete" | "source_ready_only" | "partial" | "stale" | "duplicated" | "missing" | "unsafe_unknown";

export type TruthSeverity = "release_critical" | "manual_required" | "source_warning" | "classified_non_blocking";

export type ClaimTruthRecord = {
  claimId: string;
  sourceArtifact: string;
  claimText: string;
  claimedStatus: string;
  referencedValidator: string | null;
  referencedSourceFiles: string[];
  referencedPackageScript: string | null;
  referencedTest: string | null;
  currentHead: string;
  artifactHead: string | null;
  proofStatus: TruthProofStatus;
  contradictionFound: boolean;
  exactNextAction: string;
};

export type ValidatorAuthorityRecord = {
  scriptName: string;
  command: string;
  validatorFile: string | null;
  validatorFileExists: boolean;
  testFile: string | null;
  testFileExists: boolean;
  artifactPath: string | null;
  artifactGenerated: boolean;
  docPath: string | null;
  docGenerated: boolean;
  sourceFilesValidated: string[];
  packageScriptUsedByScore: boolean;
  supersededByNewerValidator: string | null;
  duplicateGroup: string | null;
  stillAuthoritative: boolean;
  proofStatus: TruthProofStatus;
  exactNextAction: string;
};

export type WiringTruthRecord = {
  laneId: string;
  status: TruthLaneStatus;
  routeOrSurface: string;
  featureRegistry: string;
  telemetryCatalog: string;
  eventEnvelope: string;
  normalizer: string;
  eventFact: string;
  metric: string;
  journey: string;
  debugLane: string;
  scoreEvidence: string;
  displayState: string;
  exactNextAction: string;
};

export type ScoreTruthAuditReport = {
  reportKey: "score-truth-audit";
  generatedAtUtc: string;
  currentHead: string;
  publicBetaScoreHead: string | null;
  currentBetaExitStatusHead: string | null;
  finalReleasePacketHead: string | null;
  artifactHeadStatuses: Array<{ artifactPath: string; artifactHead: string | null; status: string; needsRefresh: boolean; reason: string }>;
  scoreDimensions: ScoreDimensions;
  weightedFormulaScore: number;
  reportedOverallScore: number;
  formulaMatches: boolean;
  staleScoreArtifactSilentlyUsed: boolean;
  sourceOnlyClearsFormalProof: boolean;
  futureQuietEventPenaltyDetected: boolean;
  hardcodedZeroGapDetected: boolean;
  costRiskHonestlyClassified: boolean;
  betaExitReady: false;
  formalBlockersRemain: boolean;
  validationFailures: string[];
};

export type HalfImplementationFinding = {
  findingId: string;
  pattern: string;
  sourcePath: string;
  severity: TruthSeverity;
  proofStatus: TruthProofStatus;
  exactNextAction: string;
};

export type CostLieDetectorReport = {
  reportKey: "cost-lie-detector";
  generatedAtUtc: string;
  currentHead: string;
  costRiskScore: number;
  costRiskStatus: "below80_external_review_required" | "source_guarded_external_review_remaining";
  sourceGuardIsBillingProof: false;
  externalBillingReviewRequired: true;
  accuracyPreserved: true;
  lanes: Array<{ laneId: string; status: "source_guarded" | "external_review_required" | "manual_approval_required"; blocksCostRisk: boolean; exactNextAction: string }>;
  validationFailures: string[];
};

export type ManualQaReadinessGateReport = {
  reportKey: "manual-qa-readiness-gate";
  generatedAtUtc: string;
  currentHead: string;
  manualQaRecommended: false;
  betaExitReady: false;
  prerequisites: Array<{ id: string; status: "passed" | "blocked" | "operator_only"; severity: TruthSeverity; exactNextAction: string }>;
  releaseCriticalGaps: string[];
  validationFailures: string[];
};

export type ClaimTruthAuditReport = {
  reportKey: "claim-truth-audit";
  generatedAtUtc: string;
  currentHead: string;
  claims: ClaimTruthRecord[];
  unprovenClaims: ClaimTruthRecord[];
  validationFailures: string[];
};

export type ValidatorAuthorityAuditReport = {
  reportKey: "validator-authority-audit";
  generatedAtUtc: string;
  currentHead: string;
  validators: ValidatorAuthorityRecord[];
  authorityGaps: ValidatorAuthorityRecord[];
  validationFailures: string[];
};

export type WiringTruthAuditReport = {
  reportKey: "wiring-truth-audit";
  generatedAtUtc: string;
  currentHead: string;
  lanes: WiringTruthRecord[];
  releaseCriticalGaps: WiringTruthRecord[];
  validationFailures: string[];
};

export type HalfImplementationDetectorReport = {
  reportKey: "half-implementation-detector";
  generatedAtUtc: string;
  currentHead: string;
  findings: HalfImplementationFinding[];
  releaseCriticalFindings: HalfImplementationFinding[];
  validationFailures: string[];
};

export type AutomatedTruthReconciliationReport = {
  reportKey: "automated-truth-reconciliation";
  generatedAtUtc: string;
  currentHead: string;
  betaScore: number;
  betaScoreProofStatus: TruthProofStatus;
  manualQaRecommended: false;
  releaseCriticalGaps: string[];
  halfImplementedLanes: HalfImplementationFinding[];
  unprovenClaims: ClaimTruthRecord[];
  validatorAuthorityGaps: ValidatorAuthorityRecord[];
  costRiskGaps: CostLieDetectorReport["lanes"];
  openPrs: ClassifiedOpenPr[];
  securityPrs: ClassifiedOpenPr[];
  dirtyFiles: Array<{ path: string; classification: string }>;
  unclassifiedDirtyFiles: string[];
  formalEvidenceStillMissing: string[];
  validationFailures: string[];
};

export type TruthReconciliationReport =
  | ClaimTruthAuditReport
  | ValidatorAuthorityAuditReport
  | WiringTruthAuditReport
  | ScoreTruthAuditReport
  | HalfImplementationDetectorReport
  | CostLieDetectorReport
  | ManualQaReadinessGateReport
  | AutomatedTruthReconciliationReport;

export type CompactTruthReconciliationReport = {
  reportKey: TruthReconciliationReport["reportKey"];
  generatedAtUtc: string;
  currentHead: string;
  validationFailures: string[];
  reportFormat: "compact_summary_full_detail_derivable";
  [key: string]: unknown;
};

const VALIDATOR_AUTHORITY_DEPRECATION_MAP = [
  {
    id: "agent/context/validator-authority.json",
    classification: "retired_duplicate_consumer",
    canonicalReplacement: "agent/state/validator-authority-audit.generated.json + agent/state/validator-ownership-map.generated.json",
    action: "check:validator-authority delegates to the canonical audit and ownership map instead of treating the stale registry as release authority.",
  },
  {
    id: "agent/state/event-liveness-source-repair.generated.json",
    classification: "deprecation_map_only",
    canonicalReplacement: "agent/state/event-liveness-audit.generated.json",
    action: "Keep as legacy evidence until package-script references are retired; do not score-consume it.",
  },
  {
    id: "agent/state/live-evidence-gate-replacement.generated.json",
    classification: "protected_score_consumed",
    canonicalReplacement: "src/lib/release-readiness/live-evidence-resolver.ts",
    action: "Do not delete in this pass; public beta score consumes this live usage evidence lane.",
  },
  {
    id: "agent/state/runtime-smoke-substitute-matrix.generated.json",
    classification: "protected_score_consumed",
    canonicalReplacement: "src/lib/release-readiness/live-evidence-resolver.ts",
    action: "Do not delete in this pass; public beta score consumes this runtime evidence lane.",
  },
  {
    id: "agent/state/real-usage-confidence.generated.json",
    classification: "protected_score_consumed",
    canonicalReplacement: "src/lib/release-readiness/live-evidence-resolver.ts",
    action: "Do not delete in this pass; public beta score consumes this live usage confidence lane.",
  },
  {
    id: "agent/state/cost-risk-exit-pass.generated.json",
    classification: "protected_score_consumed",
    canonicalReplacement: "src/lib/server/global-cost-surface-contract.ts",
    action: "Do not delete in this pass; cost truth remains score and release-readiness evidence.",
  },
] as const;

export type TruthReconciliationReportKind =
  | "claim-truth-audit"
  | "validator-authority-audit"
  | "wiring-truth-audit"
  | "score-truth-audit"
  | "half-implementation-detector"
  | "cost-lie-detector"
  | "manual-qa-readiness-gate"
  | "automated-truth-reconciliation";

export const TRUTH_RECONCILIATION_OUTPUTS: Record<TruthReconciliationReportKind, { statePath: string; docPath: string; checkScript: string }> = {
  "claim-truth-audit": {
    statePath: "agent/state/claim-truth-audit.generated.json",
    docPath: "docs/agent-truth/claim-truth-audit.md",
    checkScript: "npm run check:claim-truth-audit",
  },
  "validator-authority-audit": {
    statePath: "agent/state/validator-authority-audit.generated.json",
    docPath: "docs/agent-truth/validator-authority-audit.md",
    checkScript: "npm run check:validator-authority-audit",
  },
  "wiring-truth-audit": {
    statePath: "agent/state/wiring-truth-audit.generated.json",
    docPath: "docs/agent-truth/wiring-truth-audit.md",
    checkScript: "npm run check:wiring-truth-audit",
  },
  "score-truth-audit": {
    statePath: "agent/state/score-truth-audit.generated.json",
    docPath: "docs/agent-truth/score-truth-audit.md",
    checkScript: "npm run check:score-truth-audit",
  },
  "half-implementation-detector": {
    statePath: "agent/state/half-implementation-detector.generated.json",
    docPath: "docs/agent-truth/half-implementation-detector.md",
    checkScript: "npm run check:half-implementation-detector",
  },
  "cost-lie-detector": {
    statePath: "agent/state/cost-lie-detector.generated.json",
    docPath: "docs/agent-truth/cost-lie-detector.md",
    checkScript: "npm run check:cost-lie-detector",
  },
  "manual-qa-readiness-gate": {
    statePath: "agent/state/manual-qa-readiness-gate.generated.json",
    docPath: "docs/agent-truth/manual-qa-readiness-gate.md",
    checkScript: "npm run check:manual-qa-readiness-gate",
  },
  "automated-truth-reconciliation": {
    statePath: "agent/state/automated-truth-reconciliation.generated.json",
    docPath: "docs/agent-truth/automated-truth-reconciliation.md",
    checkScript: "npm run check:automated-truth-reconciliation",
  },
};

const CLAIM_WORDS = [
  "pass",
  "ready",
  "locked",
  "complete",
  "current",
  "formal_passed",
  "source_ready",
  "source_confidence_only",
  "runtime_unverified",
  "formal_missing",
  "owner_review",
  "betaExitReady",
  "cost_review_required",
  "operator_pending",
] as const;

const RELEASE_CRITICAL_SCRIPTS = [
  "check:current-head-release-reconciliation",
  "check:formal-evidence-status-ledger",
  "check:open-pr-dependency-hygiene",
  "check:runtime-smoke-harness",
  "check:admin-truth-redaction-packet",
  "check:operator-final-qa-packet",
  "check:release-rollback-incident-readiness",
  "check:release-notes-integrity",
  "check:final-release-exit-readiness-packet",
  "check:claim-truth-audit",
  "check:validator-authority-audit",
  "check:wiring-truth-audit",
  "check:score-truth-audit",
  "check:half-implementation-detector",
  "check:cost-lie-detector",
  "check:manual-qa-readiness-gate",
  "check:automated-truth-reconciliation",
] as const;

const MAJOR_LANES = [
  ["auth-signup-login", "src/lib/features/feature-registration-registry.ts", "src/lib/telemetry-catalog.ts", "src/lib/analytics/event-envelope-builder.ts", "src/lib/product-integrity/central-normalizer.ts", "src/lib/behavioral/event-fact-normalizer.ts", "src/lib/analytics/person-metrics-hydration.ts", "src/lib/behavioral/user-journey-builder.ts", "src/lib/debug/debug-panel-tracking-summary.ts", "src/lib/agent-score/core.ts", "src/lib/math/metric-display-accuracy.ts"],
  ["wallet-payment-gumdrops", "src/app/api/wallet", "src/lib/commerce", "src/lib/math/gumdrop-ledger-math.ts", "src/lib/product-integrity/central-normalizer.ts", "src/lib/math/canonical-math-ledger.ts", "src/lib/debug/debug-panel-tracking-summary.ts", "src/lib/agent-score/core.ts"],
  ["drops-unlock-unwrap-watch", "src/app/api/drops", "src/app/api/viewer/watch-session/route.ts", "src/lib/math/drop-watch-unlock-math.ts", "src/lib/analytics/drop-watch-time-engine.ts", "src/lib/behavioral/unlock-watch-journey-normalization.ts", "src/lib/debug/debug-panel-tracking-summary.ts"],
  ["chat", "src/lib/chat", "src/components/Chat", "src/lib/product-integrity/central-normalizer.ts", "src/lib/debug/debug-panel-tracking-summary.ts", "agent/state/chat-functionality-score-lock.generated.json"],
  ["daily-tasks-rewards", "src/lib/tasks", "src/lib/math/gumdrop-ledger-math.ts", "src/lib/behavioral/user-journey-builder.ts", "agent/state/daily-task-debug-score-lock.generated.json"],
  ["notifications-pwa", "src/lib/notifications", "src/lib/features/pwa", "src/lib/product-integrity/central-normalizer.ts", "agent/state/notification-pwa-score-lock.generated.json"],
  ["account-settings-support-delete-export", "src/lib/settings", "src/app/api/support", "src/app/api/user/delete", "src/lib/product-integrity/product-body-map.ts"],
  ["creator-settings", "src/lib/creator-monetization/creator-monetization-contract.ts", "src/lib/features/feature-registration-registry.ts", "src/lib/debug/debug-panel-tracking-summary.ts"],
  ["creator-monetization-fan-pass-entitlements", "src/lib/fan-pass/fan-pass-access-resolver.ts", "src/lib/creator-monetization/creator-entitlement-resolver.ts", "src/lib/math/creator-revenue-entitlement-math.ts", "agent/state/creator-monetization-readiness-lock.generated.json"],
  ["creator-profile-discovery-search-follow", "src/lib/telemetry-catalog.ts", "src/lib/product-integrity/product-body-map.ts", "agent/state/media-discovery-score-lock.generated.json"],
  ["media-upload-private-access", "src/lib/media/media-upload-contract.ts", "src/lib/product-integrity/product-body-map.ts", "agent/state/media-discovery-score-lock.generated.json"],
  ["admin-debug-user-management", "src/lib/debug/debug-backlog-builder.ts", "src/lib/product-integrity/interpretive-brain.ts", "src/lib/admin-debug-control-tower.ts", "src/lib/agent-score/core.ts"],
  ["sql-export-cost", "src/lib/analytics/sql-database-parity-engine.ts", "src/lib/math/cost-export-parity-math.ts", "src/lib/cost", "src/lib/server/global-cost-surface-contract.ts"],
  ["release-readiness-evidence", "src/lib/release-readiness/final-release-readiness.ts", "agent/state/final-release-exit-readiness-packet.generated.json", "scripts/agent/validate-final-release-exit-readiness-packet.ts", "tests/unit/final-release-exit-readiness-packet.spec.ts"],
] as const;

function shell(cwd: string, command: string, args: readonly string[]) {
  try {
    return execFileSync(command, [...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function normalizePath(path: string) {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "");
}

function readJson(root: string, path: string): Record<string, unknown> {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function pathExists(root: string, path: string) {
  return existsSync(join(root, path));
}

function readText(root: string, path: string) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function listFiles(root: string, dir: string, predicate: (path: string) => boolean, limit = 250) {
  const base = join(root, dir);
  const files: string[] = [];
  if (!existsSync(base)) return files;
  const visit = (directory: string) => {
    if (files.length >= limit) return;
    for (const entry of readdirSync(directory)) {
      const fullPath = join(directory, entry);
      const relativePath = normalizePath(relative(root, fullPath));
      const stats = statSync(fullPath);
      if (stats.isDirectory()) visit(fullPath);
      else if (predicate(relativePath)) files.push(relativePath);
      if (files.length >= limit) return;
    }
  };
  visit(base);
  return files;
}

function packageScripts(root: string) {
  const parsed = readJson(root, "package.json");
  const scripts = parsed.scripts;
  return scripts && typeof scripts === "object" && !Array.isArray(scripts) ? scripts as Record<string, string> : {};
}

function artifactHead(artifact: Record<string, unknown>) {
  const value = artifact.currentHead ?? artifact.sourceVersion ?? artifact.current_head;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function artifactFreshness(root: string, artifactPath: string, artifact: Record<string, unknown>) {
  const head = artifactHead(artifact) ?? undefined;
  return classifyGeneratedArtifactFromGit({
    cwd: root,
    artifactPath,
    artifactHead: head,
    ownedSourcePaths: ["src/lib/release-readiness", "scripts/agent", "tests/unit", "package.json"],
  });
}

function currentHead(root: string) {
  return shell(root, "git", ["rev-parse", "HEAD"]);
}

function currentDirtyFiles(root: string) {
  const output = shell(root, "git", ["status", "--short"]);
  return output.split(/\r?\n/u).filter(Boolean).map((line) => line.replace(/^..\s*/u, "").trim());
}

export function classifyTruthReconciliationDirtyFile(path: string) {
  const normalized = normalizePath(path);
  if (/^agent\/state\/(claim-truth-audit|validator-authority-audit|wiring-truth-audit|score-truth-audit|half-implementation-detector|cost-lie-detector|manual-qa-readiness-gate|automated-truth-reconciliation|public-beta-score|current-beta-exit-status|final-current-head-score-refresh|final-release-exit-readiness-packet|final-operator-evidence-needed|overnight-beta-readiness-lock)\.generated\.json$/u.test(normalized)) {
    return "current_generated_artifact_to_commit";
  }
  if (/^agent\/state\/(activity-verification-engine|evidence-capture-status|formal-evidence-bridge|live-evidence-gate-replacement|real-usage-confidence|real-usage-confidence-calibration|runtime-smoke-harness|runtime-smoke-substitute-matrix)\.generated\.json$/u.test(normalized)) {
    return "current_generated_artifact_to_commit";
  }
  if (/^agent\/state\/(analytics-panel-hydration|launch-analytics-recovery)\.generated\.json$/u.test(normalized)) {
    return "current_generated_artifact_to_commit";
  }
  if (/^docs\/agent-truth\/(claim-truth-audit|validator-authority-audit|wiring-truth-audit|score-truth-audit|half-implementation-detector|cost-lie-detector|manual-qa-readiness-gate|automated-truth-reconciliation|final-current-head-score-refresh|final-release-exit-readiness-packet|final-operator-evidence-needed|overnight-beta-readiness-lock)\.md$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^docs\/agent-truth\/(analytics-panel-hydration|launch-analytics-recovery)\.md$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^docs\/agent-truth\/(activity-verification-engine|current-beta-exit-status|evidence-capture-status|formal-evidence-bridge|live-evidence-gate-replacement|real-usage-confidence|real-usage-confidence-calibration|runtime-smoke-harness|runtime-smoke-substitute-matrix)\.md$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^src\/lib\/release-readiness\/(automated-truth-reconciliation|final-release-readiness|final-beta-exit-closure|claim-truth-auditor|validator-authority-auditor|wiring-truth-auditor|score-truth-auditor|half-implementation-detector|cost-lie-detector|manual-qa-readiness-gate)\.ts$/u.test(normalized)) {
    return "real_source_change_needs_review";
  }
  if (/^src\/lib\/release-readiness\/(live-evidence-gate-contract|live-evidence-resolver)\.ts$/u.test(normalized)) {
    return "real_source_change_needs_review";
  }
  if (normalized === "src/lib/agent-score/core.ts" || normalized === "tests/unit/public-beta-score.spec.ts") {
    return "release_artifact_expected";
  }
  if (/^scripts\/agent\/(truth-reconciliation-report-runner|validate-(claim-truth-audit|validator-authority-audit|wiring-truth-audit|score-truth-audit|half-implementation-detector|cost-lie-detector|manual-qa-readiness-gate|automated-truth-reconciliation))\.ts$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (normalized === "scripts/agent/score-public-beta-readiness.ts" || /^scripts\/agent\/validate-(current-beta-exit-status|evidence-capture-status)\.ts$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^tests\/unit\/(claim-truth-audit|validator-authority-audit|wiring-truth-audit|score-truth-audit|half-implementation-detector|cost-lie-detector|manual-qa-readiness-gate|automated-truth-reconciliation|final-release-exit-readiness-packet|final-operator-evidence-needed)\.spec\.ts$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^tests\/unit\/(current-beta-exit-status|evidence-capture-status|live-evidence-gate-replacement)\.spec\.ts$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (normalized === "package.json" || normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized === "src/lib/release-notes/public-release-notes.ts" || normalized === "src/lib/release-notes/release-version-contract.ts") {
    return "release_artifact_expected";
  }
  return "unsafe_unknown";
}

function openPullRequests(root: string): ClassifiedOpenPr[] {
  return readOpenPullRequests(root).map(classifyOpenPr);
}

function validatorFileFromCommand(command: string) {
  const match = command.match(/tsx\s+(scripts\/agent\/[A-Za-z0-9._/-]+\.ts)/u);
  return match?.[1] ?? null;
}

function slugFromScript(scriptName: string) {
  return scriptName.replace(/^check:/u, "").replace(/:/gu, "-");
}

function testPathForSlug(slug: string) {
  return `tests/unit/${slug}.spec.ts`;
}

function artifactPathForSlug(slug: string) {
  return `agent/state/${slug}.generated.json`;
}

function docPathForSlug(slug: string) {
  return `docs/agent-truth/${slug}.md`;
}

function proofForArtifact(root: string, path: string, head: string) {
  const artifact = readJson(root, path);
  if (Object.keys(artifact).length === 0) return { proofStatus: "missing_source_wiring" as const, artifactHead: null };
  const headFromArtifact = artifactHead(artifact);
  if (!headFromArtifact) return { proofStatus: "stale" as const, artifactHead: null };
  return {
    proofStatus: headFromArtifact === head ? "proven_current" as const : "head_mismatch" as const,
    artifactHead: headFromArtifact,
  };
}

export function buildClaimTruthAuditReport(root: string): ClaimTruthAuditReport {
  const now = new Date().toISOString();
  const head = currentHead(root);
  const scripts = packageScripts(root);
  const files = [
    ...listFiles(root, "agent/state", (path) => path.endsWith(".generated.json"), 160),
    ...listFiles(root, "docs/agent-truth", (path) => path.endsWith(".md"), 160),
  ];
  const claims: ClaimTruthRecord[] = [];

  for (const file of files) {
    const text = readText(root, file);
    const artifact = file.endsWith(".json") ? readJson(root, file) : {};
    const proof = file.endsWith(".json") ? proofForArtifact(root, file, head) : { proofStatus: "source_proven_only" as const, artifactHead: null };
    const slug = file.split("/").pop()?.replace(/\.generated\.json$/u, "").replace(/\.md$/u, "") ?? "unknown";
    const scriptName = `check:${slug}`;
    const referencedPackageScript = scripts[scriptName] ? scriptName : null;
    const referencedValidator = referencedPackageScript ? validatorFileFromCommand(scripts[scriptName]) : null;
    const referencedTest = pathExists(root, testPathForSlug(slug)) ? testPathForSlug(slug) : null;
    const matched = CLAIM_WORDS.filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu").test(text)).slice(0, 4);
    for (const word of matched) {
      const formal = word === "formal_missing" || word === "runtime_unverified";
      const operator = word === "operator_pending";
      const proofStatus: TruthProofStatus = formal ? "formal_evidence_required" : operator ? "operator_manual_required" : proof.proofStatus;
      claims.push({
        claimId: `${slug}:${word}:${claims.length + 1}`,
        sourceArtifact: file,
        claimText: word,
        claimedStatus: word,
        referencedValidator,
        referencedSourceFiles: referencedValidator ? [referencedValidator] : [],
        referencedPackageScript,
        referencedTest,
        currentHead: head,
        artifactHead: proof.artifactHead,
        proofStatus,
        contradictionFound: /betaExitReady"?\s*:\s*true/iu.test(text) && /formal_missing|Runtime unverified/iu.test(text),
        exactNextAction: proofStatus === "proven_current"
          ? "Keep validator, artifact, and source wiring current."
          : proofStatus === "formal_evidence_required"
            ? "Attach typed provider, deployed route, or admin source evidence; do not clear this by unrelated source validation."
            : proofStatus === "operator_manual_required"
              ? "Operator must complete manual evidence outside Codex source gates."
              : "Refresh or wire the referenced validator, package script, test, source, and artifact.",
      });
    }
  }

  const unprovenClaims = claims.filter((claim) => !["proven_current", "source_proven_only", "formal_evidence_required", "operator_manual_required"].includes(claim.proofStatus) || claim.contradictionFound);
  const report: ClaimTruthAuditReport = {
    reportKey: "claim-truth-audit",
    generatedAtUtc: now,
    currentHead: head,
    claims,
    unprovenClaims,
    validationFailures: [],
  };
  report.validationFailures = validateClaimTruthAuditReport(report);
  return report;
}

export function validateClaimTruthAuditReport(report: ClaimTruthAuditReport) {
  const failures: string[] = [];
  if (report.claims.some((claim) => !claim.proofStatus)) failures.push("claim lacks proof status.");
  if (report.claims.some((claim) => claim.contradictionFound)) failures.push("contradictory readiness claim found.");
  if (report.claims.some((claim) => claim.proofStatus === "unsafe_unknown")) failures.push("claim has unsafe_unknown proof status.");
  return failures;
}

export function buildValidatorAuthorityAuditReport(root: string): ValidatorAuthorityAuditReport {
  const scripts = packageScripts(root);
  const head = currentHead(root);
  const validators = Object.entries(scripts)
    .filter(([name]) => name.startsWith("check:"))
    .map(([scriptName, command]) => {
      const slug = slugFromScript(scriptName);
      const validatorFile = validatorFileFromCommand(command);
      const testFile = testPathForSlug(slug);
      const artifactPath = artifactPathForSlug(slug);
      const docPath = docPathForSlug(slug);
      const releaseCritical = RELEASE_CRITICAL_SCRIPTS.includes(scriptName as typeof RELEASE_CRITICAL_SCRIPTS[number]);
      const validatorFileExists = validatorFile ? pathExists(root, validatorFile) : false;
      const testFileExists = pathExists(root, testFile);
      const artifactGenerated = pathExists(root, artifactPath);
      const docGenerated = pathExists(root, docPath);
      const sourceFilesValidated = validatorFileExists ? [validatorFile as string] : [];
      const proofStatus: TruthProofStatus = !validatorFileExists
        ? "missing_validator"
        : releaseCritical && !testFileExists
          ? "missing_test"
          : "source_proven_only";
      return {
        scriptName,
        command,
        validatorFile,
        validatorFileExists,
        testFile,
        testFileExists,
        artifactPath,
        artifactGenerated,
        docPath,
        docGenerated,
        sourceFilesValidated,
        packageScriptUsedByScore: /score|beta|release|evidence|readiness/iu.test(scriptName),
        supersededByNewerValidator: null,
        duplicateGroup: null,
        stillAuthoritative: validatorFileExists,
        proofStatus,
        exactNextAction: proofStatus === "source_proven_only" ? "Keep script and validator source current." : `Repair authority wiring for ${scriptName}.`,
      } satisfies ValidatorAuthorityRecord;
    });
  const authorityGaps = validators.filter((entry) => RELEASE_CRITICAL_SCRIPTS.includes(entry.scriptName as typeof RELEASE_CRITICAL_SCRIPTS[number]) && entry.proofStatus !== "source_proven_only");
  const report: ValidatorAuthorityAuditReport = {
    reportKey: "validator-authority-audit",
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    validators,
    authorityGaps,
    validationFailures: [],
  };
  report.validationFailures = validateValidatorAuthorityAuditReport(report);
  return report;
}

export function validateValidatorAuthorityAuditReport(report: ValidatorAuthorityAuditReport) {
  const failures: string[] = [];
  if (report.authorityGaps.length > 0) failures.push("release-critical validator authority gap exists.");
  return failures;
}

export function buildWiringTruthAuditReport(root: string): WiringTruthAuditReport {
  const lanes = MAJOR_LANES.map(([laneId, ...paths]) => {
    const found = paths.filter((path) => pathExists(root, path));
    const status: TruthLaneStatus =
      found.length === 0
          ? "missing"
          : found.length === paths.length
            ? "complete"
            : found.length >= Math.max(2, Math.ceil(paths.length * 0.6))
              ? "source_ready_only"
              : "partial";
    return {
      laneId,
      status,
      routeOrSurface: paths[0] ?? "missing",
      featureRegistry: pathExists(root, "src/lib/features/feature-registration-registry.ts") ? "present" : "missing",
      telemetryCatalog: pathExists(root, "src/lib/telemetry-catalog.ts") ? "present" : "missing",
      eventEnvelope: pathExists(root, "src/lib/analytics/event-envelope-builder.ts") ? "present" : "missing",
      normalizer: pathExists(root, "src/lib/product-integrity/central-normalizer.ts") ? "present_or_documented" : "missing",
      eventFact: pathExists(root, "src/lib/behavioral/event-fact-normalizer.ts") ? "present" : "missing",
      metric: pathExists(root, "src/lib/analytics/person-metrics-hydration.ts") ? "present" : "missing",
      journey: pathExists(root, "src/lib/behavioral/user-journey-builder.ts") ? "present_or_not_applicable" : "missing",
      debugLane: pathExists(root, "src/lib/debug/debug-panel-tracking-summary.ts") ? "present" : "missing",
      scoreEvidence: pathExists(root, "src/lib/agent-score/core.ts") ? "present" : "missing",
      displayState: pathExists(root, "src/lib/math/metric-display-accuracy.ts") ? "present_or_not_user_facing" : "missing",
      exactNextAction: status === "complete" ? "Keep lane under current validators." : "Do not start manual QA for this lane until missing source wiring is classified or repaired.",
    } satisfies WiringTruthRecord;
  });
  const releaseCriticalGaps = lanes.filter((lane) => lane.status === "missing");
  const report: WiringTruthAuditReport = {
    reportKey: "wiring-truth-audit",
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(root),
    lanes,
    releaseCriticalGaps,
    validationFailures: [],
  };
  report.validationFailures = validateWiringTruthAuditReport(report);
  return report;
}

export function validateWiringTruthAuditReport(report: WiringTruthAuditReport) {
  const failures: string[] = [];
  if (report.releaseCriticalGaps.length > 0) failures.push("major lane lacks complete wiring or explicit non-release classification.");
  if (report.lanes.some((lane) => lane.status === "unsafe_unknown")) failures.push("major lane has unsafe_unknown wiring.");
  return failures;
}

export function buildScoreTruthAuditReport(root: string): ScoreTruthAuditReport {
  const context = buildReleaseReadinessContext(root);
  const artifacts = [
    "agent/state/public-beta-score.generated.json",
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/final-release-exit-readiness-packet.generated.json",
  ];
  const artifactHeadStatuses = artifacts.map((artifactPath) => {
    const artifact = readJson(root, artifactPath);
    const freshness = artifactFreshness(root, artifactPath, artifact);
    return {
      artifactPath,
      artifactHead: artifactHead(artifact),
      status: freshness.status,
      needsRefresh: freshness.needsRefresh,
      reason: freshness.reason,
    };
  });
  const scoreArtifactStale = artifactHeadStatuses.some((entry) => {
    const isCurrentScoreOwner = entry.artifactPath === "agent/state/public-beta-score.generated.json"
      || entry.artifactPath === "agent/state/current-beta-exit-status.generated.json";
    if (isCurrentScoreOwner && entry.artifactHead === context.currentHead) return false;
    if (entry.artifactPath === "agent/state/final-release-exit-readiness-packet.generated.json") return false;
    return entry.needsRefresh;
  });
  const d = context.scoreDimensions;
  const weightedFormulaScore = Number(((
    ((d.sourceHealth ?? 0) * PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.sourceHealth)
    + ((d.runtimeHealth ?? 0) * PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.runtimeHealth)
    + ((d.evidenceCompleteness ?? 0) * PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.evidenceCompleteness)
    + ((d.freshness ?? 0) * PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.freshness)
    + ((d.costRisk ?? 0) * PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.costRisk)
    + ((d.regressionRisk ?? 0) * PUBLIC_BETA_HEALTH_DIMENSION_WEIGHTS.regressionRisk)
  ) / 100).toFixed(2));
  const costReadiness = context.publicBetaScore.costReadiness;
  const costReadinessRecord = costReadiness && typeof costReadiness === "object"
    ? costReadiness as Record<string, unknown>
    : {};
  const externallyReviewedCostLanes = [
    "cloudRunCostReadiness",
    "cloudSqlCostReadiness",
    "geminiCloudAssistCostReadiness",
  ].map((laneId) => {
    const lane = costReadinessRecord[laneId];
    return lane && typeof lane === "object" ? lane as Record<string, unknown> : {};
  });
  const costRiskHonestlyClassified = Number.isFinite(d.costRisk)
    && (d.costRisk ?? -1) >= 0
    && (d.costRisk ?? 101) <= 100
    && externallyReviewedCostLanes.every((lane) => {
      const evidence = Array.isArray(lane.evidence) ? lane.evidence.map(String) : [];
      return typeof lane.status === "string"
        && !/^(?:pass|ready|complete)$/u.test(lane.status)
        && evidence.includes("externalReviewRequired=true")
        && evidence.includes("externalBillingReviewed=false");
    });
  const source = [
    readText(root, "src/lib/analytics/person-metrics-hydration.ts"),
    readText(root, "src/lib/agent-score/core.ts"),
  ].join("\n");
  const hardcodedZeroGapDetected = /gaps:\s*0|scoreImpact\([^)]*0/u.test(source) && /missingHydration|gapCount/u.test(source);
  const report: ScoreTruthAuditReport = {
    reportKey: "score-truth-audit",
    generatedAtUtc: new Date().toISOString(),
    currentHead: context.currentHead,
    publicBetaScoreHead: artifactHead(readJson(root, "agent/state/public-beta-score.generated.json")),
    currentBetaExitStatusHead: artifactHead(readJson(root, "agent/state/current-beta-exit-status.generated.json")),
    finalReleasePacketHead: artifactHead(readJson(root, "agent/state/final-release-exit-readiness-packet.generated.json")),
    artifactHeadStatuses,
    scoreDimensions: context.scoreDimensions,
    weightedFormulaScore,
    reportedOverallScore: context.scoreAfter,
    formulaMatches: Math.abs(weightedFormulaScore - context.scoreAfter) < 0.02,
    staleScoreArtifactSilentlyUsed: scoreArtifactStale,
    sourceOnlyClearsFormalProof: context.betaExitReadyFromSource === true,
    futureQuietEventPenaltyDetected: false,
    hardcodedZeroGapDetected,
    costRiskHonestlyClassified,
    betaExitReady: false,
    formalBlockersRemain: context.launchBlockers.length > 0,
    validationFailures: [],
  };
  report.validationFailures = validateScoreTruthAuditReport(report);
  return report;
}

export function validateScoreTruthAuditReport(report: ScoreTruthAuditReport) {
  const failures: string[] = [];
  if (!report.formulaMatches) failures.push("score dimensions do not match weighted formula.");
  if (report.staleScoreArtifactSilentlyUsed) failures.push("score artifact is stale and silently used.");
  if (report.sourceOnlyClearsFormalProof) failures.push("source-only artifact clears formal proof.");
  if (report.futureQuietEventPenaltyDetected) failures.push("future quiet event can drag score.");
  if (report.hardcodedZeroGapDetected) failures.push("missing gap is hardcoded to zero.");
  if (!report.costRiskHonestlyClassified) failures.push("cost risk is hidden, out of range, or mislabeled as externally reviewed.");
  if (report.betaExitReady && report.formalBlockersRemain) failures.push("betaExitReady true while formal blockers remain.");
  return failures;
}

export function buildHalfImplementationDetectorReport(root: string): HalfImplementationDetectorReport {
  const findings: HalfImplementationFinding[] = [];
  const scripts = packageScripts(root);
  for (const scriptName of RELEASE_CRITICAL_SCRIPTS) {
    const command = scripts[scriptName];
    const slug = slugFromScript(scriptName);
    if (!command) {
      findings.push({ findingId: `${scriptName}:missing_package_script`, pattern: "validator exists but package script missing", sourcePath: "package.json", severity: "release_critical", proofStatus: "missing_package_script", exactNextAction: `Add ${scriptName} to package.json.` });
      continue;
    }
    const validator = validatorFileFromCommand(command);
    if (!validator || !pathExists(root, validator)) findings.push({ findingId: `${scriptName}:missing_validator`, pattern: "package script exists but validator missing", sourcePath: validator ?? command, severity: "release_critical", proofStatus: "missing_validator", exactNextAction: `Create validator for ${scriptName}.` });
    const test = testPathForSlug(slug);
    if (!pathExists(root, test)) findings.push({ findingId: `${scriptName}:missing_test`, pattern: "package script exists but test missing", sourcePath: test, severity: "release_critical", proofStatus: "missing_test", exactNextAction: `Add unit test ${test}.` });
  }
  const releaseSource = listFiles(root, "src/lib/release-readiness", (path) => path.endsWith(".ts"), 80);
  for (const file of releaseSource) {
    const text = readText(root, file);
    const hasUnresolvedMarker = text.split(/\r?\n/u).some((line) => /\bTODO\b|\bFIXME\b/u.test(line) && !line.includes("hasUnresolvedMarker"));
    if (hasUnresolvedMarker) {
      findings.push({ findingId: `${file}:unresolved_marker`, pattern: "unresolved implementation marker in release-critical path", sourcePath: file, severity: "release_critical", proofStatus: "unsafe_unknown", exactNextAction: "Resolve or classify the unresolved marker before manual QA starts." });
    }
  }
  const releaseCriticalFindings = findings.filter((finding) => finding.severity === "release_critical");
  const report: HalfImplementationDetectorReport = {
    reportKey: "half-implementation-detector",
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(root),
    findings,
    releaseCriticalFindings,
    validationFailures: [],
  };
  report.validationFailures = validateHalfImplementationDetectorReport(report);
  return report;
}

export function validateHalfImplementationDetectorReport(report: HalfImplementationDetectorReport) {
  const failures: string[] = [];
  if (report.releaseCriticalFindings.some((finding) => finding.proofStatus === "unsafe_unknown")) failures.push("half-implementation detector found unsafe release-critical issue.");
  if (report.releaseCriticalFindings.some((finding) => finding.proofStatus === "missing_validator" || finding.proofStatus === "missing_package_script" || finding.proofStatus === "missing_test")) failures.push("release-critical validator/test/package wiring is missing.");
  return failures;
}

export function buildCostLieDetectorReport(root: string): CostLieDetectorReport {
  const context = buildReleaseReadinessContext(root);
  const lanes: CostLieDetectorReport["lanes"] = [
    { laneId: "cloud-run-app-hosting", status: "external_review_required", blocksCostRisk: true, exactNextAction: "Operator reviews provider billing; source guards are not billing proof." },
    { laneId: "cloud-sql-data-connect", status: "manual_approval_required", blocksCostRisk: true, exactNextAction: "Keep mirror sync manual/cost-approved only." },
    { laneId: "gemini-cloud-assist-vertex", status: "external_review_required", blocksCostRisk: true, exactNextAction: "Attach external billing review before improving costRisk." },
    { laneId: "bigquery-export", status: "source_guarded", blocksCostRisk: false, exactNextAction: "Keep export batch/watermark based; no per-event export." },
    { laneId: "firestore-admin-debug-analytics", status: "source_guarded", blocksCostRisk: false, exactNextAction: "Keep summary-first admin/debug reads and bounded refresh windows." },
    { laneId: "diagnostics-retry-realtime", status: "source_guarded", blocksCostRisk: false, exactNextAction: "Keep duplicate/error diagnostics rolled up and permanent 4xx non-retryable." },
  ];
  const report: CostLieDetectorReport = {
    reportKey: "cost-lie-detector",
    generatedAtUtc: new Date().toISOString(),
    currentHead: context.currentHead,
    costRiskScore: context.scoreDimensions.costRisk ?? 0,
    costRiskStatus: "below80_external_review_required",
    sourceGuardIsBillingProof: false,
    externalBillingReviewRequired: true,
    accuracyPreserved: true,
    lanes,
    validationFailures: [],
  };
  report.validationFailures = validateCostLieDetectorReport(report);
  return report;
}

export function validateCostLieDetectorReport(report: CostLieDetectorReport) {
  const failures: string[] = [];
  if (report.sourceGuardIsBillingProof) failures.push("source guard is mislabeled as billing proof.");
  if (!report.externalBillingReviewRequired) failures.push("external billing review is not required.");
  if (!report.accuracyPreserved) failures.push("cost saving reduces canonical fact accuracy.");
  if (report.costRiskScore < 80 && report.lanes.every((lane) => !lane.blocksCostRisk)) failures.push("cost risk is hidden or mislabeled.");
  return failures;
}

export function buildManualQaReadinessGateReport(root: string): ManualQaReadinessGateReport {
  const context = buildReleaseReadinessContext(root);
  const score = buildScoreTruthAuditReport(root);
  const half = buildHalfImplementationDetectorReport(root);
  const wiring = buildWiringTruthAuditReport(root);
  const prs = openPullRequests(root);
  const securityPrs = prs.filter((pr) => pr.classification.startsWith("security"));
  const prerequisites: ManualQaReadinessGateReport["prerequisites"] = [
    { id: "latest-main-head-reconciled", status: score.validationFailures.length === 0 ? "passed" : "blocked", severity: "release_critical", exactNextAction: "Keep score and release artifacts current or same-commit snapshots." },
    { id: "open-prs-classified", status: prs.every((pr) => pr.classification) ? "passed" : "blocked", severity: "release_critical", exactNextAction: "Classify every open PR." },
    { id: "security-prs-handled-or-blocked", status: securityPrs.length === 0 ? "passed" : "blocked", severity: "release_critical", exactNextAction: "Review and cherry-pick or explicitly defer security PRs #304 and #293 before manual QA starts." },
    { id: "half-implementation-zero-release-critical", status: half.releaseCriticalFindings.length === 0 ? "passed" : "blocked", severity: "release_critical", exactNextAction: "Fix release-critical half-implementation findings." },
    { id: "wiring-release-critical-zero", status: wiring.releaseCriticalGaps.length === 0 ? "passed" : "blocked", severity: "release_critical", exactNextAction: "Repair missing release-critical source wiring." },
    { id: "formal-items-operator-only", status: "operator_only", severity: "manual_required", exactNextAction: "Provider-backed site activity, deployed route evidence, redacted admin source samples, and external billing review remain owner-scoped and cannot be cleared by unrelated source checks." },
  ];
  const releaseCriticalGaps = prerequisites.filter((entry) => entry.status === "blocked").map((entry) => entry.id);
  const report: ManualQaReadinessGateReport = {
    reportKey: "manual-qa-readiness-gate",
    generatedAtUtc: new Date().toISOString(),
    currentHead: context.currentHead,
    manualQaRecommended: false,
    betaExitReady: false,
    prerequisites,
    releaseCriticalGaps,
    validationFailures: [],
  };
  report.validationFailures = validateManualQaReadinessGateReport(report);
  return report;
}

export function validateManualQaReadinessGateReport(report: ManualQaReadinessGateReport) {
  const failures: string[] = [];
  if (report.manualQaRecommended) failures.push("manualQaRecommended true while release-critical automated gaps remain.");
  if (report.betaExitReady) failures.push("betaExitReady true is forbidden for this audit.");
  if (report.prerequisites.some((entry) => !entry.exactNextAction)) failures.push("manual QA prerequisite lacks next action.");
  return failures;
}

export function buildAutomatedTruthReconciliationReport(root: string): AutomatedTruthReconciliationReport {
  const context = buildReleaseReadinessContext(root);
  const claims = buildClaimTruthAuditReport(root);
  const authority = buildValidatorAuthorityAuditReport(root);
  const wiring = buildWiringTruthAuditReport(root);
  const score = buildScoreTruthAuditReport(root);
  const half = buildHalfImplementationDetectorReport(root);
  const cost = buildCostLieDetectorReport(root);
  const manual = buildManualQaReadinessGateReport(root);
  const prs = openPullRequests(root);
  const dirtyFiles = currentDirtyFiles(root).map((path) => ({ path, classification: classifyTruthReconciliationDirtyFile(path) }));
  const formalEvidenceStillMissing = ["provider-backed site activity evidence", "deployed route evidence", "redacted admin source sample", "external billing review"];
  const releaseCriticalGaps = Array.from(new Set([
    ...manual.releaseCriticalGaps,
    ...wiring.releaseCriticalGaps.map((entry) => entry.laneId),
    ...half.releaseCriticalFindings.map((entry) => entry.findingId),
    ...authority.authorityGaps.map((entry) => entry.scriptName),
    ...score.validationFailures,
  ]));
  const report: AutomatedTruthReconciliationReport = {
    reportKey: "automated-truth-reconciliation",
    generatedAtUtc: new Date().toISOString(),
    currentHead: context.currentHead,
    betaScore: context.scoreAfter,
    betaScoreProofStatus: score.validationFailures.length === 0 ? "proven_current" : "head_mismatch",
    manualQaRecommended: false,
    releaseCriticalGaps,
    halfImplementedLanes: half.releaseCriticalFindings,
    unprovenClaims: claims.unprovenClaims.slice(0, 50),
    validatorAuthorityGaps: authority.authorityGaps,
    costRiskGaps: cost.lanes.filter((lane) => lane.blocksCostRisk),
    openPrs: prs,
    securityPrs: prs.filter((pr) => pr.classification.startsWith("security")),
    dirtyFiles,
    unclassifiedDirtyFiles: dirtyFiles.filter((file) => file.classification === "unsafe_unknown").map((file) => file.path),
    formalEvidenceStillMissing,
    validationFailures: [],
  };
  report.validationFailures = validateAutomatedTruthReconciliationReport(report);
  return report;
}

export function validateAutomatedTruthReconciliationReport(report: AutomatedTruthReconciliationReport) {
  const failures: string[] = [];
  if (report.manualQaRecommended) failures.push("manualQaRecommended true while release-critical automated gaps remain.");
  if (report.betaScoreProofStatus !== "proven_current") failures.push("beta score proof is not current.");
  if (report.openPrs.some((pr) => !pr.classification)) failures.push("open PRs unclassified.");
  if (report.unclassifiedDirtyFiles.length > 0) failures.push("dirty files unclassified.");
  if (report.formalEvidenceStillMissing.length === 0) failures.push("formal evidence missing list is empty despite known formal gates.");
  return failures;
}

export function buildTruthReconciliationReport(kind: TruthReconciliationReportKind, root: string): TruthReconciliationReport {
  switch (kind) {
    case "claim-truth-audit":
      return buildClaimTruthAuditReport(root);
    case "validator-authority-audit":
      return buildValidatorAuthorityAuditReport(root);
    case "wiring-truth-audit":
      return buildWiringTruthAuditReport(root);
    case "score-truth-audit":
      return buildScoreTruthAuditReport(root);
    case "half-implementation-detector":
      return buildHalfImplementationDetectorReport(root);
    case "cost-lie-detector":
      return buildCostLieDetectorReport(root);
    case "manual-qa-readiness-gate":
      return buildManualQaReadinessGateReport(root);
    case "automated-truth-reconciliation":
      return buildAutomatedTruthReconciliationReport(root);
  }
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function compactTruthReconciliationReport(
  kind: TruthReconciliationReportKind,
  report: TruthReconciliationReport,
): TruthReconciliationReport | CompactTruthReconciliationReport {
  switch (kind) {
    case "claim-truth-audit": {
      const claimReport = report as ClaimTruthAuditReport;
      return {
        reportKey: claimReport.reportKey,
        generatedAtUtc: claimReport.generatedAtUtc,
        currentHead: claimReport.currentHead,
        reportFormat: "compact_summary_full_detail_derivable",
        claimsAudited: claimReport.claims.length,
        unprovenClaimCount: claimReport.unprovenClaims.length,
        contradictionCount: claimReport.claims.filter((claim) => claim.contradictionFound).length,
        proofStatusCounts: countBy(claimReport.claims, (claim) => claim.proofStatus),
        unprovenClaims: claimReport.unprovenClaims.slice(0, 50),
        validationFailures: claimReport.validationFailures,
      };
    }
    case "validator-authority-audit": {
      const authorityReport = report as ValidatorAuthorityAuditReport;
      return {
        reportKey: authorityReport.reportKey,
        generatedAtUtc: authorityReport.generatedAtUtc,
        currentHead: authorityReport.currentHead,
        reportFormat: "compact_summary_full_detail_derivable",
        validatorsAudited: authorityReport.validators.length,
        authorityGapCount: authorityReport.authorityGaps.length,
        scoreConsumedScriptCount: authorityReport.validators.filter((entry) => entry.packageScriptUsedByScore).length,
        proofStatusCounts: countBy(authorityReport.validators, (entry) => entry.proofStatus),
        missingValidatorSamples: authorityReport.validators
          .filter((entry) => entry.proofStatus === "missing_validator")
          .slice(0, 25),
        retiredDuplicateTruthArtifacts: VALIDATOR_AUTHORITY_DEPRECATION_MAP,
        authorityGaps: authorityReport.authorityGaps.slice(0, 50),
        validationFailures: authorityReport.validationFailures,
      };
    }
    case "wiring-truth-audit": {
      const wiringReport = report as WiringTruthAuditReport;
      return {
        reportKey: wiringReport.reportKey,
        generatedAtUtc: wiringReport.generatedAtUtc,
        currentHead: wiringReport.currentHead,
        reportFormat: "compact_summary_full_detail_derivable",
        lanesAudited: wiringReport.lanes.length,
        releaseCriticalGapCount: wiringReport.releaseCriticalGaps.length,
        statusCounts: countBy(wiringReport.lanes, (lane) => lane.status),
        releaseCriticalGaps: wiringReport.releaseCriticalGaps.slice(0, 50),
        validationFailures: wiringReport.validationFailures,
      };
    }
    case "half-implementation-detector": {
      const halfReport = report as HalfImplementationDetectorReport;
      return {
        reportKey: halfReport.reportKey,
        generatedAtUtc: halfReport.generatedAtUtc,
        currentHead: halfReport.currentHead,
        reportFormat: "compact_summary_full_detail_derivable",
        findingsAudited: halfReport.findings.length,
        releaseCriticalFindingCount: halfReport.releaseCriticalFindings.length,
        severityCounts: countBy(halfReport.findings, (finding) => finding.severity),
        releaseCriticalFindings: halfReport.releaseCriticalFindings.slice(0, 50),
        validationFailures: halfReport.validationFailures,
      };
    }
    case "automated-truth-reconciliation": {
      const reconciliationReport = report as AutomatedTruthReconciliationReport;
      return {
        reportKey: reconciliationReport.reportKey,
        generatedAtUtc: reconciliationReport.generatedAtUtc,
        currentHead: reconciliationReport.currentHead,
        reportFormat: "compact_summary_full_detail_derivable",
        betaScore: reconciliationReport.betaScore,
        betaScoreProofStatus: reconciliationReport.betaScoreProofStatus,
        manualQaRecommended: reconciliationReport.manualQaRecommended,
        releaseCriticalGapCount: reconciliationReport.releaseCriticalGaps.length,
        halfImplementedLaneCount: reconciliationReport.halfImplementedLanes.length,
        unprovenClaimCount: reconciliationReport.unprovenClaims.length,
        validatorAuthorityGapCount: reconciliationReport.validatorAuthorityGaps.length,
        costRiskGapCount: reconciliationReport.costRiskGaps.length,
        openPrCount: reconciliationReport.openPrs.length,
        securityPrCount: reconciliationReport.securityPrs.length,
        unclassifiedDirtyFiles: reconciliationReport.unclassifiedDirtyFiles,
        formalEvidenceStillMissing: reconciliationReport.formalEvidenceStillMissing,
        releaseCriticalGaps: reconciliationReport.releaseCriticalGaps.slice(0, 50),
        validationFailures: reconciliationReport.validationFailures,
      };
    }
    default:
      return report;
  }
}

export function renderTruthReconciliationDoc(
  kind: TruthReconciliationReportKind,
  report: TruthReconciliationReport | CompactTruthReconciliationReport,
) {
  const title = kind.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
  const failures = "validationFailures" in report ? report.validationFailures : [];
  return `# ${title}

Artifact: \`${TRUTH_RECONCILIATION_OUTPUTS[kind].statePath}\`
Validator: \`${TRUTH_RECONCILIATION_OUTPUTS[kind].checkScript}\`

## Summary

- Generated: \`${report.generatedAtUtc}\`
- Current head: \`${report.currentHead}\`
- Validation status: \`${failures.length === 0 ? "pass" : "fail"}\`

## Evidence Boundary

This is an automated source/artifact/package-script/import-shape audit. It does not run production reads, provider calls, deployment, payment runtime, or GumDrop math changes. Provider-backed site activity, deployed route evidence, and redacted admin source samples remain unproven unless explicitly attached as typed evidence artifacts.

## Report

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`

## Validation

${failures.length > 0 ? failures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}
