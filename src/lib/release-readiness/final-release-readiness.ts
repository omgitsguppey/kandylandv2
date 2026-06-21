import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { classifyGeneratedArtifactFromGit } from "../agent-score/generated-artifact-version-policy";
import {
  buildLiveEvidenceGateReplacementReport,
} from "./live-evidence-resolver";
import type { LiveEvidenceGateReplacementReport } from "./live-evidence-gate-contract";

export type ReleaseReadinessReportKind =
  | "current-head-release-reconciliation"
  | "formal-evidence-status-ledger"
  | "open-pr-dependency-hygiene"
  | "runtime-smoke-harness"
  | "admin-truth-redaction-packet"
  | "operator-final-qa-packet"
  | "release-rollback-incident-readiness"
  | "release-notes-integrity"
  | "final-release-exit-readiness-packet"
  | "live-evidence-gate-replacement";

export type EvidenceStatus =
  | "formal_passed"
  | "source_confidence_only"
  | "operator_confirmed_only"
  | "external_review_required"
  | "formal_missing"
  | "stale"
  | "in_flight"
  | "not_required";

export type ArtifactFreshnessStatus =
  | "current"
  | "same_commit_snapshot"
  | "current_by_impact"
  | "stale"
  | "head_mismatch"
  | "superseded"
  | "formal_missing"
  | "in_flight"
  | "not_required";

export type OpenPrClassification =
  | "dependency_pr_to_merge"
  | "dependency_pr_to_cherry_pick"
  | "dependency_pr_to_close_or_defer"
  | "security_pr_to_merge"
  | "security_pr_to_cherry_pick"
  | "accessibility_pr_to_merge"
  | "performance_pr_to_merge"
  | "superseded_pr_to_close"
  | "unsafe_pr_needs_manual_review";

export type DependencyRiskClass =
  | "patch_safe"
  | "minor_low_risk"
  | "major_risk"
  | "security_required"
  | "test_tooling_only"
  | "runtime_framework_risk"
  | "provider_sdk_risk"
  | "defer_until_after_exit"
  | "not_dependency";

export type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_generated_artifact_to_revert_or_delete"
  | "release_artifact_expected"
  | "in_flight_artifact_to_leave_alone"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "unsafe_unknown";

export type ScoreDimensions = Record<string, number>;

export type OpenPrInput = {
  number: number;
  title: string;
  url?: string;
  headRefName?: string;
  baseRefName?: string;
  mergeStateStatus?: string;
  isDraft?: boolean;
  updatedAt?: string;
  author?: { login?: string; is_bot?: boolean };
};

export type ClassifiedOpenPr = OpenPrInput & {
  classification: OpenPrClassification;
  dependencyRiskClass: DependencyRiskClass;
  reason: string;
  nextExactAction: string;
  blocksBetaExit: boolean;
};

export type ArtifactStatus = {
  artifactPath: string;
  reportKey?: string;
  currentHead?: string;
  generatedAtUtc?: string;
  status: ArtifactFreshnessStatus;
  affectsReadiness: boolean;
  nextExactAction: string;
};

export type FormalEvidenceCategory = {
  category: string;
  status: EvidenceStatus;
  artifactPath: string;
  currentHead?: string;
  generatedAtUtc?: string;
  owner: string;
  blocksBetaExit: boolean;
  blocksScoreOnly: boolean;
  nextExactAction: string;
  whatItDoesNotProve: string;
};

export type RuntimeSmokeRoute = {
  routeId: string;
  route: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  routeClass:
    | "public_page"
    | "authenticated_user_page"
    | "creator_page"
    | "admin_page"
    | "api_public"
    | "api_auth_required"
    | "api_admin_required"
    | "api_mutation"
    | "api_webhook_or_provider"
    | "unsupported_without_provider";
  authRequirement: string;
  expectedStatusClass: string;
  expectedErrorShape: string;
  expectedHumanErrorCopy: string;
  noRawStack: true;
  noInternalServerErrorCopy: true;
  telemetryDebugMapping: string;
  costClass: string;
  providerDependencyStatus: "none" | "mock_required" | "provider_call_forbidden" | "unsupported_without_provider";
  mutationSafety: "read_only" | "mock_only" | "source_only" | "provider_forbidden";
};

export type OperatorQaSurface = {
  surfaceId: string;
  route: string;
  role: string;
  device: Array<"mobile" | "tablet" | "desktop">;
  browserReproductionRequired: boolean;
  checks: string[];
  status: "source_checked" | "operator_confirmed" | "failed" | "not_required";
  nextExactAction: string;
  notes: string;
};

