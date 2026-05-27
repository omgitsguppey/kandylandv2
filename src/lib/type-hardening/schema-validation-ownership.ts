import {
  TYPE_SCAN_ROOTS,
  countMatches,
  currentGitHead,
  listFiles,
  readText,
  unique,
  type ValidationResult,
} from "./type-hardening-shared";

export type SchemaValidationOwnershipReport = {
  reportKey: "schema-validation-ownership";
  generatedAtUtc: string;
  currentHead: string;
  validatorsAudited: number;
  schemasAudited: number;
  manualValidatorsAudited: number;
  rules: string[];
  duplicateSchemaRisks: string[];
  classifiedAdapterSchemas: string[];
  staleFieldRisks: string[];
  validationFailures: string[];
};

export const SCHEMA_VALIDATION_OWNERSHIP_RULES = [
  "Runtime validation belongs near the route/service owner.",
  "Shared report validation belongs near the canonical report contract.",
  "Test validators should import schema or canonical type, not duplicate shape.",
  "Zod-like schemas, if present, must be canonical or adapter-only.",
  "JSON artifacts should validate against one report schema.",
] as const;

export function buildSchemaValidationOwnershipReport(options: { generatedAtUtc?: string } = {}): SchemaValidationOwnershipReport {
  const files = listFiles(TYPE_SCAN_ROOTS, [".ts", ".tsx"]);
  const validatorFiles = files.filter((file) => /validate-|\.spec\.ts$|contract|schema|route\.ts$/u.test(file));
  let schemasAudited = 0;
  let manualValidatorsAudited = 0;
  const duplicateSchemaRisks: string[] = [];
  const classifiedAdapterSchemas: string[] = [];
  const staleFieldRisks: string[] = [];

  for (const file of validatorFiles) {
    const text = readText(file);
    schemasAudited += countMatches(text, /\bz\.object\s*\(/gu);
    manualValidatorsAudited += countMatches(text, /function\s+validate[A-Za-z0-9_]+|export\s+function\s+validate[A-Za-z0-9_]+/gu);
    if (/type\s+[A-Za-z0-9_]*(?:DTO|Payload|Report|Finding|Summary)\s*=\s*\{/u.test(text) && !/Fixture|canonical|contract|type-hardening/u.test(file)) {
      classifiedAdapterSchemas.push(file);
    }
    if (/validationFailures\.push\([^)]*stale field|staleFields/u.test(text)) {
      staleFieldRisks.push(file);
    }
  }

  const report: SchemaValidationOwnershipReport = {
    reportKey: "schema-validation-ownership",
    generatedAtUtc: options.generatedAtUtc ?? new Date().toISOString(),
    currentHead: currentGitHead(),
    validatorsAudited: validatorFiles.length,
    schemasAudited,
    manualValidatorsAudited,
    rules: [...SCHEMA_VALIDATION_OWNERSHIP_RULES],
    duplicateSchemaRisks: unique(duplicateSchemaRisks).sort(),
    classifiedAdapterSchemas: unique(classifiedAdapterSchemas).sort(),
    staleFieldRisks: unique(staleFieldRisks).sort(),
    validationFailures: [],
  };
  report.validationFailures = validateSchemaValidationOwnershipReport(report).failures;
  return report;
}

export function validateSchemaValidationOwnershipReport(report: SchemaValidationOwnershipReport): ValidationResult {
  const failures: string[] = [];
  if (report.validatorsAudited === 0) failures.push("no schema validators audited");
  if (!report.rules.includes("Test validators should import schema or canonical type, not duplicate shape.")) {
    failures.push("validator canonical import rule missing");
  }
  if (report.duplicateSchemaRisks.length > 0) failures.push("validator duplicates schema instead of importing canonical type/schema");
  return { ok: failures.length === 0, failures: unique(failures), warnings: report.staleFieldRisks };
}
