import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

export const LAUNCH_BLOCKER_EVIDENCE_CLOSURE_STATE_PATH = "agent/state/launch-blocker-evidence-closure.generated.json";
export const LAUNCH_BLOCKER_EVIDENCE_CLOSURE_DOC_PATH = "docs/agent-truth/launch-blocker-evidence-closure.md";

export type LaunchBlockerClassification =
  | "formal_artifact_missing"
  | "source_confidence_ready"
  | "operator_confirmed_ready"
  | "stale_artifact_refresh_needed"
  | "external_review_required"
  | "can_close_now"
  | "external_or_runtime_artifact_required";

export type LaunchBlockerDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "launch_blocker_validator"
  | "launch_blocker_source"
  | "launch_blocker_test"
  | "release_artifact_expected"
  | "score_evidence_artifact"
  | "unrelated_agent_context_file_to_ignore"
  | "unsafe_unknown";

export type OpenPrSummary = {
  number: number;
  title: string;
  author?: { login?: string; is_bot?: boolean };
  mergeStateStatus?: string;
  isDraft?: boolean;
  updatedAt?: string;
  url?: string;
};

export type ClassifiedOpenPr = OpenPrSummary & {
  classification:
    | "dependency_update_external_review_required"
    | "security_patch_external_review_required"
    | "performance_patch_external_review_required"
    | "accessibility_patch_external_review_required"
    | "unknown_unclassified";
  reason: string;
  nextAction: string;
};

export type LaunchBlockerClosure = {
  id: "runtimeProviderSmoke" | "adminTruthSample" | "reportFreshnessPrIntegrity";
  label: string;
  currentStatus: string;
  classification: LaunchBlockerClassification;
  classificationDetails: LaunchBlockerClassification[];
  canCloseNow: boolean;
  formalGateCleared: boolean;
  sourceConfidenceStatus: "source_confidence_ready" | "source_confidence_missing" | "not_applicable";
  operatorConfirmedReady: boolean;
  staleArtifactRefreshNeeded: boolean;
  externalReviewRequired: boolean;
  missingArtifact: string | null;
  evidence: string[];
  nextAction: string;
};

export type LaunchBlockerEvidenceClosureReport = {
  generatedAtUtc: string;
  reportKey: "launch-blocker-evidence-closure";
  currentHead: string;
  status: "pass" | "fail";
  launchGateStatus: string;
  formalGatesCleared: boolean;
  blockers: {
    runtimeProviderSmoke: LaunchBlockerClosure;
    adminTruthSample: LaunchBlockerClosure;
    reportFreshnessPrIntegrity: LaunchBlockerClosure;
  };
  openPrIntegrity: {
    evidenceSource: "provided" | "gh_opt_in" | "not_requested";
    evidenceUnavailable: boolean;
    openPrCount: number;
    classifiedOpenPrCount: number;
    unclassifiedOpenPrCount: number;
    stalePrIntegrityBlockerClosed: boolean;
    openPrs: ClassifiedOpenPr[];
    evidence: string[];
  };
  scoreDimensions: Record<string, { before: number; after: number; target: number }>;
  remainingLaunchBlockers: string[];
  nextExactSteps: string[];
  formalEvidenceImpact: "classification_only_does_not_clear_formal_gates";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  deployPerformed: false;
  productRuntimeChanged: false;
  paymentRuntimeChanged: false;
  gumdropMathChanged: false;
  dirtyFiles: Array<{ path: string; classification: LaunchBlockerDirtyClassification }>;
  blockerReferenceClassification: Array<{
    reference: string;
    classification: LaunchBlockerClassification;
    reason: string;
  }>;
  evidence: string[];
  validationFailures: string[];
};

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type BuildInput = {
  generatedAtUtc?: string;
  currentHead?: string;
  publicBetaScore?: JsonRecord;
  formalEvidenceBridge?: JsonRecord;
  adminTruthSourceSample?: JsonRecord;
  debugRuntimeEvidence?: JsonRecord;
  openPrs?: OpenPrSummary[];
  scoreBefore?: Partial<ScoreDimensions>;
  dirtyFiles?: string[];
};

