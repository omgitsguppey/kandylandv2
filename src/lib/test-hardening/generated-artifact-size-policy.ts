import {
  buildGeneratedReportCleanupMetadata,
  buildGeneratedReportCompleteness,
  type GeneratedReportBaselineStatus,
  type GeneratedReportCleanupMetadata,
  type GeneratedReportCompletenessMetadata,
  type GeneratedReportFreshness,
} from "@/lib/agent-governance/generated-reports/generated-report-contract";
import {
  currentGitHead,
  lineCount,
  listFiles,
  readText,
  TEST_HARDENING_GENERATED_AT_UTC,
  validation,
  type ValidationResult,
} from "./test-hardening-shared";

export type OversizedArtifactClassification =
  | "compact_artifact"
  | "legacy_large_snapshot_documented"
  | "score_critical_summary"
  | "drilldown_only"
  | "unsafe_unknown";

export type GeneratedArtifactSizeEntry = {
  artifactPath: string;
  lineCount: number;
  byteCount: number;
  classification: OversizedArtifactClassification;
  justification: string;
};

export type GeneratedArtifactSizePolicyReport = {
  reportKey: "generated-artifact-size-policy";
  generatedAtUtc: string;
  currentHead: string;
  reportCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  totalFindingCount: number;
  emittedFindingCount: number;
  omittedFindingCount: number;
  capReason: string | null;
  capStrategy: GeneratedReportCompletenessMetadata["capStrategy"];
  capLimit: number | null;
  rankingInputCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  highRiskCounts: NonNullable<GeneratedReportCompletenessMetadata["highRiskCounts"]>;
  sourceFileDiscovery: "not_applicable";
  gitStatus: "available" | "missing" | "not_required";
  toolingDegraded: boolean;
  degradationReason: string | null;
  currentHeadSource: "git" | "unknown" | "not_required";
  sourceCommit: string | null;
  freshness: GeneratedReportFreshness;
  baselineStatus: GeneratedReportBaselineStatus;
  owner: string;
  safetyClass: GeneratedReportCleanupMetadata["safetyClass"];
  costClass: GeneratedReportCleanupMetadata["costClass"];
  rollback: string;
  cleanupPolicy: GeneratedReportCleanupMetadata["cleanupPolicy"];
  cleanupCommand: string | null;
  sourceTruthRole: GeneratedReportCleanupMetadata["sourceTruthRole"];
  defaultMaxLines: 500;
  defaultMaxBytes: 250000;
  generatedArtifactsAudited: number;
  oversizedArtifacts: GeneratedArtifactSizeEntry[];
  generatedArtifactsShrunk: number;
  unsafeUnknowns: number;
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

function byteCount(path: string) {
  return Buffer.byteLength(readText(path), "utf8");
}

function classifyArtifact(path: string, lines: number, bytes: number): OversizedArtifactClassification {
  if (lines <= 500 && bytes <= 250000) return "compact_artifact";
  if (/test-fixture|validator-ownership|quality-guards|qa-harness|artifact-size|memory-writeback/iu.test(path)) return "unsafe_unknown";
  if (/public-beta-score|current-beta-exit-status|release|readiness|score/iu.test(path)) return "score_critical_summary";
  if (/retrieval-index|product-body-map|telemetry-dependency|ui-surface-coverage/iu.test(path)) return "drilldown_only";
  return "legacy_large_snapshot_documented";
}

export function buildGeneratedArtifactSizePolicyReport(): GeneratedArtifactSizePolicyReport {
  const artifacts = listFiles(["agent/state", "docs/agent-truth"], [".json", ".md"]).filter((file) => /\.generated\.json$|^docs\/agent-truth\//u.test(file));
  const oversizedArtifacts = artifacts
    .map((artifactPath) => {
      const lines = lineCount(artifactPath);
      const bytes = byteCount(artifactPath);
      const classification = classifyArtifact(artifactPath, lines, bytes);
      return {
        artifactPath,
        lineCount: lines,
        byteCount: bytes,
        classification,
        justification: classification === "compact_artifact"
          ? "Within default 500-line compact policy."
          : "Existing generated snapshot is classified; future edits should prefer summary plus top findings.",
      };
    })
    .filter((entry) => entry.lineCount > 500 || entry.byteCount > 250000);

  const currentHead = currentGitHead();
  const completeness = buildGeneratedReportCompleteness({
    totalFindingCount: oversizedArtifacts.length,
    emittedFindingCount: oversizedArtifacts.length,
    capStrategy: "none",
    rankingInputCompleteness: "complete",
    highRiskCounts: {
      critical: 0,
      major: oversizedArtifacts.filter((artifact) => artifact.classification === "unsafe_unknown").length,
      signoff: oversizedArtifacts.filter((artifact) => artifact.classification !== "compact_artifact").length,
      privacy: 0,
      payment: 0,
      lockedContent: 0,
      sourceTruth: oversizedArtifacts.length,
    },
  });
  const cleanup = buildGeneratedReportCleanupMetadata({
    owner: "src/lib/test-hardening/generated-artifact-size-policy.ts",
    safetyClass: "source_safe",
    costClass: "local_free",
    rollback: "Regenerate agent/state/generated-artifact-size-policy.generated.json with npm run check:generated-artifact-size-policy.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run check:generated-artifact-size-policy",
    sourceTruthRole: "generated_snapshot",
  });
  const report: GeneratedArtifactSizePolicyReport = {
    reportKey: "generated-artifact-size-policy",
    generatedAtUtc: TEST_HARDENING_GENERATED_AT_UTC,
    currentHead,
    ...completeness,
    sourceFileDiscovery: "not_applicable",
    gitStatus: currentHead === "unknown" ? "missing" : "available",
    toolingDegraded: currentHead === "unknown",
    degradationReason: currentHead === "unknown" ? "git unavailable while reading current head" : null,
    currentHeadSource: currentHead === "unknown" ? "unknown" : "git",
    sourceCommit: currentHead === "unknown" ? null : currentHead,
    freshness: currentHead === "unknown" ? "degraded" : "fresh",
    baselineStatus: "not_required",
    ...cleanup,
    defaultMaxLines: 500,
    defaultMaxBytes: 250000,
    generatedArtifactsAudited: artifacts.length,
    oversizedArtifacts,
    generatedArtifactsShrunk: 0,
    unsafeUnknowns: oversizedArtifacts.filter((artifact) => artifact.classification === "unsafe_unknown").length,
    remainingGaps: oversizedArtifacts.slice(0, 10).map((artifact) => `${artifact.artifactPath}: ${artifact.lineCount} lines, ${artifact.byteCount} bytes, ${artifact.classification}.`),
    nextExactSteps: [
      "Keep new generated artifacts compact by default.",
      "Use counts, top findings, score impact, currentHead, validation failures, and next actions in default reports.",
      "Move full detail to drilldown or derive it at runtime/source scan time.",
    ],
    validationFailures: [],
  };
  report.validationFailures = validateGeneratedArtifactSizePolicyReport(report).failures;
  return report;
}

export function validateGeneratedArtifactSizePolicyReport(report: GeneratedArtifactSizePolicyReport): ValidationResult {
  const failures: string[] = [];
  if (report.defaultMaxLines !== 500) failures.push("generated artifact max line policy is not 500.");
  if (report.defaultMaxBytes !== 250000) failures.push("generated artifact max byte policy is not 250000.");
  if (report.generatedArtifactsAudited === 0) failures.push("no generated artifacts audited.");
  if (!report.cleanupPolicy) failures.push("generated artifact size policy report must declare cleanupPolicy.");
  if (!report.owner || !report.rollback) failures.push("generated artifact size policy report must declare owner and rollback.");
  if (report.reportCompleteness === "capped" && report.omittedFindingCount <= 0) failures.push("capped generated artifact size policy report must declare omitted findings.");
  if (report.gitStatus === "missing" && !report.toolingDegraded) failures.push("missing Git must be surfaced as degraded tooling.");
  if (report.unsafeUnknowns > 0) failures.push("new test-hardening generated artifact exceeds compact policy.");
  for (const path of [
    "agent/state/test-fixture-inventory.generated.json",
    "agent/state/validator-ownership-map.generated.json",
    "agent/state/test-quality-guards.generated.json",
    "agent/state/generated-artifact-size-policy.generated.json",
    "agent/state/qa-harness-consolidation.generated.json",
    "agent/state/test-fixture-memory-writeback.generated.json",
  ]) {
    const text = readText(path);
    if (text && text.split(/\r?\n/u).length > 500) failures.push(`${path} exceeds compact policy.`);
  }
  return validation(failures.length === 0, failures);
}
