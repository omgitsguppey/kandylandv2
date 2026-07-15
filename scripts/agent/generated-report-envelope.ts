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
  sourceCommit: string;
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
    sourceCommit: currentHead,
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

const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/iu;
const DEFAULT_MAX_CHILD_REPORT_AGE_MS = 24 * 60 * 60 * 1000;

export type GeneratedChildReportEvidenceInput = {
  report: unknown;
  expectedReportKey: string;
  currentHead: string;
  nowMs?: number;
  maxAgeMs?: number;
  requireSourceGate?: boolean;
};

export function validateGeneratedChildReportEvidence(input: GeneratedChildReportEvidenceInput) {
  const failures: string[] = [];
  const label = input.expectedReportKey;
  const report = input.report && typeof input.report === "object" && !Array.isArray(input.report)
    ? input.report as Record<string, unknown>
    : null;

  if (!report) return [`${label} child report must be an object.`];
  if (report.reportKey !== input.expectedReportKey) {
    failures.push(`${label} child reportKey must be ${input.expectedReportKey}.`);
  }
  if (!FULL_GIT_SHA_PATTERN.test(input.currentHead)) {
    failures.push(`${label} expected currentHead must be a full 40-character Git SHA.`);
  }

  const childHead = typeof report.currentHead === "string" ? report.currentHead : "";
  const sourceCommit = typeof report.sourceCommit === "string" ? report.sourceCommit : "";
  if (!FULL_GIT_SHA_PATTERN.test(childHead) || childHead !== input.currentHead) {
    failures.push(`${label} child currentHead must match the current full Git SHA.`);
  }
  if (!FULL_GIT_SHA_PATTERN.test(sourceCommit) || sourceCommit !== childHead) {
    failures.push(`${label} child sourceCommit must match currentHead.`);
  }

  const generatedAtUtc = typeof report.generatedAtUtc === "string" ? report.generatedAtUtc : "";
  const generatedAtMs = Date.parse(generatedAtUtc);
  const nowMs = input.nowMs ?? Date.now();
  const maxAgeMs = input.maxAgeMs ?? DEFAULT_MAX_CHILD_REPORT_AGE_MS;
  if (
    !Number.isFinite(generatedAtMs)
    || generatedAtMs > nowMs
    || nowMs - generatedAtMs > maxAgeMs
  ) {
    failures.push(`${label} child generatedAtUtc must be non-future and fresh within ${maxAgeMs}ms.`);
  }

  if (report.status !== "pass") {
    failures.push(`${label} child status must be pass.`);
  }
  if (Object.prototype.hasOwnProperty.call(report, "passed")) {
    if (typeof report.passed !== "boolean") {
      failures.push(`${label} child passed must be boolean when present.`);
    } else if (report.passed !== (report.status === "pass")) {
      failures.push(`${label} child passed must match status.`);
    }
  }
  if (!Array.isArray(report.validationFailures) || report.validationFailures.length > 0) {
    failures.push(`${label} child validationFailures must be an explicit empty array.`);
  }
  if (input.requireSourceGate === true && report.canClearSourceGate !== true) {
    failures.push(`${label} child canClearSourceGate must be true.`);
  }

  return failures;
}

export function validateGeneratedReportEnvelope(report: Record<string, unknown>) {
  const failures: string[] = [];
  const requiredStrings = ["reportKey", "status", "generatedAtUtc", "currentHead", "sourceCommit", "evidenceClass"];
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
  if (report.sourceCommit !== report.currentHead) failures.push("sourceCommit must match currentHead");
  const hasNoValidationFailures = Array.isArray(report.validationFailures) && report.validationFailures.length === 0;
  if (report.canClearSourceGate === true && (!FULL_GIT_SHA_PATTERN.test(String(report.currentHead)) || report.status !== "pass" || !hasNoValidationFailures)) {
    failures.push("source readiness requires a passing full-head report with no validation failures");
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