function shell(command: string, args: readonly string[], root = ROOT) {
  try {
    return execFileSync(command, [...args], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown) {
  return value === true;
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of shell("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function cloneDimensions(input?: Partial<ScoreDimensions>): ScoreDimensions {
  const beta = readJson("agent/state/public-beta-score.generated.json");
  return {
    sourceHealth: input?.sourceHealth ?? numberValue(beta?.sourceHealthScore),
    runtimeHealth: input?.runtimeHealth ?? numberValue(beta?.runtimeHealthScore),
    evidenceCompleteness: input?.evidenceCompleteness ?? numberValue(beta?.evidenceCompletenessScore),
    freshness: input?.freshness ?? numberValue(beta?.freshnessScore),
    costRisk: input?.costRisk ?? numberValue(beta?.costRiskScore),
    regressionRisk: input?.regressionRisk ?? numberValue(beta?.regressionRiskScore),
    overallHealthScore: input?.overallHealthScore ?? numberValue(beta?.healthScore, numberValue(beta?.overallScore)),
  };
}

function scoreRows(before: ScoreDimensions) {
  return {
    sourceHealth: { before: before.sourceHealth, after: before.sourceHealth, target: 80 },
    runtimeHealth: { before: before.runtimeHealth, after: before.runtimeHealth, target: 80 },
    evidenceCompleteness: { before: before.evidenceCompleteness, after: before.evidenceCompleteness, target: 80 },
    freshness: { before: before.freshness, after: before.freshness, target: 80 },
    costRisk: { before: before.costRisk, after: before.costRisk, target: 80 },
    regressionRisk: { before: before.regressionRisk, after: before.regressionRisk, target: 80 },
    overallHealthScore: { before: before.overallHealthScore, after: before.overallHealthScore, target: 80 },
  };
}

export function classifyLaunchBlockerDirtyFile(filePath: string): LaunchBlockerDirtyClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === LAUNCH_BLOCKER_EVIDENCE_CLOSURE_STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === LAUNCH_BLOCKER_EVIDENCE_CLOSURE_DOC_PATH) return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-launch-blocker-evidence-closure.ts") return "launch_blocker_validator";
  if (normalized === "tests/unit/launch-blocker-evidence-closure.spec.ts") return "launch_blocker_test";
  if (
    normalized === "src/lib/agent-score/core.ts"
    || normalized === "src/lib/agent-score/formal-evidence-bridge.ts"
    || normalized === "src/lib/debug/debug-signal-grouping.ts"
  ) return "launch_blocker_source";
  if (
    normalized === "tests/unit/public-beta-score.spec.ts"
    || normalized === "tests/unit/formal-evidence-bridge.spec.ts"
    || normalized === "tests/unit/debug-signal-grouping.spec.ts"
  ) return "launch_blocker_test";
  if (normalized === "scripts/agent/validate-cost-risk-exit-pass.ts") return "score_evidence_artifact";
  if (
    normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/current-beta-exit-status.generated.json"
    || normalized === "agent/state/formal-evidence-bridge.generated.json"
    || normalized === "agent/state/open-pr-finalization.generated.json"
    || normalized === "docs/agent-truth/open-pr-finalization.md"
  ) {
    return "score_evidence_artifact";
  }
  if (normalized === "package.json") return "launch_blocker_validator";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (/payment|paypal|wallet|gumdrop-ledger|source-of-funds|top-nav|bottom-nav|nav|src\/app\/api\/chat|src\/components\/Chat/iu.test(normalized)) {
    return "unsafe_unknown";
  }
  if (/^agent\/state\/.+\.generated\.json$/u.test(normalized) || /^docs\/agent-truth\/.+\.md$/u.test(normalized)) {
    return "score_evidence_artifact";
  }
  return "unsafe_unknown";
}

function classifyOpenPr(pr: OpenPrSummary): ClassifiedOpenPr {
  const title = pr.title;
  const bot = pr.author?.is_bot === true || /dependabot/iu.test(pr.author?.login ?? "");
  if (bot || /chore\(deps\)|bump /iu.test(title)) {
    return {
      ...pr,
      classification: "dependency_update_external_review_required",
      reason: "Dependency update PR remains open and needs normal dependency/security review before merge.",
      nextAction: `Review dependency PR #${pr.number}, then merge or close it outside this source-evidence pass.`,
    };
  }
  if (/sentinel|security|insecure|random|redirect|xss|csrf|high/iu.test(title)) {
    return {
      ...pr,
      classification: "security_patch_external_review_required",
      reason: "Security-oriented PR remains open and needs owner review before it can be treated as resolved.",
      nextAction: `Review security PR #${pr.number}, port current-source-safe changes if needed, then close or merge intentionally.`,
    };
  }
  if (/bolt|performance|map lookup|duplicate|optimi[sz]e|hotspot/iu.test(title)) {
    return {
      ...pr,
      classification: "performance_patch_external_review_required",
      reason: "Performance PR remains open and needs current-source review before merge.",
      nextAction: `Review performance PR #${pr.number} against current source before merge or close.`,
    };
  }
  if (/palette|aria|accessible|loading state|a11y/iu.test(title)) {
    return {
      ...pr,
      classification: "accessibility_patch_external_review_required",
      reason: "Accessibility/UI-support PR remains open and needs current-source review before merge.",
      nextAction: `Review accessibility PR #${pr.number} against current source before merge or close.`,
    };
  }
  return {
    ...pr,
    classification: "unknown_unclassified",
    reason: "Open PR did not match a known launch-blocker classification.",
    nextAction: `Classify PR #${pr.number} before closing PR integrity evidence.`,
  };
}

type OpenPrEvidence = {
  evidenceSource: LaunchBlockerEvidenceClosureReport["openPrIntegrity"]["evidenceSource"];
  evidenceUnavailable: boolean;
  openPrs: OpenPrSummary[];
};

function readOpenPrsFromGh(): OpenPrEvidence {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return {
      evidenceSource: "not_requested",
      evidenceUnavailable: true,
      openPrs: [],
    };
  }
  const output = shell("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,author,mergeStateStatus,isDraft,updatedAt,url",
  ]);
  if (!output) {
    return {
      evidenceSource: "gh_opt_in",
      evidenceUnavailable: true,
      openPrs: [],
    };
  }
  try {
    const parsed = JSON.parse(output) as unknown;
    return {
      evidenceSource: "gh_opt_in",
      evidenceUnavailable: !Array.isArray(parsed),
      openPrs: Array.isArray(parsed) ? parsed as OpenPrSummary[] : [],
    };
  } catch {
    return {
      evidenceSource: "gh_opt_in",
      evidenceUnavailable: true,
      openPrs: [],
    };
  }
}