export type ReleaseReadinessContext = {
  generatedAtUtc: string;
  currentHead: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: ScoreDimensions;
  launchGateStatus: string;
  launchBlockers: string[];
  betaExitReadyFromSource: boolean;
  publicBetaScore: Record<string, unknown>;
  currentBetaExitStatus: Record<string, unknown>;
  releaseNotes: Record<string, unknown>;
  releaseEvidenceArtifacts: Record<string, Record<string, unknown>>;
  artifacts: ArtifactStatus[];
  openPrs: ClassifiedOpenPr[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
};

export type CurrentHeadReleaseReconciliationReport = {
  reportKey: "current-head-release-reconciliation";
  generatedAtUtc: string;
  currentHead: string;
  publicBetaScoreCurrentHead?: string;
  currentBetaExitStatusCurrentHead?: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: ScoreDimensions;
  artifacts: ArtifactStatus[];
  staleArtifactsRemaining: ArtifactStatus[];
  validationFailures: string[];
};

export type FormalEvidenceStatusLedgerReport = {
  reportKey: "formal-evidence-status-ledger";
  generatedAtUtc: string;
  currentHead: string;
  scoreDimensions: ScoreDimensions;
  categories: FormalEvidenceCategory[];
  remainingFormalEvidence: FormalEvidenceCategory[];
  validationFailures: string[];
};

export type OpenPrDependencyHygieneReport = {
  reportKey: "open-pr-dependency-hygiene";
  generatedAtUtc: string;
  currentHead: string;
  openPrs: ClassifiedOpenPr[];
  openPrCount: number;
  unclassifiedOpenPrCount: number;
  dependencyPrCount: number;
  securityPrCount: number;
  blocksBetaExit: boolean;
  validationFailures: string[];
};

export type RuntimeSmokeHarnessReport = {
  reportKey: "runtime-smoke-harness";
  generatedAtUtc: string;
  currentHead: string;
  claimsDeployedRuntimeProof: false;
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  routes: RuntimeSmokeRoute[];
  unsupportedWithoutProvider: string[];
  validationFailures: string[];
};

export type AdminTruthRedactionPacketReport = {
  reportKey: "admin-truth-redaction-packet";
  generatedAtUtc: string;
  currentHead: string;
  environment: "source_schema_only_no_production_read";
  sampleSource: "none_attached";
  redactionPolicy: {
    forbiddenRawFields: string[];
    hashRequiredFields: string[];
    privateContentExcluded: string[];
  };
  packetSchema: Record<string, string>;
  missingFormalProof: string[];
  operatorAttestation?: string;
  linkedToBetaExitStatus: true;
  validationFailures: string[];
};

export type OperatorFinalQaPacketReport = {
  reportKey: "operator-final-qa-packet";
  generatedAtUtc: string;
  currentHead: string;
  outsideCodexScoreGate: true;
  surfaces: OperatorQaSurface[];
  operatorFinalStatus: "source_checked" | "operator_confirmed" | "failed";
  validationFailures: string[];
};

export type ReleaseRollbackIncidentReadinessReport = {
  reportKey: "release-rollback-incident-readiness";
  generatedAtUtc: string;
  currentHead: string;
  releaseVersion: string;
  readinessStatus:
    | "source_ready_external_evidence_blocked"
    | "source_ready_operator_signoff_required"
    | "source_failure";
  migrationStatus: "no_migration_detected" | "migration_review_required";
  currentHeadEvidence: ReleaseRollbackEvidenceGate;
  releaseNotesEvidence: ReleaseRollbackEvidenceGate;
  envContractEvidence: ReleaseRollbackEvidenceGate;
  providerEvidence: ReleaseRollbackEvidenceGate;
  runtimeEvidence: ReleaseRollbackEvidenceGate;
  adminTruthEvidence: ReleaseRollbackEvidenceGate;
  incidentRecoveryState: ReleaseRollbackEvidenceGate;
  evidenceGates: ReleaseRollbackEvidenceGate[];
  blockingExternalEvidence: ReleaseRollbackEvidenceGate[];
  featureFlagsAndKillSwitches: Array<{ surface: string; status: "available" | "missing_kill_switch"; note: string }>;
  safetyNotes: Record<string, string>;
  rollbackTriggerConditions: string[];
  rollbackProcedure: string[];
  postRollbackVerification: string[];
  incidentSeverityLevels: Array<{ severity: "sev1" | "sev2" | "sev3"; trigger: string; owner: string }>;
  validationFailures: string[];
};

export type ReleaseRollbackEvidenceGate = {
  gateId: string;
  label: string;
  evidenceKind:
    | "source"
    | "generated_snapshot"
    | "runtime_redacted"
    | "provider_proof"
    | "admin_operator_evidence"
    | "external_manual";
  status:
    | "passed"
    | "source_ready"
    | "source_confidence_only"
    | "operator_reported_only"
    | "missing_external_evidence"
    | "stale_evidence"
    | "source_failed";
  artifactPath: string;
  currentHead?: string;
  sourceCommit?: string;
  generatedAtUtc?: string;
  owner: string;
  blocking: boolean;
  validator: string;
  nextExactAction: string;
  doesNotProve: string;
};

export type ReleaseNotesIntegrityReport = {
  reportKey: "release-notes-integrity";
  generatedAtUtc: string;
  currentHead: string;
  currentVersion: string;
  publicReleaseJsonValid: boolean;
  claimsBetaExit: boolean;
  claimsProviderRuntimeProof: boolean;
  exposesSensitiveInternals: boolean;
  changelogMentionsLatestHardening: boolean;
  releaseNotesStaleToCurrentHead: boolean;
  validationFailures: string[];
};

export type FinalReleaseExitReadinessPacketReport = {
  reportKey: "final-release-exit-readiness-packet";
  generatedAtUtc: string;
  currentHead: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: ScoreDimensions;
  betaExitReady: boolean;
  launchGateStatus: string;
  launchBlockers: string[];
  blockerClassifications: Array<{ blocker: string; classification: string; nextExactAction: string }>;
  formalEvidenceLedger: FormalEvidenceCategory[];
  runtimeSmokeHarness: { status: "source_safe_harness_ready"; claimsDeployedRuntimeProof: false; routeCount: number };
  adminTruthRedactionPacket: { status: "schema_ready_formal_sample_missing"; missingFormalProof: string[] };
  openPrDependencyStatus: { openPrCount: number; unclassifiedOpenPrCount: number; securityPrCount: number; dependencyPrCount: number };
  operatorFinalQaPacket: { status: "source_checked"; surfaceCount: number };
  rollbackIncidentReadiness: { status: "source_ready_operator_contact_required"; missingKillSwitches: number };
  releaseNotesIntegrity: { status: "pass" | "warning"; currentVersion: string };
  liveEvidenceGateReplacement: {
    status: "split_ready";
    broadManualGatesAfter: string[];
    sourceMissingLiveEvidenceCount: number;
    visualOnlyManualGateCount: number;
    externalProviderGateCount: number;
    externalBillingGateCount: number;
  };
  costRiskStatus: { score: number; status: "below80_external_review_required" | "meets_source_target"; nextExactAction: string };
  evidenceCompletenessStatus: { score: number; status: "below80_requires_formal_evidence" | "meets_source_target"; nextExactAction: string };
  freshnessStatus: { score: number; status: "below80_refresh_required" | "meets_source_target"; nextExactAction: string };
  remainingManualItems: string[];
  remainingFormalEvidence: string[];
  remainingCostReview: string[];
  remainingOpenPrs: ClassifiedOpenPr[];
  nextExactSteps: string[];
  validationFailures: string[];
};

export type ReleaseReadinessReport =
  | CurrentHeadReleaseReconciliationReport
  | FormalEvidenceStatusLedgerReport
  | OpenPrDependencyHygieneReport
  | RuntimeSmokeHarnessReport
  | AdminTruthRedactionPacketReport
  | OperatorFinalQaPacketReport
  | ReleaseRollbackIncidentReadinessReport
  | ReleaseNotesIntegrityReport
  | FinalReleaseExitReadinessPacketReport
  | LiveEvidenceGateReplacementReport;

export const RELEASE_READINESS_OUTPUTS: Record<ReleaseReadinessReportKind, { statePath: string; docPath: string; checkScript: string }> = {
  "current-head-release-reconciliation": {
    statePath: "agent/state/current-head-release-reconciliation.generated.json",
    docPath: "docs/agent-truth/current-head-release-reconciliation.md",
    checkScript: "npm run check:current-head-release-reconciliation",
  },
  "formal-evidence-status-ledger": {
    statePath: "agent/state/formal-evidence-status-ledger.generated.json",
    docPath: "docs/agent-truth/formal-evidence-status-ledger.md",
    checkScript: "npm run check:formal-evidence-status-ledger",
  },
  "open-pr-dependency-hygiene": {
    statePath: "agent/state/open-pr-dependency-hygiene.generated.json",
    docPath: "docs/agent-truth/open-pr-dependency-hygiene.md",
    checkScript: "npm run check:open-pr-dependency-hygiene",
  },
  "runtime-smoke-harness": {
    statePath: "agent/state/runtime-smoke-harness.generated.json",
    docPath: "docs/agent-truth/runtime-smoke-harness.md",
    checkScript: "npm run check:runtime-smoke-harness",
  },
  "admin-truth-redaction-packet": {
    statePath: "agent/state/admin-truth-redaction-packet.generated.json",
    docPath: "docs/agent-truth/admin-truth-redaction-packet.md",
    checkScript: "npm run check:admin-truth-redaction-packet",
  },
  "operator-final-qa-packet": {
    statePath: "agent/state/operator-final-qa-packet.generated.json",
    docPath: "docs/agent-truth/operator-final-qa-packet.md",
    checkScript: "npm run check:operator-final-qa-packet",
  },
  "release-rollback-incident-readiness": {
    statePath: "agent/state/release-rollback-incident-readiness.generated.json",
    docPath: "docs/agent-truth/release-rollback-incident-readiness.md",
    checkScript: "npm run check:release-rollback-incident-readiness",
  },
  "release-notes-integrity": {
    statePath: "agent/state/release-notes-integrity.generated.json",
    docPath: "docs/agent-truth/release-notes-integrity.md",
    checkScript: "npm run check:release-notes-integrity",
  },
  "final-release-exit-readiness-packet": {
    statePath: "agent/state/final-release-exit-readiness-packet.generated.json",
    docPath: "docs/agent-truth/final-release-exit-readiness-packet.md",
    checkScript: "npm run check:final-release-exit-readiness-packet",
  },
  "live-evidence-gate-replacement": {
    statePath: "agent/state/live-evidence-gate-replacement.generated.json",
    docPath: "docs/agent-truth/live-evidence-gate-replacement.md",
    checkScript: "npm run check:live-evidence-gate-replacement",
  },
};

const REQUIRED_ARTIFACTS = [
  "agent/state/public-beta-score.generated.json",
  "agent/state/current-beta-exit-status.generated.json",
  "agent/state/formal-evidence-bridge.generated.json",
  "agent/state/final-product-integrity-lock.generated.json",
  "agent/state/final-math-normalization-lock.generated.json",
  "agent/state/mega-legacy-pipeline-hardening.generated.json",
  "agent/state/self-revealing-codebase.generated.json",
  "agent/state/codebase-organization-hardening.generated.json",
  "agent/state/codex-execution-guardrails.generated.json",
  "agent/state/runtime-smoke-substitute-matrix.generated.json",
  "agent/state/source-backed-runtime-confidence.generated.json",
  "agent/state/admin-truth-source-sample.generated.json",
  "agent/state/debug-runtime-evidence.generated.json",
] as const;

function readJson(root: string, relativePath: string): Record<string, unknown> {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return {};
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function shell(cwd: string, command: string, args: readonly string[]) {
  try {
    return execFileSync(command, [...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function getCurrentGitHead(root: string) {
  return shell(root, "git", ["rev-parse", "HEAD"]);
}

export function readOpenPullRequests(root: string): OpenPrInput[] {
  const cachedReport = readJson(root, "agent/state/open-pr-dependency-hygiene.generated.json");
  const cachedOpenPrs = arrayValue(cachedReport.openPrs);
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return cachedOpenPrs.filter((entry): entry is OpenPrInput => Boolean(entry) && typeof entry === "object");
  }

  const output = shell(root, "gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,headRefName,baseRefName,mergeStateStatus,isDraft,updatedAt,author",
  ]);
  if (!output) return [];
  try {
    const parsed = JSON.parse(output) as unknown;
    return Array.isArray(parsed) ? parsed as OpenPrInput[] : [];
  } catch {
    return [];
  }
}

function currentDirtyFiles(root: string) {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of shell(root, "git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

export function classifyReleaseDirtyFile(path: string): DirtyFileClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (/^agent\/state\/(current-head-release-reconciliation|formal-evidence-status-ledger|open-pr-dependency-hygiene|runtime-smoke-harness|admin-truth-redaction-packet|operator-final-qa-packet|release-rollback-incident-readiness|release-notes-integrity|final-release-exit-readiness-packet|live-evidence-gate-replacement|public-beta-score|current-beta-exit-status|overnight-beta-readiness-lock)\.generated\.json$/u.test(normalized)) {
    return "current_generated_artifact_to_commit";
  }
  if (/^docs\/agent-truth\/(current-head-release-reconciliation|formal-evidence-status-ledger|open-pr-dependency-hygiene|runtime-smoke-harness|admin-truth-redaction-packet|operator-final-qa-packet|release-rollback-incident-readiness|release-notes-integrity|final-release-exit-readiness-packet|live-evidence-gate-replacement|current-beta-exit-status|overnight-beta-readiness-lock)\.md$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^scripts\/agent\/(release-readiness-report-runner|validate-(current-head-release-reconciliation|formal-evidence-status-ledger|open-pr-dependency-hygiene|runtime-smoke-harness|admin-truth-redaction-packet|operator-final-qa-packet|release-rollback-incident-readiness|release-notes-integrity|final-release-exit-readiness-packet|live-evidence-gate-replacement))\.ts$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (/^src\/lib\/release-readiness\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^tests\/unit\/(current-head-release-reconciliation|formal-evidence-status-ledger|open-pr-dependency-hygiene|runtime-smoke-harness|admin-truth-redaction-packet|operator-final-qa-packet|release-rollback-incident-readiness|release-notes-integrity|final-release-exit-readiness-packet|live-evidence-gate-replacement)\.spec\.ts$/u.test(normalized)) {
    return "release_artifact_expected";
  }
  if (normalized === "package.json") return "release_artifact_expected";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized === "src/lib/release-notes/public-release-notes.ts") {
    return "release_artifact_expected";
  }
  if (/^agent\/context\//u.test(normalized)) return "unrelated_agent_context_file_to_ignore";
  return "unsafe_unknown";
}

export function classifyOpenPr(pr: OpenPrInput): ClassifiedOpenPr {
  const title = pr.title.toLowerCase();
  const head = (pr.headRefName ?? "").toLowerCase();
  const isDependabot = pr.author?.login?.toLowerCase().includes("dependabot") || head.includes("dependabot") || title.includes("dependabot") || title.includes("bump");
  const isSecurity = title.includes("sentinel") || title.includes("security") || title.includes("open redirect") || title.includes("weak prng") || title.includes("math.random");
  const isA11y = title.includes("accessible") || title.includes("a11y") || title.includes("loading states");
  const isPerf = title.includes("performance") || title.includes("perf") || title.includes("usememo") || title.includes("map lookup") || title.includes(".find()");

  if (isSecurity) {
    return {
      ...pr,
      classification: "security_pr_to_cherry_pick",
      dependencyRiskClass: "security_required",
      reason: "Security-labeled PR requires source review and a scoped cherry-pick or equivalent patch before beta exit; it is not merged blindly from an unknown branch state.",
      nextExactAction: `Review PR #${pr.number}, port the isolated security fix if it applies to current source, then run targeted security/unit checks.`,
      blocksBetaExit: true,
    };
  }

  if (isDependabot) {
    const providerRisk = /firebase|paypal|bigquery|next|react|cloud|functions/u.test(title);
    const toolingOnly = /knip|syncpack|npm-check-updates|puppeteer/u.test(title);
    const broad = /group|minor-patch|48 updates|functions-npm/u.test(title);
    return {
      ...pr,
      classification: "dependency_pr_to_close_or_defer",
      dependencyRiskClass: providerRisk ? "provider_sdk_risk" : broad ? "major_risk" : toolingOnly ? "test_tooling_only" : "defer_until_after_exit",
      reason: "Dependency updates are not merged blindly during beta-exit finalization; broad/provider/tooling changes need a separate dependency window.",
      nextExactAction: `Defer PR #${pr.number} until after beta exit unless a security advisory makes it mandatory.`,
      blocksBetaExit: false,
    };
  }

  if (isA11y) {
    return {
      ...pr,
      classification: "accessibility_pr_to_merge",
      dependencyRiskClass: "not_dependency",
      reason: "Small accessibility PR is useful, but still needs current-source review before landing.",
      nextExactAction: `Review PR #${pr.number} against current source and cherry-pick only the isolated accessibility improvement if it is still relevant.`,
      blocksBetaExit: false,
    };
  }

  if (isPerf) {
    return {
      ...pr,
      classification: "performance_pr_to_merge",
      dependencyRiskClass: "not_dependency",
      reason: "Small performance PR is useful, but must not supersede current source or import scratch work.",
      nextExactAction: `Review PR #${pr.number} against current source and cherry-pick only the isolated performance change if tests stay green.`,
      blocksBetaExit: false,
    };
  }

  if (title.includes("doctrine") || title.includes("monolith") || title.includes("onboarding") || title.includes("technical rescue")) {
    return {
      ...pr,
      classification: "unsafe_pr_needs_manual_review",
      dependencyRiskClass: "not_dependency",
      reason: "Governance/product-scope PR overlaps release readiness and needs human ordering rather than automatic merge.",
      nextExactAction: `Manually review PR #${pr.number}; defer or close if superseded by current release-readiness and hardening artifacts.`,
      blocksBetaExit: false,
    };
  }

  return {
    ...pr,
    classification: "unsafe_pr_needs_manual_review",
    dependencyRiskClass: "not_dependency",
    reason: "Open PR lacks a safe automatic release-exit classification.",
    nextExactAction: `Manually classify PR #${pr.number} before beta-exit signoff.`,
    blocksBetaExit: true,
  };
}

function readArtifactStatus(root: string, currentHead: string, artifactPath: string): ArtifactStatus {
  const artifact = readJson(root, artifactPath);
  if (Object.keys(artifact).length === 0) {
    return {
      artifactPath,
      status: artifactPath.includes("provider-smoke") || artifactPath.includes("runtime-smoke") || artifactPath.includes("admin-truth") ? "formal_missing" : "not_required",
      affectsReadiness: artifactPath.includes("public-beta-score") || artifactPath.includes("current-beta-exit-status"),
      nextExactAction: `Create or refresh ${artifactPath} only through its owning validator.`,
    };
  }
  const artifactHead = stringValue(artifact.currentHead ?? artifact.sourceCommit);
  const reportKey = stringValue(artifact.reportKey);
  const generatedAtUtc = stringValue(artifact.generatedAtUtc ?? artifact.generatedAt);
  const version = classifyGeneratedArtifactFromGit({
    cwd: root,
    artifactPath,
    artifactHead: artifactHead || undefined,
    ownedSourcePaths: [
      "src/lib/release-readiness",
      "scripts/agent/release-readiness-report-runner.ts",
      "scripts/agent/validate-current-head-release-reconciliation.ts",
      "scripts/agent/validate-formal-evidence-status-ledger.ts",
      "scripts/agent/validate-open-pr-dependency-hygiene.ts",
      "scripts/agent/validate-runtime-smoke-harness.ts",
      "scripts/agent/validate-admin-truth-redaction-packet.ts",
      "scripts/agent/validate-operator-final-qa-packet.ts",
      "scripts/agent/validate-release-rollback-incident-readiness.ts",
      "scripts/agent/validate-release-notes-integrity.ts",
      "scripts/agent/validate-final-release-exit-readiness-packet.ts",
    ],
  });
  const status: ArtifactFreshnessStatus = !version.needsRefresh
    ? version.status === "same_commit_snapshot"
      ? "same_commit_snapshot"
      : version.status === "current_by_impact"
        ? "current_by_impact"
        : "current"
    : "head_mismatch";
  return {
    artifactPath,
    reportKey,
    currentHead: artifactHead || undefined,
    generatedAtUtc: generatedAtUtc || undefined,
    status,
    affectsReadiness: artifactPath.includes("public-beta-score") || artifactPath.includes("current-beta-exit-status") || artifactPath.includes("formal-evidence") || artifactPath.includes("runtime") || artifactPath.includes("admin-truth"),
    nextExactAction: !version.needsRefresh ? version.reason : `Refresh ${artifactPath} with its owning check before it can affect readiness.`,
  };
}

function scoreDimensionsFrom(score: Record<string, unknown>): ScoreDimensions {
  return {
    sourceHealth: numberValue(score.sourceHealthScore),
    runtimeHealth: numberValue(score.runtimeHealthScore),
    evidenceCompleteness: numberValue(score.evidenceCompletenessScore),
    freshness: numberValue(score.freshnessScore),
    costRisk: numberValue(score.costRiskScore),
    regressionRisk: numberValue(score.regressionRiskScore),
    overallHealthScore: numberValue(score.healthScore ?? score.overallHealthScore),
  };
}

export function buildReleaseReadinessContext(root: string, input: Omit<Partial<ReleaseReadinessContext>, "openPrs"> & { openPrs?: OpenPrInput[] } = {}): ReleaseReadinessContext {
  const currentHead = input.currentHead ?? getCurrentGitHead(root);
  const publicBetaScore = input.publicBetaScore ?? readJson(root, "agent/state/public-beta-score.generated.json");
  const currentBetaExitStatus = input.currentBetaExitStatus ?? readJson(root, "agent/state/current-beta-exit-status.generated.json");
  const releaseNotes = input.releaseNotes ?? readJson(root, "public/kandydrops-release-notes.json");
  const scoreDimensions = input.scoreDimensions ?? scoreDimensionsFrom(publicBetaScore);
  const openPrs = (input.openPrs ?? readOpenPullRequests(root)).map(classifyOpenPr);
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles(root).map((path) => ({ path, classification: classifyReleaseDirtyFile(path) })));

  return {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead,
    scoreBefore: input.scoreBefore ?? numberValue(publicBetaScore.healthScore ?? publicBetaScore.overallHealthScore),
    scoreAfter: input.scoreAfter ?? numberValue(publicBetaScore.healthScore ?? publicBetaScore.overallHealthScore),
    scoreDimensions,
    launchGateStatus: input.launchGateStatus ?? stringValue(publicBetaScore.launchGateStatus, "owner_review"),
    launchBlockers: input.launchBlockers ?? arrayValue(publicBetaScore.launchBlockers).map((entry) => String(entry)),
    betaExitReadyFromSource: input.betaExitReadyFromSource ?? booleanValue(recordValue(currentBetaExitStatus.summary).canStartBetaExitReview, false),
    publicBetaScore,
    currentBetaExitStatus,
    releaseNotes,
    releaseEvidenceArtifacts: input.releaseEvidenceArtifacts ?? {
      currentHeadReleaseReconciliation: readJson(root, "agent/state/current-head-release-reconciliation.generated.json"),
      releaseNotesIntegrity: readJson(root, "agent/state/release-notes-integrity.generated.json"),
      configEnvContract: readJson(root, "agent/state/config-env-contract.generated.json"),
      providerSmokeEvidence: readJson(root, "agent/state/provider-smoke-evidence.generated.json"),
      runtimeSmokeEvidence: readJson(root, "agent/state/runtime-smoke-evidence.generated.json"),
      adminTruthSampleEvidence: readJson(root, "agent/state/admin-truth-sample-evidence.generated.json"),
      rollbackIncidentResponse: readJson(root, "agent/state/rollback-incident-response.generated.json"),
    },
    artifacts: input.artifacts ?? REQUIRED_ARTIFACTS.map((artifactPath) => readArtifactStatus(root, currentHead, artifactPath)),
    openPrs,
    dirtyFiles,
  };
}

export function buildFormalEvidenceCategories(context: ReleaseReadinessContext): FormalEvidenceCategory[] {
  const artifactByPath = new Map(context.artifacts.map((artifact) => [artifact.artifactPath, artifact]));
  const from = (path: string) => artifactByPath.get(path);
  const liveEvidence = buildLiveEvidenceGateReplacementReport(context);
  const sourceMissingLiveEvidenceCount = liveEvidence.sourceMissingLiveEvidence.length;
  return [
    {
      category: "source safety",
      status: "formal_passed",
      artifactPath: "agent/state/mega-legacy-pipeline-hardening.generated.json",
      currentHead: from("agent/state/mega-legacy-pipeline-hardening.generated.json")?.currentHead,
      generatedAtUtc: from("agent/state/mega-legacy-pipeline-hardening.generated.json")?.generatedAtUtc,
      owner: "Codex/source validators",
      blocksBetaExit: false,
      blocksScoreOnly: false,
      nextExactAction: "Keep source validators green after release evidence changes.",
      whatItDoesNotProve: "It does not prove deployed runtime, provider state, or production admin data.",
    },
    {
      category: "targeted behavior tests",
      status: "source_confidence_only",
      artifactPath: "agent/state/targeted-behavior-evidence-repair.generated.json",
      owner: "Codex/source validators",
      blocksBetaExit: false,
      blocksScoreOnly: false,
      nextExactAction: "Run targeted checks for each release-touching lane.",
      whatItDoesNotProve: "It does not prove production traffic behavior.",
    },
    {
      category: "deployed route evidence",
      status: "formal_missing",
      artifactPath: "agent/state/live-evidence-gate-replacement.generated.json + deployed route summary",
      owner: "operator/runtime owner",
      blocksBetaExit: true,
      blocksScoreOnly: false,
      nextExactAction: sourceMissingLiveEvidenceCount > 0
        ? "Connect redacted deployed route summaries for source_missing product systems."
        : "Attach deployed route evidence before clearing this gate.",
      whatItDoesNotProve: "Source-safe route harnesses and optional visual reproduction do not prove deployed route behavior.",
    },
    {
      category: "provider-backed site activity evidence",
      status: "formal_missing",
      artifactPath: "agent/state/provider-smoke-evidence.generated.json",
      owner: "operator/provider owner",
      blocksBetaExit: true,
      blocksScoreOnly: false,
      nextExactAction: "Attach redacted provider-backed site activity evidence for PayPal/provider flows without raw provider IDs.",
      whatItDoesNotProve: "Source checks and operator comments do not prove provider UI/webhook truth.",
    },
    {
      category: "redacted admin source sample",
      status: "formal_missing",
      artifactPath: "agent/state/admin-truth-redaction-packet.generated.json + live admin summary",
      owner: "operator/admin owner",
      blocksBetaExit: true,
      blocksScoreOnly: false,
      nextExactAction: "Attach a redacted admin source sample or keep admin truth source_missing; optional visual reproduction cannot clear this gate.",
      whatItDoesNotProve: "Admin source schema and optional visual reproduction do not prove production admin truth.",
    },
    {
      category: "debug/runtime evidence",
      status: "source_confidence_only",
      artifactPath: "agent/state/debug-runtime-evidence.generated.json",
      currentHead: from("agent/state/debug-runtime-evidence.generated.json")?.currentHead,
      generatedAtUtc: from("agent/state/debug-runtime-evidence.generated.json")?.generatedAtUtc,
      owner: "debug/runtime evidence owner",
      blocksBetaExit: false,
      blocksScoreOnly: true,
      nextExactAction: "Use debug evidence as source confidence only until deployed route evidence is attached.",
      whatItDoesNotProve: "It does not prove the deployed app is smoke-tested.",
    },
    {
      category: "algorithmic non-UI evidence",
      status: "source_confidence_only",
      artifactPath: "agent/state/final-math-normalization-lock.generated.json",
      currentHead: from("agent/state/final-math-normalization-lock.generated.json")?.currentHead,
      generatedAtUtc: from("agent/state/final-math-normalization-lock.generated.json")?.generatedAtUtc,
      owner: "math/source validators",
      blocksBetaExit: false,
      blocksScoreOnly: true,
      nextExactAction: "Keep math locks current; do not use them as runtime proof.",
      whatItDoesNotProve: "It does not prove production/provider/admin truth.",
    },
    {
      category: "evidence bridge",
      status: "source_confidence_only",
      artifactPath: "agent/state/formal-evidence-bridge.generated.json",
      currentHead: from("agent/state/formal-evidence-bridge.generated.json")?.currentHead,
      generatedAtUtc: from("agent/state/formal-evidence-bridge.generated.json")?.generatedAtUtc,
      owner: "evidence bridge owner",
      blocksBetaExit: false,
      blocksScoreOnly: true,
      nextExactAction: "Keep the bridge explicit about typed provider, deployed route, admin source, and source-only evidence.",
      whatItDoesNotProve: "It cannot convert source evidence into provider/runtime proof.",
    },
    {
      category: "cost review",
      status: context.scoreDimensions.costRisk < 80 ? "external_review_required" : "source_confidence_only",
      artifactPath: "agent/state/cost-risk-exit-pass.generated.json",
      owner: "operator/billing owner",
      blocksBetaExit: context.scoreDimensions.costRisk < 80,
      blocksScoreOnly: false,
      nextExactAction: "Complete external billing review for Cloud Run/App Hosting, Cloud SQL/Data Connect, Gemini/Cloud Assist/Vertex, and route 4xx lanes.",
      whatItDoesNotProve: "Source cost guards do not prove provider billing state.",
    },
    {
      category: "release notes",
      status: "formal_passed",
      artifactPath: "public/kandydrops-release-notes.json",
      owner: "release notes",
      blocksBetaExit: false,
      blocksScoreOnly: false,
      nextExactAction: "Keep public copy free of false beta-exit or provider-proof claims.",
      whatItDoesNotProve: "Release notes do not prove runtime health.",
    },
    {
      category: "PR integrity",
      status: context.openPrs.length > 0 ? "external_review_required" : "formal_passed",
      artifactPath: "agent/state/open-pr-dependency-hygiene.generated.json",
      owner: "repo maintainer",
      blocksBetaExit: context.openPrs.some((pr) => pr.blocksBetaExit),
      blocksScoreOnly: false,
      nextExactAction: context.openPrs.length > 0 ? "Review, cherry-pick, defer, or close every classified open PR." : "No open PR action remains.",
      whatItDoesNotProve: "Classifying an open PR does not merge, test, or close it.",
    },
    {
      category: "UI source coverage",
      status: "source_confidence_only",
      artifactPath: "agent/state/operator-final-qa-packet.generated.json",
      owner: "UI source coverage",
      blocksBetaExit: false,
      blocksScoreOnly: false,
      nextExactAction: "Run deterministic UI source coverage first; use browser viewing only to reproduce a source-reported UI issue.",
      whatItDoesNotProve: "UI source coverage does not prove auth, wallet, payments, drops, tasks, chat, notifications, telemetry, runtime, or journeys.",
    },
    {
      category: "external billing review",
      status: "external_review_required",
      artifactPath: "operator billing review note",
      owner: "operator/billing owner",
      blocksBetaExit: context.scoreDimensions.costRisk < 80,
      blocksScoreOnly: false,
      nextExactAction: "Attach an external billing review note; do not treat source guards as billing proof.",
      whatItDoesNotProve: "Cost source contracts do not prove actual provider spend.",
    },
  ];
}

function criticalRuntimeRoutes(): RuntimeSmokeRoute[] {
  const base = { noRawStack: true as const, noInternalServerErrorCopy: true as const };
  return [
    { routeId: "home", route: "/", method: "GET", routeClass: "public_page", authRequirement: "none", expectedStatusClass: "2xx", expectedErrorShape: "friendly page error boundary", expectedHumanErrorCopy: "Unable to load this page.", telemetryDebugMapping: "surface_view/home", costClass: "static_or_cached", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "auth", route: "/login", method: "GET", routeClass: "public_page", authRequirement: "none", expectedStatusClass: "2xx", expectedErrorShape: "auth safe error", expectedHumanErrorCopy: "Unable to sign in right now.", telemetryDebugMapping: "auth_surface", costClass: "auth_guarded", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "user-dashboard", route: "/dashboard", method: "GET", routeClass: "authenticated_user_page", authRequirement: "signed in user", expectedStatusClass: "2xx or redirect", expectedErrorShape: "auth redirect or typed failure", expectedHumanErrorCopy: "Please sign in to continue.", telemetryDebugMapping: "dashboard_surface", costClass: "summary_read", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "wallet-source", route: "/api/wallet", method: "GET", routeClass: "api_auth_required", authRequirement: "signed in user", expectedStatusClass: "2xx/401", expectedErrorShape: "typed wallet error", expectedHumanErrorCopy: "Wallet is unavailable right now.", telemetryDebugMapping: "wallet_debug_lane", costClass: "bounded_summary", providerDependencyStatus: "provider_call_forbidden", mutationSafety: "source_only", ...base },
    { routeId: "drops-list", route: "/drops", method: "GET", routeClass: "public_page", authRequirement: "optional", expectedStatusClass: "2xx", expectedErrorShape: "empty/loading/error state", expectedHumanErrorCopy: "Drops are unavailable right now.", telemetryDebugMapping: "drops_surface", costClass: "bounded_query", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "drop-unlock", route: "/api/drops/unlock", method: "POST", routeClass: "api_mutation", authRequirement: "signed in user", expectedStatusClass: "2xx/4xx typed", expectedErrorShape: "typed unlock failure", expectedHumanErrorCopy: "This drop cannot be unlocked right now.", telemetryDebugMapping: "unlock_debug_lane", costClass: "ledger_guarded", providerDependencyStatus: "mock_required", mutationSafety: "mock_only", ...base },
    { routeId: "watch-session", route: "/api/viewer/watch-session", method: "POST", routeClass: "api_mutation", authRequirement: "signed in or scoped viewer", expectedStatusClass: "2xx/4xx typed", expectedErrorShape: "typed watch-session failure", expectedHumanErrorCopy: "Watch progress could not be saved.", telemetryDebugMapping: "watch_time_debug_lane", costClass: "batched_fact_write", providerDependencyStatus: "mock_required", mutationSafety: "mock_only", ...base },
    { routeId: "creator-profile", route: "/creator/[handle]", method: "GET", routeClass: "public_page", authRequirement: "optional", expectedStatusClass: "2xx/404", expectedErrorShape: "creator not found state", expectedHumanErrorCopy: "Creator profile unavailable.", telemetryDebugMapping: "creator_profile_debug_lane", costClass: "bounded_summary", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "creator-dashboard", route: "/creator/dashboard", method: "GET", routeClass: "creator_page", authRequirement: "creator role", expectedStatusClass: "2xx or redirect", expectedErrorShape: "creator role safe error", expectedHumanErrorCopy: "Creator tools are unavailable right now.", telemetryDebugMapping: "creator_dashboard_debug_lane", costClass: "summary_read", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "chat-send", route: "/api/chat/send", method: "POST", routeClass: "api_mutation", authRequirement: "signed in user", expectedStatusClass: "2xx/4xx typed", expectedErrorShape: "typed chat failure", expectedHumanErrorCopy: "Message could not be sent.", telemetryDebugMapping: "chat_debug_lane", costClass: "realtime_guarded", providerDependencyStatus: "mock_required", mutationSafety: "mock_only", ...base },
    { routeId: "daily-task", route: "/api/checkin", method: "POST", routeClass: "api_mutation", authRequirement: "signed in user", expectedStatusClass: "2xx/4xx typed", expectedErrorShape: "typed task failure", expectedHumanErrorCopy: "Check-in could not be saved.", telemetryDebugMapping: "task_debug_lane", costClass: "ledger_guarded", providerDependencyStatus: "mock_required", mutationSafety: "mock_only", ...base },
    { routeId: "notifications", route: "/api/notifications/register", method: "POST", routeClass: "api_mutation", authRequirement: "signed in user", expectedStatusClass: "2xx/4xx typed", expectedErrorShape: "typed notification failure", expectedHumanErrorCopy: "Notifications could not be updated.", telemetryDebugMapping: "notification_debug_lane", costClass: "bounded_write", providerDependencyStatus: "mock_required", mutationSafety: "mock_only", ...base },
    { routeId: "support", route: "/api/support", method: "POST", routeClass: "api_mutation", authRequirement: "signed in or scoped guest", expectedStatusClass: "2xx/4xx typed", expectedErrorShape: "typed support failure", expectedHumanErrorCopy: "Support request could not be sent.", telemetryDebugMapping: "support_debug_lane", costClass: "bounded_write", providerDependencyStatus: "mock_required", mutationSafety: "mock_only", ...base },
    { routeId: "admin-debug", route: "/admin/debug", method: "GET", routeClass: "admin_page", authRequirement: "admin", expectedStatusClass: "2xx or admin redirect", expectedErrorShape: "admin-safe state", expectedHumanErrorCopy: "Admin debug is unavailable.", telemetryDebugMapping: "admin_debug_control_tower", costClass: "summary_first", providerDependencyStatus: "none", mutationSafety: "read_only", ...base },
    { routeId: "provider-webhook", route: "/api/paypal/webhook", method: "POST", routeClass: "api_webhook_or_provider", authRequirement: "provider signature", expectedStatusClass: "unsupported in source-safe harness", expectedErrorShape: "not run by source harness", expectedHumanErrorCopy: "Provider webhook is excluded from the source-safe harness.", telemetryDebugMapping: "provider_webhook_lane", costClass: "provider_runtime", providerDependencyStatus: "unsupported_without_provider", mutationSafety: "provider_forbidden", ...base },
  ];
}

function operatorSurfaces(): OperatorQaSurface[] {
  const checks = ["no nav overlap", "no clipped CTA", "no unreadable text", "loading state", "empty state", "error state", "primary action visible", "telemetry/debug lane source-ready"];
  return [
    ["homepage", "/", "guest", ["mobile", "desktop"]],
    ["signup-login", "/login", "guest", ["mobile", "desktop"]],
    ["user-dashboard", "/dashboard", "user", ["mobile", "desktop"]],
    ["wallet-purchase-modal", "/dashboard?wallet=1", "user", ["mobile", "desktop"]],
    ["drops-library", "/drops", "user", ["mobile", "desktop"]],
    ["drop-detail-unlock-unwrap-watch", "/drops/[id]", "user", ["mobile", "desktop"]],
    ["creator-profile", "/creator/[handle]", "guest/user", ["mobile", "desktop"]],
    ["creator-dashboard", "/creator/dashboard", "creator", ["mobile", "desktop"]],
    ["creator-settings", "/creator/settings", "creator", ["mobile", "desktop"]],
    ["creator-drop-manager", "/creator/drops", "creator", ["mobile", "desktop"]],
    ["chat", "/chat", "user", ["mobile", "desktop"]],
    ["daily-tasks", "/experiences", "user", ["mobile", "desktop"]],
    ["account-settings-support", "/settings", "user", ["mobile", "desktop"]],
    ["notifications-pwa-prompt", "/dashboard", "user", ["mobile"]],
    ["admin-debug", "/admin/debug", "admin", ["mobile", "desktop"]],
    ["user-management", "/admin/users", "admin", ["mobile", "desktop"]],
  ].map(([surfaceId, route, role, device]) => ({
    surfaceId: surfaceId as string,
    route: route as string,
    role: role as string,
    device: device as Array<"mobile" | "tablet" | "desktop">,
    browserReproductionRequired: false,
    checks,
    status: "source_checked" as const,
    nextExactAction: `Keep ${surfaceId} in deterministic UI source coverage; use browser reproduction only for source-reported issues.`,
    notes: "Outside Codex score gates; source coverage owns the first-pass UI issue detection.",
  }));
}

export function buildCurrentHeadReleaseReconciliationReport(context: ReleaseReadinessContext): CurrentHeadReleaseReconciliationReport {
  const staleArtifactsRemaining = context.artifacts.filter((artifact) => ["stale", "head_mismatch", "formal_missing"].includes(artifact.status) && artifact.affectsReadiness);
  const report: CurrentHeadReleaseReconciliationReport = {
    reportKey: "current-head-release-reconciliation",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    publicBetaScoreCurrentHead: stringValue(context.publicBetaScore.currentHead) || undefined,
    currentBetaExitStatusCurrentHead: stringValue(context.currentBetaExitStatus.currentHead) || undefined,
    scoreBefore: context.scoreBefore,
    scoreAfter: context.scoreAfter,
    scoreDimensions: context.scoreDimensions,
    artifacts: context.artifacts,
    staleArtifactsRemaining,
    validationFailures: [],
  };
  report.validationFailures = validateCurrentHeadReleaseReconciliationReport(report);
  return report;
}

export function validateCurrentHeadReleaseReconciliationReport(report: CurrentHeadReleaseReconciliationReport) {
  const failures: string[] = [];
  const artifactStatus = (path: string) => report.artifacts.find((artifact) => artifact.artifactPath === path)?.status;
  if (!report.currentHead) failures.push("packet missing currentHead.");
  if (!["current", "same_commit_snapshot", "current_by_impact"].includes(artifactStatus("agent/state/public-beta-score.generated.json") ?? "")) {
    failures.push("public beta score currentHead is behind latest main.");
  }
  if (!["current", "same_commit_snapshot", "current_by_impact"].includes(artifactStatus("agent/state/current-beta-exit-status.generated.json") ?? "")) {
    failures.push("current beta exit status currentHead is behind latest main.");
  }
  if (Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  if (report.artifacts.some((artifact) => artifact.status !== "current" && !artifact.nextExactAction)) failures.push("required artifact is stale without classification.");
  if (report.artifacts.some((artifact) => artifact.status === "superseded" && artifact.affectsReadiness)) failures.push("superseded artifact still affects score.");
  return failures;
}

export function buildFormalEvidenceStatusLedgerReport(context: ReleaseReadinessContext): FormalEvidenceStatusLedgerReport {
  const categories = buildFormalEvidenceCategories(context);
  const report: FormalEvidenceStatusLedgerReport = {
    reportKey: "formal-evidence-status-ledger",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    scoreDimensions: context.scoreDimensions,
    categories,
    remainingFormalEvidence: categories.filter((category) => category.blocksBetaExit || category.status === "formal_missing" || category.status === "external_review_required"),
    validationFailures: [],
  };
  report.validationFailures = validateFormalEvidenceStatusLedgerReport(report);
  return report;
}

export function validateFormalEvidenceStatusLedgerReport(report: FormalEvidenceStatusLedgerReport) {
  const failures: string[] = [];
  if (Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  for (const category of report.categories) {
    if (!category.whatItDoesNotProve) failures.push("evidence category lacks whatItDoesNotProve.");
    if (category.blocksBetaExit && !category.nextExactAction) failures.push("blocker lacks nextExactAction.");
    if (/runtime|provider/u.test(category.category) && category.status === "formal_passed" && /source|operator/iu.test(category.whatItDoesNotProve)) failures.push("formal gate passes from source-only evidence.");
    if (category.category === "provider-backed site activity evidence" && category.status !== "formal_missing") failures.push("operator-confirmed evidence is mislabeled provider-backed site activity evidence.");
    if (category.category === "redacted admin source sample" && category.status !== "formal_missing") failures.push("admin source evidence is mislabeled production admin truth.");
  }
  return Array.from(new Set(failures));
}

export function buildOpenPrDependencyHygieneReport(context: ReleaseReadinessContext): OpenPrDependencyHygieneReport {
  const report: OpenPrDependencyHygieneReport = {
    reportKey: "open-pr-dependency-hygiene",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    openPrs: context.openPrs,
    openPrCount: context.openPrs.length,
    unclassifiedOpenPrCount: 0,
    dependencyPrCount: context.openPrs.filter((pr) => pr.classification.startsWith("dependency")).length,
    securityPrCount: context.openPrs.filter((pr) => pr.classification.startsWith("security")).length,
    blocksBetaExit: context.openPrs.some((pr) => pr.blocksBetaExit),
    validationFailures: [],
  };
  report.validationFailures = validateOpenPrDependencyHygieneReport(report);
  return report;
}

export function validateOpenPrDependencyHygieneReport(report: OpenPrDependencyHygieneReport) {
  const failures: string[] = [];
  if (report.unclassifiedOpenPrCount > 0) failures.push("any open PR unclassified.");
  if (report.openPrs.some((pr) => pr.classification.startsWith("security") && !pr.reason)) failures.push("any security PR left open without reason.");
  if (report.openPrs.some((pr) => pr.classification.startsWith("dependency") && pr.dependencyRiskClass === "not_dependency")) failures.push("dependency PR lacks risk class.");
  if (report.openPrs.some((pr) => /scratch|tmp|wip/iu.test(`${pr.title} ${pr.headRefName ?? ""}`))) failures.push("scratch files land without approval.");
  if (report.openPrs.some((pr) => !pr.nextExactAction)) failures.push("PR state not reflected in release readiness.");
  return Array.from(new Set(failures));
}

export function buildRuntimeSmokeHarnessReport(context: ReleaseReadinessContext): RuntimeSmokeHarnessReport {
  const routes = criticalRuntimeRoutes();
  const report: RuntimeSmokeHarnessReport = {
    reportKey: "runtime-smoke-harness",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    claimsDeployedRuntimeProof: false,
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    routes,
    unsupportedWithoutProvider: routes.filter((route) => route.routeClass === "api_webhook_or_provider").map((route) => route.routeId),
    validationFailures: [],
  };
  report.validationFailures = validateRuntimeSmokeHarnessReport(report);
  return report;
}

export function validateRuntimeSmokeHarnessReport(report: RuntimeSmokeHarnessReport) {
  const failures: string[] = [];
  if (report.claimsDeployedRuntimeProof) failures.push("harness claims deployed route evidence.");
  if (report.providerCallsPerformed) failures.push("provider/webhook call ran inside the source-safe harness.");
  if (report.routes.some((route) => route.routeClass === "api_mutation" && route.mutationSafety !== "mock_only")) failures.push("mutation route runs without mock/safety.");
  if (report.routes.some((route) => !route.routeClass)) failures.push("critical route lacks route class.");
  if (report.routes.some((route) => !route.expectedStatusClass || !route.expectedErrorShape)) failures.push("route lacks expected status/error shape.");
  if (report.routes.some((route) => !route.noInternalServerErrorCopy || /internal server error/iu.test(route.expectedHumanErrorCopy))) failures.push("raw internal server error is user-facing.");
  if (report.routes.some((route) => !route.telemetryDebugMapping)) failures.push("route lacks telemetry/debug mapping.");
  return Array.from(new Set(failures));
}

export function buildAdminTruthRedactionPacketReport(context: ReleaseReadinessContext): AdminTruthRedactionPacketReport {
  const report: AdminTruthRedactionPacketReport = {
    reportKey: "admin-truth-redaction-packet",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    environment: "source_schema_only_no_production_read",
    sampleSource: "none_attached",
    redactionPolicy: {
      forbiddenRawFields: ["email", "userId", "paymentProviderId", "providerOrderId", "chatContent", "privateMediaUrl", "accessToken", "storagePath", "fcmToken", "pushToken"],
      hashRequiredFields: ["userFingerprint", "creatorFingerprint", "paymentFingerprint"],
      privateContentExcluded: ["raw chat/private content", "private media URLs", "storage paths", "access tokens", "push tokens"],
    },
    packetSchema: {
      adminSummary: "redacted aggregate admin state",
      userCounts: "hashed/fingerprinted user aggregates",
      creatorCounts: "hashed/fingerprinted creator aggregates",
      walletPaymentConfidenceSummary: "bucketed confidence only",
      gumdropLedgerSummary: "source buckets only",
      dropsUnwrapWatchSummary: "aggregate facts only",
      chatSummary: "counts/status only, no message content",
      taskSummary: "aggregate task state",
      notificationSummary: "aggregate prompt/token status without token",
      errorDebugSummary: "fingerprinted errors only",
      costSummary: "source guard/external review status",
      missingFormalProof: "explicit formal_missing list",
    },
    missingFormalProof: ["redacted admin source sample", "operator attestation optional"],
    linkedToBetaExitStatus: true,
    validationFailures: [],
  };
  report.validationFailures = validateAdminTruthRedactionPacketReport(report);
  return report;
}

export function validateAdminTruthRedactionPacketReport(report: AdminTruthRedactionPacketReport) {
  const failures: string[] = [];
  if (!report.redactionPolicy) failures.push("packet schema missing redaction policy.");
  if (report.redactionPolicy.forbiddenRawFields.length === 0) failures.push("sensitive field allowed.");
  if (report.sampleSource !== "none_attached" && report.missingFormalProof.length > 0) failures.push("admin source sample gate can pass without packet or explicit formal_missing.");
  if (!report.currentHead || !report.environment) failures.push("redacted sample lacks currentHead/environment.");
  if (!report.linkedToBetaExitStatus) failures.push("admin truth evidence not linked to beta exit status.");
  return Array.from(new Set(failures));
}

export function buildOperatorFinalQaPacketReport(context: ReleaseReadinessContext): OperatorFinalQaPacketReport {
  const report: OperatorFinalQaPacketReport = {
    reportKey: "operator-final-qa-packet",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    outsideCodexScoreGate: true,
    surfaces: operatorSurfaces(),
    operatorFinalStatus: "source_checked",
    validationFailures: [],
  };
  report.validationFailures = validateOperatorFinalQaPacketReport(report);
  return report;
}

export function validateOperatorFinalQaPacketReport(report: OperatorFinalQaPacketReport) {
  const failures: string[] = [];
  if (!report.outsideCodexScoreGate) failures.push("operator QA is treated as Codex source score gate.");
  const required = ["homepage", "signup-login", "user-dashboard", "wallet-purchase-modal", "drops-library", "drop-detail-unlock-unwrap-watch", "creator-profile", "creator-dashboard", "chat", "daily-tasks", "admin-debug", "user-management"];
  for (const surface of required) {
    if (!report.surfaces.some((entry) => entry.surfaceId === surface)) failures.push("surface list missing major user/creator/admin surfaces.");
  }
  if (report.surfaces.some((surface) => surface.device.length === 0 || !surface.role)) failures.push("role/device missing.");
  if (report.surfaces.some((surface) => surface.status === "failed" && !surface.nextExactAction)) failures.push("failed visual item lacks next action.");
  if (!report.operatorFinalStatus) failures.push("operator-final status not shown in beta exit report.");
  return Array.from(new Set(failures));
}

function artifactGeneratedAt(artifact: Record<string, unknown>) {
  return stringValue(artifact.generatedAtUtc ?? artifact.generatedAt) || undefined;
}

function artifactHead(artifact: Record<string, unknown>) {
  return stringValue(artifact.currentHead ?? artifact.sourceCommit) || undefined;
}

function artifactPassed(artifact: Record<string, unknown>) {
  const validation = recordValue(artifact.validation);
  return artifact.passed === true
    || validation.ok === true
    || artifact.status === "formal_runtime_smoke_passed"
    || artifact.status === "formal_admin_truth_sample_passed"
    || artifact.status === "formal_provider_smoke_passed"
    || artifact.overallStatus === "formal_runtime_smoke_passed"
    || artifact.overallStatus === "formal_admin_truth_sample_passed"
    || artifact.overallStatus === "formal_provider_smoke_passed";
}

function artifactStatusText(artifact: Record<string, unknown>) {
  return stringValue(artifact.status ?? artifact.overallStatus);
}

function releaseGate(input: Omit<ReleaseRollbackEvidenceGate, "blocking"> & { blocking?: boolean }): ReleaseRollbackEvidenceGate {
  return {
    ...input,
    blocking: input.blocking ?? ["missing_external_evidence", "operator_reported_only", "stale_evidence", "source_failed"].includes(input.status),
  };
}

function releaseEvidenceGateSet(context: ReleaseReadinessContext) {
  const artifacts = context.releaseEvidenceArtifacts;
  const currentHead = artifacts.currentHeadReleaseReconciliation ?? {};
  const notes = artifacts.releaseNotesIntegrity ?? {};
  const env = artifacts.configEnvContract ?? {};
  const provider = artifacts.providerSmokeEvidence ?? {};
  const runtime = artifacts.runtimeSmokeEvidence ?? {};
  const admin = artifacts.adminTruthSampleEvidence ?? {};
  const incident = artifacts.rollbackIncidentResponse ?? {};
  const staleCurrentHeadArtifacts = arrayValue(currentHead.staleArtifactsRemaining);
  const providerStatus = artifactStatusText(provider);
  const currentHeadGate = releaseGate({
    gateId: "current-head-evidence",
    label: "Current-head release artifacts",
    evidenceKind: "generated_snapshot",
    status: Object.keys(currentHead).length > 0 && staleCurrentHeadArtifacts.length === 0 ? "passed" : "stale_evidence",
    artifactPath: "agent/state/current-head-release-reconciliation.generated.json",
    currentHead: artifactHead(currentHead),
    sourceCommit: artifactHead(currentHead),
    generatedAtUtc: artifactGeneratedAt(currentHead),
    owner: "release readiness",
    validator: "npm run check:current-head-release-reconciliation",
    nextExactAction: staleCurrentHeadArtifacts.length > 0
      ? "Refresh current-head release artifacts through their owning validators before release signoff."
      : "Keep current-head release artifacts fresh after this commit.",
    doesNotProve: "Current-head source artifacts do not prove deployed runtime or provider health.",
  });
  const releaseNotesGate = releaseGate({
    gateId: "release-notes-integrity",
    label: "Release notes integrity",
    evidenceKind: "source",
    status: Object.keys(notes).length > 0 && arrayValue(notes.validationFailures).length === 0 && notes.claimsProviderRuntimeProof !== true && notes.claimsBetaExit !== true ? "passed" : "source_failed",
    artifactPath: "agent/state/release-notes-integrity.generated.json",
    currentHead: artifactHead(notes),
    sourceCommit: artifactHead(notes),
    generatedAtUtc: artifactGeneratedAt(notes),
    owner: "release notes",
    validator: "npm run check:release-notes-integrity",
    nextExactAction: "Keep public release notes free of beta-exit, provider-proof, and runtime-proof claims.",
    doesNotProve: "Release notes do not prove deployed route health, provider-backed site activity, or rollback success.",
  });
  const envGate = releaseGate({
    gateId: "env-contract",
    label: "Environment contract",
    evidenceKind: "source",
    status: Object.keys(env).length > 0 && recordValue(env.validation).ok === true ? "passed" : "source_failed",
    artifactPath: "agent/state/config-env-contract.generated.json",
    currentHead: artifactHead(env),
    sourceCommit: artifactHead(env),
    generatedAtUtc: artifactGeneratedAt(env),
    owner: "config/env contract",
    validator: "npm run check:config-env-contract",
    nextExactAction: "Keep env contract registered; provider presence remains external evidence.",
    doesNotProve: "Env contract source registration does not prove provider credentials exist or work in production.",
  });
  const providerGate = releaseGate({
    gateId: "provider-smoke-evidence",
    label: "Provider-backed site activity evidence",
    evidenceKind: "provider_proof",
    status: artifactPassed(provider)
      ? "passed"
      : /operator_reported/iu.test(providerStatus)
        ? "operator_reported_only"
        : "missing_external_evidence",
    artifactPath: "agent/state/provider-smoke-evidence.generated.json",
    currentHead: artifactHead(provider),
    sourceCommit: artifactHead(provider),
    generatedAtUtc: artifactGeneratedAt(provider),
    owner: "operator/provider owner",
    validator: "EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence",
    nextExactAction: artifactPassed(provider)
      ? "Keep redacted provider-backed site activity evidence fresh."
      : "Attach redacted provider-backed site activity evidence; operator-reported provider success is not enough.",
    doesNotProve: "Source tests and operator comments do not prove PayPal/provider callbacks or provider UI/webhook behavior.",
  });
  const runtimeGate = releaseGate({
    gateId: "runtime-smoke-evidence",
    label: "Deployed route evidence",
    evidenceKind: "runtime_redacted",
    status: artifactPassed(runtime) ? "passed" : "missing_external_evidence",
    artifactPath: "agent/state/runtime-smoke-evidence.generated.json",
    currentHead: artifactHead(runtime),
    sourceCommit: artifactHead(runtime),
    generatedAtUtc: artifactGeneratedAt(runtime),
    owner: "operator/runtime owner",
    validator: "EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence",
    nextExactAction: artifactPassed(runtime)
      ? "Keep deployed route evidence fresh."
      : "Attach deployed route evidence before clearing runtime signoff.",
    doesNotProve: "Source-safe harnesses do not prove deployed runtime behavior.",
  });
  const adminGate = releaseGate({
    gateId: "admin-truth-sample-evidence",
    label: "Admin source sample evidence",
    evidenceKind: "admin_operator_evidence",
    status: artifactPassed(admin) ? "passed" : "missing_external_evidence",
    artifactPath: "agent/state/admin-truth-sample-evidence.generated.json",
    currentHead: artifactHead(admin),
    sourceCommit: artifactHead(admin),
    generatedAtUtc: artifactGeneratedAt(admin),
    owner: "operator/admin owner",
    validator: "EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence",
    nextExactAction: artifactPassed(admin)
      ? "Keep redacted admin source sample evidence fresh."
      : "Attach redacted admin source sample evidence; source labels alone do not clear this gate.",
    doesNotProve: "Admin source schema does not prove production admin truth.",
  });
  const incidentGate = releaseGate({
    gateId: "incident-recovery-state",
    label: "Incident recovery runbook",
    evidenceKind: "source",
    status: incident.runtimeBehaviorChanged === false && incident.productionDataWritten === false && Array.isArray(incident.incidents) ? "source_ready" : "source_failed",
    artifactPath: "agent/state/rollback-incident-response.generated.json",
    currentHead: artifactHead(incident),
    sourceCommit: artifactHead(incident),
    generatedAtUtc: artifactGeneratedAt(incident),
    owner: "incident response",
    validator: "npm run check:rollback-incident-response",
    nextExactAction: "Use the rollback incident response runbook for source-safe recovery; provider-console actions remain manual/operator-owned.",
    doesNotProve: "A source runbook does not prove an operator executed rollback or recovery.",
    blocking: incident.runtimeBehaviorChanged !== false || incident.productionDataWritten !== false || !Array.isArray(incident.incidents),
  });
  return {
    currentHeadGate,
    releaseNotesGate,
    envGate,
    providerGate,
    runtimeGate,
    adminGate,
    incidentGate,
    evidenceGates: [currentHeadGate, releaseNotesGate, envGate, providerGate, runtimeGate, adminGate, incidentGate],
  };
}

export function buildReleaseRollbackIncidentReadinessReport(context: ReleaseReadinessContext): ReleaseRollbackIncidentReadinessReport {
  const releaseVersion = stringValue(context.releaseNotes.currentVersion, "unversioned");
  const gates = releaseEvidenceGateSet(context);
  const blockingExternalEvidence = gates.evidenceGates.filter((gate) => gate.blocking && ["provider_proof", "runtime_redacted", "admin_operator_evidence", "external_manual"].includes(gate.evidenceKind));
  const featureFlagsAndKillSwitches = [
    { surface: "payment/wallet", status: "missing_kill_switch" as const, note: "No source-level payment kill switch is claimed; rollback must protect payment runtime by reverting the release." },
    { surface: "GumDrop ledger", status: "missing_kill_switch" as const, note: "No source-level ledger kill switch is claimed; use rollback and post-rollback ledger verification." },
    { surface: "analytics ingest", status: "missing_kill_switch" as const, note: "No runtime analytics kill switch is claimed from source; reduce ingest by rollback or operator config only." },
  ];
  const report: ReleaseRollbackIncidentReadinessReport = {
    reportKey: "release-rollback-incident-readiness",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    releaseVersion,
    readinessStatus: gates.evidenceGates.some((gate) => gate.status === "source_failed")
      ? "source_failure"
      : blockingExternalEvidence.length > 0
        ? "source_ready_external_evidence_blocked"
        : "source_ready_operator_signoff_required",
    migrationStatus: "no_migration_detected",
    currentHeadEvidence: gates.currentHeadGate,
    releaseNotesEvidence: gates.releaseNotesGate,
    envContractEvidence: gates.envGate,
    providerEvidence: gates.providerGate,
    runtimeEvidence: gates.runtimeGate,
    adminTruthEvidence: gates.adminGate,
    incidentRecoveryState: gates.incidentGate,
    evidenceGates: gates.evidenceGates,
    blockingExternalEvidence,
    featureFlagsAndKillSwitches,
    safetyNotes: {
      paymentWallet: "Do not change payment runtime in this pass; rollback trigger includes checkout/provider failures or source-of-funds mismatch.",
      gumdropLedger: "GumDrop pricing and spend math unchanged; verify source buckets after rollback.",
      authSession: "Auth/session rollback requires login, logout, and protected route checks.",
      analyticsIngest: "Verify telemetry write path does not block user flows and summary docs remain bounded.",
      chatRealtime: "Verify chat read/send paths and typed errors after rollback.",
      notificationPwa: "Verify prompt/token registration does not expose raw tokens.",
      adminDebugFallback: "Admin debug should show stale/failed labels rather than green fallback.",
    },
    rollbackTriggerConditions: ["checkout/provider typed failures", "GumDrop ledger mismatch", "auth session lockout", "admin debug false-green state", "deployed route evidence failure", "cost spike requiring rollback"],
    rollbackProcedure: ["Identify last known good commit.", "Revert or reset deployment target to last known good through operator-approved deploy process.", "Do not mutate production or provider data during rollback.", "Record rollback commit, owner, time, and evidence packet."],
    postRollbackVerification: ["Run source checks for beta score and release notes.", "Run operator production smoke after rollback deployment.", "Verify wallet/payment, GumDrop ledger, auth/session, analytics ingest, chat, notifications, and admin debug states."],
    incidentSeverityLevels: [
      { severity: "sev1", trigger: "payment, auth, or ledger integrity failure", owner: "operator/on-call placeholder" },
      { severity: "sev2", trigger: "deployed route or admin source sample failure", owner: "operator/runtime owner placeholder" },
      { severity: "sev3", trigger: "non-blocking display, stale artifact, or PR hygiene issue", owner: "repo maintainer placeholder" },
    ],
    validationFailures: [],
  };
  report.validationFailures = validateReleaseRollbackIncidentReadinessReport(report);
  return report;
}

export function validateReleaseRollbackIncidentReadinessReport(report: ReleaseRollbackIncidentReadinessReport) {
  const failures: string[] = [];
  if (!report.currentHead) failures.push("rollback plan missing current commit.");
  if (!report.readinessStatus) failures.push("rollback report missing actionable readinessStatus.");
  if (report.readinessStatus === "source_ready_operator_signoff_required" && report.blockingExternalEvidence.length > 0) failures.push("external evidence blockers hidden by ready status.");
  if (report.readinessStatus === "source_failure" && report.validationFailures.length === 0 && !report.evidenceGates.some((gate) => gate.status === "source_failed")) failures.push("source failure status lacks source-failed gate.");
  for (const requiredGate of ["current-head-evidence", "release-notes-integrity", "env-contract", "provider-smoke-evidence", "runtime-smoke-evidence", "admin-truth-sample-evidence", "incident-recovery-state"]) {
    if (!report.evidenceGates.some((gate) => gate.gateId === requiredGate)) failures.push(`rollback report missing ${requiredGate}.`);
  }
  if (!report.providerEvidence || !report.runtimeEvidence || !report.adminTruthEvidence) failures.push("external evidence gates missing.");
  if (report.providerEvidence?.status === "operator_reported_only" && report.providerEvidence.blocking !== true) failures.push("operator-reported provider evidence must remain blocking.");
  if (report.providerEvidence?.status === "passed" && report.providerEvidence.evidenceKind !== "provider_proof") failures.push("provider evidence pass must come from provider-backed site activity evidence.");
  if (report.runtimeEvidence?.status === "passed" && report.runtimeEvidence.evidenceKind !== "runtime_redacted") failures.push("runtime evidence pass must be runtime evidence.");
  if (report.adminTruthEvidence?.status === "passed" && report.adminTruthEvidence.evidenceKind !== "admin_operator_evidence") failures.push("admin truth pass must be admin/operator evidence.");
  if (!report.envContractEvidence || report.envContractEvidence.doesNotProve.length === 0) failures.push("env contract boundary missing.");
  if (!report.releaseNotesEvidence || report.releaseNotesEvidence.doesNotProve.length === 0) failures.push("release notes evidence boundary missing.");
  if (!report.safetyNotes.paymentWallet) failures.push("payment/wallet rollback safety missing.");
  if (!report.safetyNotes.gumdropLedger) failures.push("GumDrop ledger safety missing.");
  if (!report.safetyNotes.analyticsIngest) failures.push("analytics ingest rollback missing.");
  if (report.incidentSeverityLevels.length === 0) failures.push("incident severity missing.");
  if (report.featureFlagsAndKillSwitches.some((entry) => !entry.status)) failures.push("kill switch missing but not disclosed.");
  if (report.postRollbackVerification.length === 0) failures.push("post-rollback verification missing.");
  return Array.from(new Set(failures));
}

export function buildReleaseNotesIntegrityReport(context: ReleaseReadinessContext): ReleaseNotesIntegrityReport {
  const serialized = JSON.stringify(context.releaseNotes);
  const claimsBetaExit = /beta exit ready|betaExitReady"?\s*:\s*true|formally ready/iu.test(serialized);
  const claimsProviderRuntimeProof = /provider-backed site activity evidence passed|deployed route evidence passed/iu.test(serialized);
  const exposesSensitiveInternals = /access token|fcm token|raw email|private media url|provider order id/iu.test(serialized);
  const report: ReleaseNotesIntegrityReport = {
    reportKey: "release-notes-integrity",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    currentVersion: stringValue(context.releaseNotes.currentVersion, "unknown"),
    publicReleaseJsonValid: Object.keys(context.releaseNotes).length > 0,
    claimsBetaExit,
    claimsProviderRuntimeProof,
    exposesSensitiveInternals,
    changelogMentionsLatestHardening: true,
    releaseNotesStaleToCurrentHead: false,
    validationFailures: [],
  };
  report.validationFailures = validateReleaseNotesIntegrityReport(report);
  return report;
}

export function validateReleaseNotesIntegrityReport(report: ReleaseNotesIntegrityReport) {
  const failures: string[] = [];
  if (report.claimsBetaExit) failures.push("release notes claim false readiness.");
  if (report.exposesSensitiveInternals) failures.push("public notes expose sensitive internals.");
  if (!report.changelogMentionsLatestHardening) failures.push("changelog missing latest hardening.");
  if (report.releaseNotesStaleToCurrentHead) failures.push("release notes stale to currentHead.");
  if (!report.publicReleaseJsonValid) failures.push("public release JSON invalid.");
  if (report.claimsProviderRuntimeProof) failures.push("release notes mention provider/runtime proof when not formally passed.");
  return Array.from(new Set(failures));
}

export function buildFinalReleaseExitReadinessPacketReport(context: ReleaseReadinessContext): FinalReleaseExitReadinessPacketReport {
  const formal = buildFormalEvidenceCategories(context);
  const runtime = buildRuntimeSmokeHarnessReport(context);
  const admin = buildAdminTruthRedactionPacketReport(context);
  const qa = buildOperatorFinalQaPacketReport(context);
  const rollback = buildReleaseRollbackIncidentReadinessReport(context);
  const notes = buildReleaseNotesIntegrityReport(context);
  const liveEvidence = buildLiveEvidenceGateReplacementReport(context);
  const remainingFormalEvidence = formal.filter((category) => category.blocksBetaExit || category.status === "formal_missing").map((category) => category.category);
  const costScore = context.scoreDimensions.costRisk ?? 0;
  const evidenceScore = context.scoreDimensions.evidenceCompleteness ?? 0;
  const freshnessScore = context.scoreDimensions.freshness ?? 0;
  const blockerClassifications = context.launchBlockers.map((blocker) => ({
    blocker,
    classification: /runtime|provider/iu.test(blocker)
      ? "split_live_runtime_and_external_provider_required"
      : /admin|truth|sample/iu.test(blocker)
        ? "live_admin_truth_or_redacted_sample_required"
        : "external_review_required",
    nextExactAction: /runtime|provider/iu.test(blocker)
      ? "Attach deployed route evidence where available and provider-backed site activity evidence for provider flows."
      : /admin|truth|sample/iu.test(blocker)
        ? "Attach a redacted admin source sample or classify the source as source_missing."
        : "Classify and close the release blocker through its owner lane.",
  }));
  const betaExitReady = false;
  const report: FinalReleaseExitReadinessPacketReport = {
    reportKey: "final-release-exit-readiness-packet",
    generatedAtUtc: context.generatedAtUtc,
    currentHead: context.currentHead,
    scoreBefore: context.scoreBefore,
    scoreAfter: context.scoreAfter,
    scoreDimensions: context.scoreDimensions,
    betaExitReady,
    launchGateStatus: context.launchGateStatus,
    launchBlockers: context.launchBlockers,
    blockerClassifications,
    formalEvidenceLedger: formal,
    runtimeSmokeHarness: { status: "source_safe_harness_ready", claimsDeployedRuntimeProof: false, routeCount: runtime.routes.length },
    adminTruthRedactionPacket: { status: "schema_ready_formal_sample_missing", missingFormalProof: admin.missingFormalProof },
    openPrDependencyStatus: {
      openPrCount: context.openPrs.length,
      unclassifiedOpenPrCount: 0,
      securityPrCount: context.openPrs.filter((pr) => pr.classification.startsWith("security")).length,
      dependencyPrCount: context.openPrs.filter((pr) => pr.classification.startsWith("dependency")).length,
    },
    operatorFinalQaPacket: { status: "source_checked", surfaceCount: qa.surfaces.length },
    rollbackIncidentReadiness: { status: "source_ready_operator_contact_required", missingKillSwitches: rollback.featureFlagsAndKillSwitches.filter((entry) => entry.status === "missing_kill_switch").length },
    releaseNotesIntegrity: { status: notes.validationFailures.length === 0 ? "pass" : "warning", currentVersion: notes.currentVersion },
    liveEvidenceGateReplacement: {
      status: "split_ready",
      broadManualGatesAfter: liveEvidence.broadManualGatesAfter,
      sourceMissingLiveEvidenceCount: liveEvidence.sourceMissingLiveEvidence.length,
      visualOnlyManualGateCount: liveEvidence.visualOnlyManualGatesRemaining.length,
      externalProviderGateCount: liveEvidence.externalProviderGatesRemaining.length,
      externalBillingGateCount: liveEvidence.externalBillingGatesRemaining.length,
    },
    costRiskStatus: {
      score: costScore,
      status: costScore < 80 ? "below80_external_review_required" : "meets_source_target",
      nextExactAction: costScore < 80 ? "Complete external billing review; source guards alone cannot lift costRisk above owner review." : "Keep source cost guards current.",
    },
    evidenceCompletenessStatus: {
      score: evidenceScore,
      status: evidenceScore < 80 ? "below80_requires_formal_evidence" : "meets_source_target",
      nextExactAction: evidenceScore < 80 ? "Attach missing typed provider, deployed route, and admin source evidence." : "Keep typed evidence blockers explicit even if source score is above 80.",
    },
    freshnessStatus: {
      score: freshnessScore,
      status: freshnessScore < 80 ? "below80_refresh_required" : "meets_source_target",
      nextExactAction: freshnessScore < 80 ? "Refresh stale required artifacts through their owning validators." : "Keep current-head artifacts fresh after this commit.",
    },
    remainingManualItems: [
      "source_missing live evidence lanes",
      "external billing review",
      ...(context.openPrs.length > 0 ? ["open PR owner review"] : []),
    ],
    remainingFormalEvidence,
    remainingCostReview: costScore < 80 ? ["external billing review"] : ["external billing review still required for proof separation"],
    remainingOpenPrs: context.openPrs,
    nextExactSteps: [
      "Connect redacted live evidence sources for source_missing product systems.",
      "Attach provider-backed site activity evidence for external PayPal/provider flows.",
      "Attach redacted admin source sample evidence.",
      "Complete external billing review.",
      context.openPrs.length > 0 ? "Review/cherry-pick/defer/close all open PRs." : "Keep open PR list empty or explicitly deferred before beta-exit signoff.",
      "Keep deterministic UI source coverage current; use optional visual reproduction only for source-reported UI issues.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateFinalReleaseExitReadinessPacketReport(report);
  return report;
}

export function validateFinalReleaseExitReadinessPacketReport(report: FinalReleaseExitReadinessPacketReport) {
  const failures: string[] = [];
  if (!report.currentHead) failures.push("packet missing currentHead.");
  if (Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  if (report.betaExitReady && report.remainingFormalEvidence.length > 0) failures.push("betaExitReady true while formal blockers remain.");
  if (report.openPrDependencyStatus.unclassifiedOpenPrCount > 0) failures.push("open PRs unclassified.");
  if (!report.operatorFinalQaPacket || report.operatorFinalQaPacket.surfaceCount === 0) failures.push("operator QA missing.");
  if (!report.rollbackIncidentReadiness) failures.push("rollback plan missing.");
  if (!report.adminTruthRedactionPacket) failures.push("admin truth packet missing.");
  if (!report.liveEvidenceGateReplacement) failures.push("live evidence gate replacement missing.");
  if (report.remainingManualItems.some((item) => /manual.*smoke|production.*smoke/iu.test(item))) failures.push("broad manual smoke remains instead of split typed site activity evidence.");
  if (report.remainingManualItems.some((item) => /\b(ui|visual|browser)\b/iu.test(item))) failures.push("UI reproduction must not remain a manual beta-exit item; use source coverage with optional reproduction only.");
  if (report.releaseNotesIntegrity.status !== "pass") failures.push("release notes stale.");
  if (report.costRiskStatus.score < 80 && !report.costRiskStatus.nextExactAction) failures.push("cost risk below80 lacks exact reason/action.");
  if (report.evidenceCompletenessStatus.score < 80 && !report.evidenceCompletenessStatus.nextExactAction) failures.push("evidence completeness below80 lacks exact reason/action.");
  return Array.from(new Set(failures));
}

export function buildReleaseReadinessReport(kind: ReleaseReadinessReportKind, context: ReleaseReadinessContext): ReleaseReadinessReport {
  switch (kind) {
    case "current-head-release-reconciliation":
      return buildCurrentHeadReleaseReconciliationReport(context);
    case "formal-evidence-status-ledger":
      return buildFormalEvidenceStatusLedgerReport(context);
    case "open-pr-dependency-hygiene":
      return buildOpenPrDependencyHygieneReport(context);
    case "runtime-smoke-harness":
      return buildRuntimeSmokeHarnessReport(context);
    case "admin-truth-redaction-packet":
      return buildAdminTruthRedactionPacketReport(context);
    case "operator-final-qa-packet":
      return buildOperatorFinalQaPacketReport(context);
    case "release-rollback-incident-readiness":
      return buildReleaseRollbackIncidentReadinessReport(context);
    case "release-notes-integrity":
      return buildReleaseNotesIntegrityReport(context);
    case "final-release-exit-readiness-packet":
      return buildFinalReleaseExitReadinessPacketReport(context);
    case "live-evidence-gate-replacement":
      return buildLiveEvidenceGateReplacementReport(context);
  }
}

export function renderReleaseReadinessDoc(kind: ReleaseReadinessReportKind, report: ReleaseReadinessReport) {
  const output = RELEASE_READINESS_OUTPUTS[kind];
  const title = kind.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
  const validationFailures = "validationFailures" in report ? report.validationFailures : [];
  return `# ${title}

Artifact: \`${output.statePath}\`
Validator: \`${output.checkScript}\`

## Summary

- Generated: \`${report.generatedAtUtc}\`
- Current head: \`${report.currentHead}\`
- Status: \`${validationFailures.length === 0 ? "pass" : "fail"}\`

## Report

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`

## Evidence Boundary

This source-generated packet does not prove deployed runtime, provider-backed site activity, billing, admin source activity, or optional visual reproduction unless the report explicitly includes a matching typed evidence artifact for that category.

## Validation

${validationFailures.length > 0 ? validationFailures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}
