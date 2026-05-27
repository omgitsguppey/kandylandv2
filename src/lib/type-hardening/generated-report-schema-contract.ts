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
] as const;

export type TypeHardeningGeneratedReportBaseField = (typeof GENERATED_REPORT_BASE_FIELDS)[number];

export type GeneratedReportSchemaContractReport = {
  reportKey: "generated-report-schema-contract";
  generatedAtUtc: string;
  currentHead: string;
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

  const report: GeneratedReportSchemaContractReport = {
    reportKey: "generated-report-schema-contract",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    currentHead: currentGitHead(),
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
  if (report.generatedReportsAudited === 0) failures.push("no generated reports audited");
  if (report.typedReportContracts.length === 0) failures.push("generated artifact schema is untyped");
  if (report.oversizedGeneratedArtifacts.length > 0) failures.push("generated type-schema artifact exceeds 500 lines without justification");
  return { ok: failures.length === 0, failures: unique(failures), warnings: [] };
}