function buildRuntimeProviderClosure(input: {
  publicBetaScore: JsonRecord;
  formalEvidenceBridge: JsonRecord;
  debugRuntimeEvidence: JsonRecord;
}): LaunchBlockerClosure {
  const formalGateStatus = record(input.formalEvidenceBridge.formalGateStatus);
  const provider = record(formalGateStatus.providerSmoke);
  const runtime = record(formalGateStatus.deployedRuntimeSmoke);
  const sourceConfidence = record(input.formalEvidenceBridge.sourceConfidenceStatus);
  const operatorSignal = record(input.formalEvidenceBridge.operatorSignalStatus);
  const providerCleared = boolValue(provider.cleared);
  const runtimeCleared = boolValue(runtime.cleared);
  const formalCleared = providerCleared && runtimeCleared;
  const missingArtifacts = [
    ...(providerCleared ? [] : ["agent/state/provider-smoke-evidence.generated.json"]),
    ...(runtimeCleared ? [] : ["agent/state/runtime-smoke-evidence.generated.json"]),
  ];
  const blockerLabel = !providerCleared && runtimeCleared
    ? "Provider-backed site activity evidence"
    : providerCleared && !runtimeCleared
      ? "Deployed route evidence"
      : "Provider-backed site activity + deployed route evidence";
  const blockerNextAction = formalCleared
    ? "Keep provider-backed site activity and deployed route evidence artifacts fresh."
    : !providerCleared && runtimeCleared
      ? "Produce provider-backed site activity evidence; source confidence and operator revenue do not clear this gate."
      : providerCleared && !runtimeCleared
        ? "Produce deployed runtime route evidence; source confidence and operator revenue do not clear this gate."
        : "Produce provider-backed site activity and deployed runtime route evidence; source confidence and operator revenue do not clear this gate.";
  const sourceReady = numberValue(sourceConfidence.realUsageConfidenceScore) > 0
    || numberValue(sourceConfidence.runtimeSubstituteEvidenceScore) > 0
    || /source_ready/iu.test(stringValue(input.debugRuntimeEvidence.status));
  const operatorReady = boolValue(operatorSignal.operatorConfirmedRevenue) && !boolValue(operatorSignal.formalProviderGateCleared);
  const currentStatus = stringValue(
    arrayValue(input.publicBetaScore.launchBlockers).find((entry) =>
      /Runtime\/provider smoke|Provider-backed site activity|deployed route evidence/iu.test(String(entry))),
    `${blockerLabel}: Source evidence required`,
  )
    .replace(/Runtime\/provider smoke/giu, "Provider-backed site activity + deployed route evidence")
    .replace(/Runtime unverified/giu, "Source evidence required");
  return {
    id: "runtimeProviderSmoke",
    label: blockerLabel,
    currentStatus,
    classification: formalCleared ? "can_close_now" : "external_or_runtime_artifact_required",
    classificationDetails: [
      ...(providerCleared ? [] : ["formal_artifact_missing" as const]),
      ...(runtimeCleared ? [] : ["formal_artifact_missing" as const]),
      ...(sourceReady ? ["source_confidence_ready" as const] : []),
      ...(operatorReady ? ["operator_confirmed_ready" as const] : []),
      ...(formalCleared ? ["can_close_now" as const] : ["external_or_runtime_artifact_required" as const]),
    ],
    canCloseNow: formalCleared,
    formalGateCleared: formalCleared,
    sourceConfidenceStatus: sourceReady ? "source_confidence_ready" : "source_confidence_missing",
    operatorConfirmedReady: operatorReady,
    staleArtifactRefreshNeeded: false,
    externalReviewRequired: !formalCleared,
    missingArtifact: formalCleared ? null : missingArtifacts.join(" + "),
    evidence: [
      `providerSmoke.cleared=${providerCleared}`,
      `deployedRuntimeSmoke.cleared=${runtimeCleared}`,
      `realUsageConfidenceScore=${numberValue(sourceConfidence.realUsageConfidenceScore)}`,
      `runtimeSubstituteEvidenceScore=${numberValue(sourceConfidence.runtimeSubstituteEvidenceScore)}`,
      `operatorConfirmedRevenue=${operatorReady}`,
      "formalGateCanClearFromSource=false",
    ],
    nextAction: blockerNextAction,
  };
}

