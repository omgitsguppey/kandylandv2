export const GENERATED_REPORT_DEFAULT_STALE_HOURS = 24;

export const GENERATED_REPORT_AUTHORITY_STATE_PATH =
  "agent/state/generated-report-authority.generated.json" as const;

export const GENERATED_REPORT_SCAN_ROOTS = [
  "agent/state",
  "agent/index",
  "agent/context",
] as const;

export const GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS = [
  "src/app",
  "src/components",
  "src/lib/server",
] as const;

export const GENERATED_REPORT_FRESHNESS_STATES = [
  "fresh",
  "stale",
  "unknown",
  "degraded",
] as const;

export type GeneratedReportFreshness = (typeof GENERATED_REPORT_FRESHNESS_STATES)[number];

export type GeneratedReportCompleteness = "complete" | "sampled" | "capped" | "degraded" | "partial";
export type GeneratedReportCapStrategy = "top_risk" | "deterministic_first" | "grouped_examples" | "summary_only" | "none";
export type GeneratedReportSourceFileDiscovery = "git" | "repo_inventory" | "filesystem" | "not_applicable";
export type GeneratedReportGitStatus = "available" | "missing" | "error" | "not_required";
export type GeneratedReportCurrentHeadSource = "git" | "repo_inventory" | "generated_artifact" | "unknown" | "not_required";
export type GeneratedReportBaselineStatus = "current" | "stale" | "missing" | "unknown" | "not_required";
export type GeneratedReportSafetyClass = "source_safe" | "runtime_sensitive" | "provider_sensitive" | "release_governance";
export type GeneratedReportCostClass = "local_free" | "local_moderate" | "external_manual" | "provider_cost";
export type GeneratedReportCleanupPolicy =
  | "preserve_tracked_snapshot"
  | "regenerate"
  | "delete_before_signoff"
  | "archive_manual_review";
export type GeneratedReportSourceTruthRole =
  | "primary_source"
  | "supporting_evidence"
  | "generated_snapshot"
  | "manual_review";

export type GeneratedReportCompletenessMetadata = {
  reportCompleteness: GeneratedReportCompleteness;
  totalFindingCount: number;
  emittedFindingCount: number;
  omittedFindingCount: number;
  capReason: string | null;
  capStrategy: GeneratedReportCapStrategy;
  capLimit: number | null;
  rankingInputCompleteness: GeneratedReportCompleteness;
  highRiskCounts: {
    critical: number;
    major: number;
    signoff: number;
    privacy: number;
    payment: number;
    lockedContent: number;
    sourceTruth: number;
  };
};

export type GeneratedReportToolchainMetadata = {
  sourceFileDiscovery: GeneratedReportSourceFileDiscovery;
  gitStatus: GeneratedReportGitStatus;
  toolingDegraded: boolean;
  degradationReason: string | null;
  currentHead: string | null;
  currentHeadSource: GeneratedReportCurrentHeadSource;
};

export type GeneratedReportFreshnessMetadata = {
  generatedAtUtc: string;
  sourceCommit: string | null;
  freshness: GeneratedReportFreshness;
  baselineStatus: GeneratedReportBaselineStatus;
};

export type GeneratedReportCleanupMetadata = {
  owner: string;
  safetyClass: GeneratedReportSafetyClass;
  costClass: GeneratedReportCostClass;
  rollback: string;
  cleanupPolicy: GeneratedReportCleanupPolicy;
  cleanupCommand: string | null;
  sourceTruthRole: GeneratedReportSourceTruthRole;
};

export type GeneratedReportMetadataContract =
  GeneratedReportCompletenessMetadata
  & GeneratedReportToolchainMetadata
  & GeneratedReportFreshnessMetadata
  & GeneratedReportCleanupMetadata;

export type GeneratedReportMetadataSource =
  | "embedded"
  | "filesystem_fallback"
  | "authority_manifest";

export function isGeneratedReportPath(repoPath: string) {
  const normalized = repoPath.replace(/\\/gu, "/");

  if (normalized.startsWith("agent/state/")) {
    return normalized.endsWith(".generated.json");
  }

  if (normalized.startsWith("agent/index/")) {
    return normalized.endsWith(".json");
  }

  if (normalized.startsWith("agent/context/")) {
    return normalized.endsWith(".generated.json");
  }

  return false;
}

