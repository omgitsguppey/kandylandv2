import { execFileSync } from "node:child_process";

export type GeneratedReportEvidenceClass =
  | "source_snapshot"
  | "generated_snapshot"
  | "runtime_redacted"
  | "provider_proof"
  | "admin_truth_sample"
  | "external_evidence_required"
  | "historical_evidence_only";

export type GeneratedReportEnvelope = {
  reportKey: string;
  status: string;
  generatedAtUtc: string;
  currentHead: string;
  evidenceClass: GeneratedReportEvidenceClass;
  canClearSourceGate: boolean;
  canClearRuntimeGate: boolean;
  canClearProviderGate: boolean;
  canClearAdminTruthGate: boolean;
  nextExactSteps: string[];
  validationFailures: string[];
  doesNotProve: string[];
};

export function readCurrentHead(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

export function withGeneratedReportEnvelope<T extends Record<string, unknown>>(
  report: T,
  input: {
    reportKey?: string;
    status?: string;
    generatedAtUtc?: string;
    currentHead?: string;
    evidenceClass: GeneratedReportEvidenceClass;
    canClearSourceGate: boolean;
    canClearRuntimeGate?: boolean;
    canClearProviderGate?: boolean;
    canClearAdminTruthGate?: boolean;
    nextExactSteps: string[];
    validationFailures?: string[];
    doesNotProve: string[];
  },
): T & GeneratedReportEnvelope {
  const validationFailures = input.validationFailures
    ?? (Array.isArray(report.validationFailures) ? report.validationFailures.filter((value): value is string => typeof value === "string") : []);
  const generatedAtUtc = input.generatedAtUtc
    ?? (typeof report.generatedAtUtc === "string" ? report.generatedAtUtc : new Date().toISOString());
  const currentHead = input.currentHead
    ?? (typeof report.currentHead === "string" ? report.currentHead : readCurrentHead());
  const reportKey = input.reportKey
    ?? (typeof report.reportKey === "string" ? report.reportKey : "unknown-report");

  return {
    ...report,
    reportKey,
    status: input.status ?? (typeof report.status === "string" ? report.status : validationFailures.length > 0 ? "fail" : "pass"),
    generatedAtUtc,
    currentHead,
    evidenceClass: currentHead === "unknown" ? "historical_evidence_only" : input.evidenceClass,
    canClearSourceGate: input.canClearSourceGate,
    canClearRuntimeGate: input.canClearRuntimeGate ?? false,
    canClearProviderGate: input.canClearProviderGate ?? false,
    canClearAdminTruthGate: input.canClearAdminTruthGate ?? false,
    nextExactSteps: input.nextExactSteps,
    validationFailures,
    doesNotProve: input.doesNotProve,
  };
}

export function validateGeneratedReportEnvelope(report: Record<string, unknown>) {
  const failures: string[] = [];
  const requiredStrings = ["reportKey", "status", "generatedAtUtc", "currentHead", "evidenceClass"];
  const requiredBooleans = ["canClearSourceGate", "canClearRuntimeGate", "canClearProviderGate", "canClearAdminTruthGate"];
  for (const key of requiredStrings) {
    if (typeof report[key] !== "string" || !String(report[key]).trim()) failures.push(`missing envelope string ${key}`);
  }
  for (const key of requiredBooleans) {
    if (typeof report[key] !== "boolean") failures.push(`missing envelope boolean ${key}`);
  }
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("missing envelope nextExactSteps");
  if (!Array.isArray(report.validationFailures)) failures.push("missing envelope validationFailures");
  if (!Array.isArray(report.doesNotProve) || report.doesNotProve.length === 0) failures.push("missing envelope doesNotProve");
  if (report.currentHead === "unknown" && report.evidenceClass !== "historical_evidence_only") {
    failures.push("reports without currentHead must be historical_evidence_only");
  }
  if (report.canClearRuntimeGate === true && report.evidenceClass !== "runtime_redacted") {
    failures.push(`canClearRuntimeGate cannot be cleared by ${String(report.evidenceClass)}`);
  }
  if (report.canClearProviderGate === true && report.evidenceClass !== "provider_proof") {
    failures.push(`canClearProviderGate cannot be cleared by ${String(report.evidenceClass)}`);
  }
  if (report.canClearAdminTruthGate === true && report.evidenceClass !== "admin_truth_sample") {
    failures.push(`canClearAdminTruthGate cannot be cleared by ${String(report.evidenceClass)}`);
  }
  return failures;
}