function buildAdminTruthClosure(input: {
  publicBetaScore: JsonRecord;
  formalEvidenceBridge: JsonRecord;
  adminTruthSourceSample: JsonRecord;
}): LaunchBlockerClosure {
  const formalGateStatus = record(input.formalEvidenceBridge.formalGateStatus);
  const admin = record(formalGateStatus.adminProductionSample);
  const sourceConfidence = record(input.formalEvidenceBridge.sourceConfidenceStatus);
  const sourceReady = /source_ready_admin_truth_sample/iu.test(stringValue(input.adminTruthSourceSample.status))
    || numberValue(sourceConfidence.adminSourceConfidenceScore) > 0;
  const formalCleared = boolValue(admin.cleared)
    || (boolValue(input.adminTruthSourceSample.productionSampleAttached) && boolValue(input.adminTruthSourceSample.formalAdminTruthSamplePassed));
  return {
    id: "adminTruthSample",
    label: "Admin truth/sample evidence",
    currentStatus: stringValue(arrayValue(input.publicBetaScore.launchBlockers).find((entry) => /Admin truth\/sample evidence/iu.test(String(entry))), "Admin truth/sample evidence: Ready with smoke required"),
    classification: formalCleared ? "can_close_now" : "external_or_runtime_artifact_required",
    classificationDetails: [
      ...(formalCleared ? ["can_close_now" as const] : ["formal_artifact_missing" as const, "external_or_runtime_artifact_required" as const]),
      ...(sourceReady ? ["source_confidence_ready" as const] : []),
    ],
    canCloseNow: formalCleared,
    formalGateCleared: formalCleared,
    sourceConfidenceStatus: sourceReady ? "source_confidence_ready" : "source_confidence_missing",
    operatorConfirmedReady: false,
    staleArtifactRefreshNeeded: false,
    externalReviewRequired: !formalCleared,
    missingArtifact: formalCleared ? null : "agent/state/admin-truth-sample-evidence.generated.json",
    evidence: [
      `adminProductionSample.cleared=${boolValue(admin.cleared)}`,
      `adminSourceStatus=${stringValue(input.adminTruthSourceSample.status, "missing")}`,
      `productionSampleAttached=${boolValue(input.adminTruthSourceSample.productionSampleAttached)}`,
      `formalAdminTruthSamplePassed=${boolValue(input.adminTruthSourceSample.formalAdminTruthSamplePassed)}`,
      `adminSourceConfidenceScore=${numberValue(sourceConfidence.adminSourceConfidenceScore)}`,
      "formalGateCanClearFromSource=false",
    ],
    nextAction: formalCleared
      ? "Keep redacted production admin truth sample evidence fresh."
      : "Attach a redacted production admin truth sample; source wiring and debug labels do not clear the formal admin gate.",
  };
}