export function buildGeneratedReportCompleteness(input: {
  totalFindingCount: number;
  emittedFindingCount?: number;
  capLimit?: number | null;
  capStrategy?: GeneratedReportCapStrategy;
  capReason?: string | null;
  degraded?: boolean;
  partial?: boolean;
  sampled?: boolean;
  rankingInputCompleteness?: GeneratedReportCompleteness;
  highRiskCounts?: GeneratedReportCompletenessMetadata["highRiskCounts"];
}): GeneratedReportCompletenessMetadata {
  const emittedFindingCount = input.emittedFindingCount ?? input.totalFindingCount;
  const omittedFindingCount = Math.max(0, input.totalFindingCount - emittedFindingCount);
  const reportCompleteness: GeneratedReportCompleteness = input.degraded
    ? "degraded"
    : input.partial
      ? "partial"
      : input.sampled
        ? "sampled"
        : omittedFindingCount > 0
          ? "capped"
          : "complete";

  return {
    reportCompleteness,
    totalFindingCount: input.totalFindingCount,
    emittedFindingCount,
    omittedFindingCount,
    capReason: omittedFindingCount > 0 ? input.capReason ?? "compact report output" : input.capReason ?? null,
    capStrategy: omittedFindingCount > 0 ? input.capStrategy ?? "deterministic_first" : input.capStrategy ?? "none",
    capLimit: input.capLimit ?? (omittedFindingCount > 0 ? emittedFindingCount : null),
    rankingInputCompleteness: input.rankingInputCompleteness ?? reportCompleteness,
    highRiskCounts: input.highRiskCounts ?? {
      critical: 0,
      major: 0,
      signoff: 0,
      privacy: 0,
      payment: 0,
      lockedContent: 0,
      sourceTruth: 0,
    },
  };
}

export function buildGeneratedReportCleanupMetadata(input: GeneratedReportCleanupMetadata): GeneratedReportCleanupMetadata {
  return input;
}

export function validateGeneratedReportMetadataContract(report: Record<string, unknown>) {
  const failures: string[] = [];
  const warnings: string[] = [];
  const requiredStrings = ["reportCompleteness", "capStrategy", "sourceFileDiscovery", "gitStatus", "currentHeadSource", "freshness", "baselineStatus", "owner", "safetyClass", "costClass", "rollback", "cleanupPolicy", "sourceTruthRole"];
  const requiredNumbers = ["totalFindingCount", "emittedFindingCount", "omittedFindingCount"];

  for (const key of requiredStrings) {
    if (typeof report[key] !== "string" || !String(report[key]).trim()) warnings.push(`missing generated report metadata string ${key}`);
  }
  for (const key of requiredNumbers) {
    if (typeof report[key] !== "number" || !Number.isFinite(report[key] as number)) warnings.push(`missing generated report metadata number ${key}`);
  }
  if (typeof report.toolingDegraded !== "boolean") warnings.push("missing generated report metadata boolean toolingDegraded");
  if (report.reportCompleteness === "capped") {
    if (typeof report.omittedFindingCount !== "number" || report.omittedFindingCount <= 0) failures.push("capped report must declare omittedFindingCount > 0");
    if (report.capStrategy === "none") failures.push("capped report must declare a non-none capStrategy");
    if (report.capLimit === null || typeof report.capLimit === "undefined") failures.push("capped report must declare capLimit");
  }
  if (report.rankingInputCompleteness === "capped") {
    failures.push("ranker input completeness cannot be capped without an explicit pre-cap ranking guarantee");
  }
  if (report.gitStatus === "missing" && report.toolingDegraded !== true) {
    failures.push("missing Git must set toolingDegraded=true");
  }
  if (report.gitStatus === "missing" && report.currentHeadSource === "git") {
    failures.push("missing Git cannot claim currentHeadSource=git");
  }
  if (report.sourceTruthRole === "primary_source" && report.reportCompleteness !== "complete") {
    failures.push("primary source reports must be complete");
  }

  return { failures, warnings };
}

export function deriveGeneratedReportFreshness(input: {
  generatedAt?: string | null;
  nowMs?: number;
  staleAfterHours?: number;
  sourceCommit?: string | null;
  currentHead?: string | null;
}): GeneratedReportFreshness {
  const sourceCommit = input.sourceCommit?.trim();
  const currentHead = input.currentHead?.trim();
  if (sourceCommit && currentHead && sourceCommit !== currentHead) {
    return "stale";
  }

  const generatedAt = input.generatedAt?.trim();
  if (!generatedAt) {
    return "unknown";
  }

  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    return "unknown";
  }

  const staleAfterHours = input.staleAfterHours ?? GENERATED_REPORT_DEFAULT_STALE_HOURS;
  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;

  return nowMs - generatedAtMs > staleAfterMs ? "stale" : "fresh";
}
