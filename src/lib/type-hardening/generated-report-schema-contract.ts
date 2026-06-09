import {
  buildGeneratedReportCleanupMetadata,
  buildGeneratedReportCompleteness,
  type GeneratedReportBaselineStatus,
  type GeneratedReportCleanupMetadata,
  type GeneratedReportCompletenessMetadata,
  type GeneratedReportFreshness,
} from "@/lib/generated-reports/generated-report-contract";
import {
  currentGitHead,
  lineCount,
  listFiles,
  readText,
  unique,
  type ValidationResult,
} from "./type-hardening-shared";

export const GENERATED_REPORT_BASE_FIELDS = [
  "reportKey",
  "generatedAtUtc",
  "currentHead",
  "status",
  "owner",
  "summary",
  "findings",
  "nextExactSteps",
  "validationFailures",
  "reportCompleteness",
  "totalFindingCount",
  "emittedFindingCount",
  "omittedFindingCount",
  "capStrategy",
  "sourceFileDiscovery",
  "gitStatus",
  "toolingDegraded",
  "freshness",
  "baselineStatus",
  "cleanupPolicy",
  "sourceTruthRole",
] as const;

export type TypeHardeningGeneratedReportBaseField = (typeof GENERATED_REPORT_BASE_FIELDS)[number];

export type GeneratedReportSchemaContractReport = {
  reportKey: "generated-report-schema-contract";
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
  generatedReportsAudited: number;
  typedReportContracts: string[];
  baseFields: TypeHardeningGeneratedReportBaseField[];
  oversizedGeneratedArtifacts: string[];
  compactArtifactPolicy: "summary_plus_top_findings";
  drilldownPolicy: "derive_full_detail_at_runtime_or_source";
  validationFailures: string[];
};

function stateReports() {
  return listFiles(["agent/state"], [".json"]).filter((file) => file.endsWith(".generated.json"));
}

export function buildGeneratedReportSchemaContractReport(options: { generatedAtUtc?: string } = {}): GeneratedReportSchemaContractReport {
  const generatedReports = stateReports();
  const typedReportContracts = listFiles(["src/lib", "scripts/agent"], [".ts"])
    .filter((file) => {
      const text = readText(file);
      return /reportKey|validationFailures|GeneratedReport|Report\s*=/u.test(text);
    });
  const typeHardeningArtifacts = generatedReports.filter((file) => /type-schema|canonical-type|schema-validation|generated-report-schema/u.test(file));
  const oversizedGeneratedArtifacts = typeHardeningArtifacts.filter((file) => lineCount(file) > 500);

  const currentHead = currentGitHead();
  const findingCount = typedReportContracts.length + oversizedGeneratedArtifacts.length;
  const completeness = buildGeneratedReportCompleteness({
    totalFindingCount: findingCount,
    emittedFindingCount: findingCount,
    capStrategy: "none",
    rankingInputCompleteness: "complete",
    highRiskCounts: {
      critical: 0,
      major: oversizedGeneratedArtifacts.length,
      signoff: oversizedGeneratedArtifacts.length,
      privacy: 0,
      payment: 0,
      lockedContent: 0,
      sourceTruth: typedReportContracts.length,
    },
  });
  const cleanup = buildGeneratedReportCleanupMetadata({
    owner: "src/lib/type-hardening/generated-report-schema-contract.ts",
    safetyClass: "source_safe",
    costClass: "local_free",
    rollback: "Regenerate agent/state/generated-report-schema-contract.generated.json with npm run check:generated-report-schema-contract.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run check:generated-report-schema-contract",
    sourceTruthRole: "generated_snapshot",
  });
  const report: GeneratedReportSchemaContractReport = {
    reportKey: "generated-report-schema-contract",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
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
    generatedReportsAudited: generatedReports.length,
    typedReportContracts,
    baseFields: [...GENERATED_REPORT_BASE_FIELDS],
    oversizedGeneratedArtifacts,
    compactArtifactPolicy: "summary_plus_top_findings",
    drilldownPolicy: "derive_full_detail_at_runtime_or_source",
    validationFailures: [],
  };
  report.validationFailures = validateGeneratedReportSchemaContractReport(report).failures;
  return report;
}

export function validateGeneratedReportSchemaContractReport(report: GeneratedReportSchemaContractReport): ValidationResult {
  const failures: string[] = [];
  for (const field of ["generatedAtUtc", "currentHead", "validationFailures"] as const) {
    if (!report.baseFields.includes(field)) failures.push(`generated report base field missing: ${field}`);
  }
  for (const field of ["reportCompleteness", "totalFindingCount", "emittedFindingCount", "omittedFindingCount", "cleanupPolicy", "sourceTruthRole"] as const) {
    if (!report.baseFields.includes(field)) failures.push(`generated report base field missing: ${field}`);
  }
  if (report.generatedReportsAudited === 0) failures.push("no generated reports audited");
  if (report.typedReportContracts.length === 0) failures.push("generated artifact schema is untyped");
  if (!report.cleanupPolicy) failures.push("generated report schema contract must declare cleanupPolicy.");
  if (report.reportCompleteness === "capped" && report.omittedFindingCount <= 0) failures.push("capped generated report schema contract must declare omitted findings.");
  if (report.gitStatus === "missing" && !report.toolingDegraded) failures.push("missing Git must be surfaced as degraded tooling.");
  if (report.oversizedGeneratedArtifacts.length > 0) failures.push("generated type-schema artifact exceeds 500 lines without justification");
  return { ok: failures.length === 0, failures: unique(failures), warnings: [] };
}