function buildPrClosure(input: {
  publicBetaScore: JsonRecord;
  openPrs: OpenPrSummary[];
  evidenceSource: LaunchBlockerEvidenceClosureReport["openPrIntegrity"]["evidenceSource"];
  evidenceUnavailable: boolean;
}): { closure: LaunchBlockerClosure; openPrIntegrity: LaunchBlockerEvidenceClosureReport["openPrIntegrity"] } {
  const classifiedOpenPrs = input.openPrs.map(classifyOpenPr);
  const unclassifiedOpenPrCount = classifiedOpenPrs.filter((pr) => pr.classification === "unknown_unclassified").length;
  const openPrCount = classifiedOpenPrs.length;
  const staleClosed = !input.evidenceUnavailable && openPrCount === 0;
  const classification: LaunchBlockerClassification = staleClosed
    ? "can_close_now"
    : input.evidenceUnavailable
      ? "external_review_required"
    : unclassifiedOpenPrCount > 0
      ? "stale_artifact_refresh_needed"
      : "external_review_required";
  return {
    closure: {
      id: "reportFreshnessPrIntegrity",
      label: "Required report freshness",
      currentStatus: stringValue(arrayValue(input.publicBetaScore.launchBlockers).find((entry) => /Required report freshness/iu.test(String(entry))), "Required report freshness: Stale evidence"),
      classification,
      classificationDetails: [
        ...(staleClosed ? ["can_close_now" as const] : ["external_review_required" as const]),
        ...(unclassifiedOpenPrCount > 0 ? ["stale_artifact_refresh_needed" as const] : []),
      ],
      canCloseNow: staleClosed,
      formalGateCleared: false,
      sourceConfidenceStatus: "not_applicable",
      operatorConfirmedReady: false,
      staleArtifactRefreshNeeded: unclassifiedOpenPrCount > 0,
      externalReviewRequired: input.evidenceUnavailable || openPrCount > 0,
      missingArtifact: staleClosed
        ? null
        : input.evidenceUnavailable
          ? "cached open PR artifact or ALLOW_GH_PR_LIST=1 opt-in"
          : "current open PR owner disposition",
      evidence: [
        `openPrEvidenceSource=${input.evidenceSource}`,
        `openPrEvidenceUnavailable=${input.evidenceUnavailable}`,
        `openPrCount=${openPrCount}`,
        `classifiedOpenPrCount=${classifiedOpenPrs.length - unclassifiedOpenPrCount}`,
        `unclassifiedOpenPrCount=${unclassifiedOpenPrCount}`,
        `stalePrIntegrityBlockerClosed=${staleClosed}`,
      ],
      nextAction: staleClosed
        ? "No open PRs remain; stale PR integrity evidence can close for this launch-blocker pass."
        : input.evidenceUnavailable
          ? "Provide a cached open PR artifact or explicitly opt in to GitHub PR listing before treating PR integrity as closed."
        : "Review, merge, port, or close the classified open PRs before treating PR integrity as closed.",
    },
    openPrIntegrity: {
      evidenceSource: input.evidenceSource,
      evidenceUnavailable: input.evidenceUnavailable,
      openPrCount,
      classifiedOpenPrCount: classifiedOpenPrs.length - unclassifiedOpenPrCount,
      unclassifiedOpenPrCount,
      stalePrIntegrityBlockerClosed: staleClosed,
      openPrs: classifiedOpenPrs,
      evidence: [
        `openPrEvidenceSource=${input.evidenceSource}`,
        `openPrEvidenceUnavailable=${input.evidenceUnavailable}`,
        `openPrCount=${openPrCount}`,
        `unclassifiedOpenPrCount=${unclassifiedOpenPrCount}`,
        ...classifiedOpenPrs.map((pr) => `pr#${pr.number}=${pr.classification}`),
      ],
    },
  };
}

export function buildLaunchBlockerEvidenceClosureReport(input: BuildInput = {}): LaunchBlockerEvidenceClosureReport {
  const currentHead = input.currentHead ?? shell("git", ["rev-parse", "HEAD"]);
  const publicBetaScore = input.publicBetaScore ?? readJson("agent/state/public-beta-score.generated.json") ?? {};
  const formalEvidenceBridge = input.formalEvidenceBridge ?? readJson("agent/state/formal-evidence-bridge.generated.json") ?? {};
  const adminTruthSourceSample = input.adminTruthSourceSample ?? readJson("agent/state/admin-truth-source-sample.generated.json") ?? {};
  const debugRuntimeEvidence = input.debugRuntimeEvidence ?? readJson("agent/state/debug-runtime-evidence.generated.json") ?? {};
  const openPrEvidence: OpenPrEvidence = Array.isArray(input.openPrs)
    ? {
      evidenceSource: "provided",
      evidenceUnavailable: false,
      openPrs: input.openPrs,
    }
    : readOpenPrsFromGh();
  const before = cloneDimensions(input.scoreBefore);
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyLaunchBlockerDirtyFile(path),
  }));
  const runtimeProviderSmoke = buildRuntimeProviderClosure({ publicBetaScore, formalEvidenceBridge, debugRuntimeEvidence });
  const adminTruthSample = buildAdminTruthClosure({ publicBetaScore, formalEvidenceBridge, adminTruthSourceSample });
  const { closure: reportFreshnessPrIntegrity, openPrIntegrity } = buildPrClosure({
    publicBetaScore,
    openPrs: openPrEvidence.openPrs,
    evidenceSource: openPrEvidence.evidenceSource,
    evidenceUnavailable: openPrEvidence.evidenceUnavailable,
  });
  const blockers = {
    runtimeProviderSmoke,
    adminTruthSample,
    reportFreshnessPrIntegrity,
  };
  const remainingLaunchBlockers = [
    ...(runtimeProviderSmoke.evidence.includes("providerSmoke.cleared=true") ? [] : ["formal_provider_smoke"]),
    ...(runtimeProviderSmoke.evidence.includes("deployedRuntimeSmoke.cleared=true") ? [] : ["deployed_runtime_smoke"]),
    ...(adminTruthSample.canCloseNow ? [] : ["production_admin_truth_sample"]),
    ...(reportFreshnessPrIntegrity.canCloseNow ? [] : ["open_pr_owner_review"]),
  ];
  const nextExactSteps = Object.values(blockers)
    .filter((blocker) => !blocker.canCloseNow)
    .map((blocker) => `${blocker.id}: ${blocker.nextAction}`);
  const report: LaunchBlockerEvidenceClosureReport = {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    reportKey: "launch-blocker-evidence-closure",
    currentHead,
    status: "pass",
    launchGateStatus: stringValue(publicBetaScore.launchGateStatus, "owner_review"),
    formalGatesCleared: runtimeProviderSmoke.formalGateCleared || adminTruthSample.formalGateCleared,
    blockers,
    openPrIntegrity,
    scoreDimensions: scoreRows(before),
    remainingLaunchBlockers,
    nextExactSteps,
    formalEvidenceImpact: "classification_only_does_not_clear_formal_gates",
    productionReadsPerformed: false,
    providerCallsPerformed: false,
    deployPerformed: false,
    productRuntimeChanged: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    dirtyFiles,
    blockerReferenceClassification: [
      {
        reference: `${runtimeProviderSmoke.label}: Source evidence required`,
        classification: runtimeProviderSmoke.classification,
        reason: runtimeProviderSmoke.nextAction,
      },
      {
        reference: "Admin truth/sample evidence: Ready with smoke required",
        classification: adminTruthSample.classification,
        reason: "Source admin truth wiring is present, but a redacted production sample remains the formal gate.",
      },
      {
        reference: "Required report freshness: Stale evidence",
        classification: reportFreshnessPrIntegrity.classification,
        reason: openPrIntegrity.evidenceUnavailable
          ? "Open PR evidence was not queried or supplied; source validation cannot close PR integrity by assuming zero open PRs."
          : reportFreshnessPrIntegrity.canCloseNow
          ? "No open PRs remain in current repository state."
          : "Open PRs are classified but still require owner disposition before integrity can be closed.",
      },
    ],
    evidence: [
      `currentHead=${currentHead}`,
      `launchGateStatus=${stringValue(publicBetaScore.launchGateStatus, "owner_review")}`,
      `formalEvidenceImpact=classification_only_does_not_clear_formal_gates`,
      `openPrEvidenceSource=${openPrIntegrity.evidenceSource}`,
      `openPrEvidenceUnavailable=${openPrIntegrity.evidenceUnavailable}`,
      `openPrCount=${openPrIntegrity.openPrCount}`,
      "productionReadsPerformed=false",
      "providerCallsPerformed=false",
      "deployPerformed=false",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateLaunchBlockerEvidenceClosureReport(report);
  report.status = report.validationFailures.length === 0 ? "pass" : "fail";
  return report;
}

export function validateLaunchBlockerEvidenceClosureReport(report: LaunchBlockerEvidenceClosureReport) {
  const failures: string[] = [];
  if (report.reportKey !== "launch-blocker-evidence-closure") failures.push("reportKey must be launch-blocker-evidence-closure.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable UTC.");
  if (!report.currentHead) failures.push("currentHead missing.");
  const blockers = Object.values(report.blockers);
  for (const blocker of blockers) {
    if (!blocker.classification) failures.push("blocker is closed without evidence/classification.");
    if (!blocker.nextAction && !blocker.canCloseNow) failures.push("launch blocker remains with no exact next action.");
    if (blocker.canCloseNow && blocker.classification !== "can_close_now") failures.push("blocker is closed without evidence/classification.");
  }
  if (
    report.blockers.runtimeProviderSmoke.formalGateCleared
    && report.blockers.runtimeProviderSmoke.classification !== "can_close_now"
  ) failures.push("formal gate falsely cleared.");
  if (
    report.blockers.runtimeProviderSmoke.classification === "can_close_now"
    && report.blockers.runtimeProviderSmoke.missingArtifact
  ) failures.push("formal gate falsely cleared.");
  if (
    report.blockers.adminTruthSample.classification === "can_close_now"
    && report.blockers.adminTruthSample.missingArtifact
  ) failures.push("formal gate falsely cleared.");
  const runtimeProviderVisibleText = [
    report.blockers.runtimeProviderSmoke.label,
    report.blockers.runtimeProviderSmoke.currentStatus,
    report.blockers.runtimeProviderSmoke.nextAction,
    ...report.blockerReferenceClassification
      .filter((entry) => entry.reference.includes("Provider-backed site activity") || /Runtime\/provider smoke/iu.test(entry.reference))
      .flatMap((entry) => [entry.reference, entry.reason]),
  ].join("\n");
  if (/Runtime\/provider smoke|formal provider smoke|deployed runtime smoke/iu.test(runtimeProviderVisibleText)) {
    failures.push("runtime/provider launch blocker must use typed site-activity/deployed-route wording.");
  }
  if (report.formalEvidenceImpact !== "classification_only_does_not_clear_formal_gates") failures.push("formal gate falsely cleared.");
  if (report.openPrIntegrity.unclassifiedOpenPrCount > 0) failures.push("open PRs unclassified.");
  if (report.openPrIntegrity.evidenceUnavailable && report.blockers.reportFreshnessPrIntegrity.classification === "can_close_now") {
    failures.push("PR integrity falsely cleared without PR evidence.");
  }
  if (report.blockers.reportFreshnessPrIntegrity.classification === "can_close_now" && report.openPrIntegrity.openPrCount > 0) {
    failures.push("PR freshness stale when no PRs open.");
  }
  if (report.remainingLaunchBlockers.length > 0 && report.nextExactSteps.length === 0) {
    failures.push("launch blocker remains with no exact next action.");
  }
  if (!report.scoreDimensions?.runtimeHealth || typeof report.scoreDimensions.runtimeHealth.before !== "number" || typeof report.scoreDimensions.runtimeHealth.after !== "number") {
    failures.push("score dimension before/after missing.");
  }
  if (report.productionReadsPerformed || report.providerCallsPerformed || report.deployPerformed) {
    failures.push("production/provider/deploy actions are not allowed.");
  }
  if (report.productRuntimeChanged || report.paymentRuntimeChanged || report.gumdropMathChanged) {
    failures.push("unsafe dirty files present.");
  }
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) {
    failures.push("unsafe dirty files present.");
  }
  return Array.from(new Set(failures));
}

function renderDoc(report: LaunchBlockerEvidenceClosureReport) {
  const blockerRows = Object.values(report.blockers)
    .map((blocker) => `| ${blocker.label} | ${blocker.currentStatus} | ${blocker.classification} | ${blocker.canCloseNow} | ${blocker.nextAction} |`)
    .join("\n");
  const prRows = report.openPrIntegrity.openPrs
    .map((pr) => `| #${pr.number} | ${pr.title.replace(/\|/gu, "/")} | ${pr.classification} | ${pr.nextAction.replace(/\|/gu, "/")} |`)
    .join("\n");
  const emptyPrRow = report.openPrIntegrity.evidenceUnavailable
    ? "| Not checked | - | external_review_required | Provide a cached PR artifact or explicitly opt in to GitHub PR listing. |"
    : "| None | - | can_close_now | No open PRs remain. |";
  const scoreDimensionRows = Object.entries(report.scoreDimensions)
    .map(([dimension, values]) => `| ${dimension} | ${values.before} | ${values.after} | ${values.target} |`)
    .join("\n");
  const dirtyRows = report.dirtyFiles
    .map((entry) => `| ${entry.path} | ${entry.classification} |`)
    .join("\n");
  return `# Launch Blocker Evidence Closure

Status: \`${report.status}\`
Artifact: \`${LAUNCH_BLOCKER_EVIDENCE_CLOSURE_STATE_PATH}\`
Validator: \`npm run check:launch-blocker-evidence-closure\`

## Summary

- Current head: \`${report.currentHead}\`
- Launch gate status: \`${report.launchGateStatus}\`
- Formal gates cleared by this pass: false
- Open PR evidence source: \`${report.openPrIntegrity.evidenceSource}\`
- Open PR evidence unavailable: ${report.openPrIntegrity.evidenceUnavailable}
- Open PRs: ${report.openPrIntegrity.openPrCount}
- Unclassified open PRs: ${report.openPrIntegrity.unclassifiedOpenPrCount}
- Formal evidence impact: \`${report.formalEvidenceImpact}\`
- Production reads/provider calls/deploys performed: false

## Blocker Classification

| Blocker | Current status | Classification | Can close now | Next action |
| --- | --- | --- | --- | --- |
${blockerRows}

## Open PR Integrity

| PR | Title | Classification | Next action |
| --- | --- | --- | --- |
${prRows || emptyPrRow}

## Score Dimensions

| Dimension | Before | After | Target |
| --- | ---: | ---: | ---: |
${scoreDimensionRows}

## Dirty File Classification

| File | Classification |
| --- | --- |
${dirtyRows || "| None | - |"}

## Remaining Launch Blockers

${report.remainingLaunchBlockers.map((blocker) => `- ${blocker}`).join("\n") || "- None."}

## Boundary

This pass classifies launch blockers only. It does not fake provider proof, deployed runtime smoke, production admin samples, production reads, provider calls, deployments, payment runtime changes, or GumDrop math changes.

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n") || "- No source-evidence action remains for this pass."}

## Validation

${report.validationFailures.length ? report.validationFailures.map((failure) => `- FAIL: ${failure}`).join("\n") : "- Pass."}
`;
}

function main() {
  const report = buildLaunchBlockerEvidenceClosureReport();
  mkdirSync(join(ROOT, dirname(LAUNCH_BLOCKER_EVIDENCE_CLOSURE_STATE_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(LAUNCH_BLOCKER_EVIDENCE_CLOSURE_DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, LAUNCH_BLOCKER_EVIDENCE_CLOSURE_STATE_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, LAUNCH_BLOCKER_EVIDENCE_CLOSURE_DOC_PATH), renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Launch blocker evidence closure validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `Launch blocker evidence closure passed. openPrs=${report.openPrIntegrity.openPrCount} ` +
    `remaining=${report.remainingLaunchBlockers.length}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
