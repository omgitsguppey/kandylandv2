import { statSync } from "node:fs";

import {
  GENERATED_REPORT_AUTHORITY_STATE_PATH,
  GENERATED_REPORT_DEFAULT_STALE_HOURS,
  GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS,
  GENERATED_REPORT_SCAN_ROOTS,
  deriveGeneratedReportFreshness,
  isGeneratedReportPath,
  type GeneratedReportFreshness,
  type GeneratedReportMetadataSource,
  buildGeneratedReportCleanupMetadata,
  buildGeneratedReportCompleteness,
  validateGeneratedReportMetadataContract,
  type GeneratedReportBaselineStatus,
  type GeneratedReportCleanupMetadata,
  type GeneratedReportCompletenessMetadata,
} from "../../src/lib/agent-governance/generated-reports/generated-report-contract";
import {
  nowIso,
  readJsonFile,
  readText,
  readRepoToolchainState,
  toAbsoluteRepoPath,
  walkDirectoryFiles,
  writeJsonFile,
  type Json,
} from "./shared";
import { validateGeneratedReportEnvelope } from "./generated-report-envelope";

type JsonRecord = Record<string, Json>;

type DoctrineRegistryEntry = {
  path: string;
  authorityLevel?: number;
  status?: string;
};

type GeneratedReportAuthorityEntry = {
  path: string;
  generatedAt: string;
  sourceCommit: string;
  status: string;
  evidenceClass: string;
  freshness: GeneratedReportFreshness;
  staleAfterHours: number;
  metadataSource: GeneratedReportMetadataSource;
  missingEmbeddedFields: string[];
  metadataWarnings: string[];
};

type GeneratedReportAuthorityDocument = {
  reportKey: "generated-report-authority";
  generatedAt: string;
  generatedAtUtc: string;
  sourceCommit: string;
  currentHead: string;
  currentHeadSource: "git" | "repo_inventory" | "generated_artifact" | "unknown";
  gitStatus: "available" | "missing" | "error";
  sourceFileDiscovery: "git" | "repo_inventory" | "filesystem";
  toolingDegraded: boolean;
  degradationReason: string | null;
  reportCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  totalFindingCount: number;
  emittedFindingCount: number;
  omittedFindingCount: number;
  capReason: string | null;
  capStrategy: GeneratedReportCompletenessMetadata["capStrategy"];
  capLimit: number | null;
  rankingInputCompleteness: GeneratedReportCompletenessMetadata["reportCompleteness"];
  highRiskCounts: NonNullable<GeneratedReportCompletenessMetadata["highRiskCounts"]>;
  baselineStatus: GeneratedReportBaselineStatus;
  owner: string;
  safetyClass: GeneratedReportCleanupMetadata["safetyClass"];
  costClass: GeneratedReportCleanupMetadata["costClass"];
  rollback: string;
  cleanupPolicy: GeneratedReportCleanupMetadata["cleanupPolicy"];
  cleanupCommand: string | null;
  sourceTruthRole: GeneratedReportCleanupMetadata["sourceTruthRole"];
  status: "pass" | "fail";
  evidenceClass: "source_snapshot";
  canClearSourceGate: boolean;
  canClearRuntimeGate: false;
  canClearProviderGate: false;
  canClearAdminTruthGate: false;
  nextExactSteps: string[];
  validationFailures: string[];
  doesNotProve: string[];
  freshness: GeneratedReportFreshness;
  reportFormat: "compact_summary";
  defaultStaleAfterHours: number;
  summary: {
    reportCount: number;
    reportedSampleCount: number;
    omittedReportCount: number;
    staleCount: number;
    unknownFreshnessCount: number;
    runtimeViolationCount: number;
    doctrineOverrideViolationCount: number;
    targetActionabilityAuditCount: number;
    targetArchiveCandidateCount: number;
    targetEmptyProofRiskCount: number;
    metadataWarningCount: number;
    missingCleanupPolicyCount: number;
    cappedWithoutOmittedCount: number;
  };
  reports: GeneratedReportAuthorityEntry[];
  targetReportAudits: TargetReportActionabilityAudit[];
  runtimeViolations: string[];
  doctrineOverrideViolations: string[];
  guidance: string[];
  failures: string[];
  metadataWarnings: string[];
};

type TargetReportClassification =
  | "real_pass"
  | "stale_shell"
  | "missing_implementation"
  | "archive_candidate";

type TargetReportActionabilityAudit = {
  reportKey: string;
  statePath: string;
  producerPath: string;
  classification: TargetReportClassification;
  statusBasis: string;
  proofScope: "source_contract_only" | "classifier_behavior_only" | "readiness_runbook_only" | "archive_evidence_only" | "missing_source_sample";
  countsAsRuntimeProof: false;
  countsAsProviderProof: false;
  countsAsAdminTruthProof: boolean;
  actionableStatus: "actionable" | "nonblocking_pass" | "manual_review" | "archive_only";
  findingCount: number;
  recommendation: string;
  emptyProofRisk: boolean;
  envelopeFailures: string[];
  evidenceClass: string;
  doesNotProve: string[];
};

const TARGET_REPORT_SPECS: Array<{
  reportKey: string;
  producerPath: string;
  proofScope: TargetReportActionabilityAudit["proofScope"];
  classification: TargetReportClassification;
  actionableStatus: TargetReportActionabilityAudit["actionableStatus"];
  recommendation: string;
}> = [
  {
    reportKey: "notification-permission-lifecycle",
    producerPath: "scripts/agent/validate-notification-permission-lifecycle.ts",
    proofScope: "source_contract_only",
    classification: "real_pass",
    actionableStatus: "nonblocking_pass",
    recommendation: "Keep as source-contract proof only; refresh with check:notification-permission-lifecycle before using as current evidence.",
  },
  {
    reportKey: "notification-return-loop-audit",
    producerPath: "scripts/agent/validate-notification-return-loop.ts",
    proofScope: "archive_evidence_only",
    classification: "archive_candidate",
    actionableStatus: "archive_only",
    recommendation: "Archive or replace with a regenerated report producer; current validator reads this audit but does not produce a fresh current-head artifact.",
  },
  {
    reportKey: "release-rollback-incident-readiness",
    producerPath: "scripts/agent/validate-release-rollback-incident-readiness.ts",
    proofScope: "readiness_runbook_only",
    classification: "real_pass",
    actionableStatus: "nonblocking_pass",
    recommendation: "Keep as rollback readiness/runbook evidence; it does not prove deployed runtime, provider smoke, or incident execution.",
  },
  {
    reportKey: "route-sample-freshness-classifier",
    producerPath: "scripts/agent/validate-route-sample-freshness-classifier.ts",
    proofScope: "classifier_behavior_only",
    classification: "real_pass",
    actionableStatus: "nonblocking_pass",
    recommendation: "Keep as classifier behavior coverage; do not treat the synthetic stale/no-sample examples as current route health proof.",
  },
  {
    reportKey: "stale-route-sample-classification",
    producerPath: "scripts/agent/validate-stale-route-sample-classification.ts",
    proofScope: "classifier_behavior_only",
    classification: "real_pass",
    actionableStatus: "actionable",
    recommendation: "Keep compact route evidence classification and use groupedActionList as next-action evidence, not route freshness proof.",
  },
  {
    reportKey: "user-management-status-truth",
    producerPath: "scripts/agent/validate-user-management-status-truth.ts",
    proofScope: "missing_source_sample",
    classification: "missing_implementation",
    actionableStatus: "actionable",
    recommendation: "Keep as source-missing/admin sample action queue; summaries=0 and sourceWindowPresent=false must not count as healthy user-management proof.",
  },
  {
    reportKey: "settings-health-status-cleanup",
    producerPath: "scripts/agent/validate-settings-health-status-cleanup.ts",
    proofScope: "source_contract_only",
    classification: "real_pass",
    actionableStatus: "nonblocking_pass",
    recommendation: "Keep as settings health source-contract evidence; refresh before use and do not claim runtime/admin sample proof from it alone.",
  },
  {
    reportKey: "bug-report-truth-terminal-state",
    producerPath: "scripts/agent/validate-bug-report-truth-terminal-state.ts",
    proofScope: "classifier_behavior_only",
    classification: "real_pass",
    actionableStatus: "nonblocking_pass",
    recommendation: "Keep as terminal-state classifier proof; loaded_empty/failed examples are synthetic and cannot prove live bug-report volume.",
  },
  {
    reportKey: "test-quality-guards",
    producerPath: "scripts/agent/validate-test-quality-guards.ts",
    proofScope: "source_contract_only",
    classification: "real_pass",
    actionableStatus: "nonblocking_pass",
    recommendation: "Keep as source-level test hygiene evidence; provider_call and production_read exceptions cannot clear release/proof gates.",
  },
  {
    reportKey: "test-fixture-inventory",
    producerPath: "scripts/agent/validate-test-fixture-inventory.ts",
    proofScope: "source_contract_only",
    classification: "real_pass",
    actionableStatus: "actionable",
    recommendation: "Keep severity counts visible; fixture drift is source-only evidence and cannot use raw live user activity.",
  },
];

const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function listGeneratedReportFiles() {
  return GENERATED_REPORT_SCAN_ROOTS
    .flatMap((root) => walkDirectoryFiles(root))
    .filter((repoPath) => isGeneratedReportPath(repoPath))
    .filter((repoPath) => repoPath !== GENERATED_REPORT_AUTHORITY_STATE_PATH)
    .sort((left, right) => left.localeCompare(right));
}

function readJsonRecord(repoPath: string): JsonRecord | null {
  try {
    const parsed = readJsonFile<Json>(repoPath);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as JsonRecord;
  } catch {
    return null;
  }
}

function readStringField(record: JsonRecord | null, key: string) {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readArrayLength(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? value.length : 0;
}

function readObjectKeyCount(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
}

function hasTruthyField(record: JsonRecord | null, key: string) {
  return Boolean(record?.[key]);
}

function buildReportEntry(
  repoPath: string,
  headCommit: string,
  nowMs: number,
): GeneratedReportAuthorityEntry {
  const record = readJsonRecord(repoPath);
  const metadataCheck = record ? validateGeneratedReportMetadataContract(record as Record<string, unknown>) : { failures: [], warnings: ["missing generated report record"] };
  const modifiedAt = statSync(toAbsoluteRepoPath(repoPath)).mtime.toISOString();
  const embeddedGeneratedAt = readStringField(record, "generatedAt");
  const embeddedGeneratedAtUtc = readStringField(record, "generatedAtUtc");
  const embeddedStatus = readStringField(record, "status");
  const embeddedSourceCommit = readStringField(record, "sourceCommit");
  const embeddedCurrentHead = readStringField(record, "currentHead");
  const embeddedFreshness = readStringField(record, "freshness");
  const embeddedEvidenceClass = readStringField(record, "evidenceClass");

  const missingEmbeddedFields = [
    embeddedGeneratedAt || embeddedGeneratedAtUtc ? null : "generatedAtUtc",
    embeddedStatus ? null : "status",
    embeddedCurrentHead || embeddedSourceCommit ? null : "currentHead",
    embeddedEvidenceClass ? null : "evidenceClass",
  ].filter((value): value is string => Boolean(value));

  const generatedAt = embeddedGeneratedAtUtc ?? embeddedGeneratedAt ?? modifiedAt;
  const sourceCommit = embeddedCurrentHead ?? embeddedSourceCommit ?? headCommit;
  const evidenceClass = embeddedCurrentHead || embeddedSourceCommit ? embeddedEvidenceClass ?? "generated_snapshot" : "historical_evidence_only";
  const status = embeddedCurrentHead || embeddedSourceCommit ? embeddedStatus ?? "snapshot" : "historical_evidence_only";
  const headMismatch = Boolean(sourceCommit && headCommit && sourceCommit !== headCommit);
  const derivedFreshness = deriveGeneratedReportFreshness({
    generatedAt,
    nowMs,
    staleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    sourceCommit,
    currentHead: headCommit,
  });
  const freshness = headMismatch
    ? "stale"
    : embeddedFreshness === "fresh" || embeddedFreshness === "stale" || embeddedFreshness === "unknown"
      ? embeddedFreshness
      : derivedFreshness;

  let metadataSource: GeneratedReportMetadataSource = "embedded";
  if (missingEmbeddedFields.length > 0) {
    metadataSource = embeddedGeneratedAt || embeddedStatus ? "authority_manifest" : "filesystem_fallback";
  }

  return {
    path: repoPath,
    generatedAt,
    sourceCommit,
    status,
    evidenceClass,
    freshness,
    staleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    metadataSource,
    missingEmbeddedFields,
    metadataWarnings: [
      ...metadataCheck.failures,
      ...metadataCheck.warnings,
      ...(headMismatch ? [`sourceCommit ${sourceCommit} does not match currentHead ${headCommit}`] : []),
    ],
  };
}

function findRuntimeViolations() {
  const violations: string[] = [];
  const importPattern =
    /\b(?:import\s*\(\s*|require\(\s*|from\s+|readFileSync\(\s*|readText\(\s*|readJsonFile\(\s*)["'][^"']*agent\/(?:state|index|context)\//u;

  for (const root of GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS) {
    for (const repoPath of walkDirectoryFiles(root).filter((candidate) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(candidate))) {
      const source = readText(repoPath);
      if (importPattern.test(source)) {
        violations.push(`${repoPath} must not import or read generated report artifacts from agent/.`);
      }
    }
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function findDoctrineOverrideViolations() {
  const violations: string[] = [];
  const doctrineRegistry = readJsonFile<{ entries?: DoctrineRegistryEntry[] }>("agent/context/doctrine-registry.json");
  for (const entry of doctrineRegistry.entries ?? []) {
    const normalizedPath = entry.path.replace(/\\/gu, "/");
    if (!isGeneratedReportPath(normalizedPath)) {
      continue;
    }

    if ((entry.authorityLevel ?? 99) < 6) {
      violations.push(`${normalizedPath} must remain authority level 6 or lower-priority snapshot evidence.`);
    }

    if (entry.status && entry.status !== "generated") {
      violations.push(`${normalizedPath} must stay classified as generated evidence, not ${entry.status}.`);
    }
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

function buildTargetReportActionabilityAudit(spec: (typeof TARGET_REPORT_SPECS)[number]): TargetReportActionabilityAudit {
  const statePath = `agent/state/${spec.reportKey}.generated.json`;
  const record = readJsonRecord(statePath);
  const validationFailureCount = readArrayLength(record, "validationFailures");
  const envelopeFailures = record ? validateGeneratedReportEnvelope(record as Record<string, unknown>) : ["missing report record"];
  const status = readStringField(record, "status") ?? readStringField(record, "statusAfter") ?? readStringField(record, "bugReportTerminalState") ?? "snapshot";
  const evidenceClass = readStringField(record, "evidenceClass") ?? "historical_evidence_only";
  const doesNotProve = Array.isArray(record?.doesNotProve) ? record.doesNotProve.filter((value): value is string => typeof value === "string") : [];
  const validationOk = validationFailureCount === 0;
  const findingCount =
    validationFailureCount
    + readArrayLength(record, "groupedActionList")
    + readArrayLength(record, "surfaces")
    + readArrayLength(record, "rollbackTriggerConditions")
    + readArrayLength(record, "missingHydrationExplanations")
    + readArrayLength(record, "oldLogicReferences")
    + readObjectKeyCount(record, "loadedEmpty")
    + readObjectKeyCount(record, "failed")
    + readObjectKeyCount(record, "staleFailure")
    + readObjectKeyCount(record, "noSample");
  const hasSourceMissingSignal =
    hasTruthyField(record, "sourceWindowPresent") === false
    && (spec.reportKey === "user-management-status-truth" || status.includes("source_ready_no_sample"));
  const emptyProofRisk =
    validationOk
    && findingCount === 0
    && spec.classification === "real_pass"
    && spec.proofScope !== "source_contract_only";

  return {
    reportKey: spec.reportKey,
    statePath,
    producerPath: spec.producerPath,
    classification: hasSourceMissingSignal ? "missing_implementation" : spec.classification,
    statusBasis: status,
    proofScope: hasSourceMissingSignal ? "missing_source_sample" : spec.proofScope,
    countsAsRuntimeProof: false,
    countsAsProviderProof: false,
    countsAsAdminTruthProof: spec.proofScope === "source_contract_only" && spec.reportKey === "settings-health-status-cleanup",
    actionableStatus: hasSourceMissingSignal ? "actionable" : spec.actionableStatus,
    findingCount,
    recommendation: spec.recommendation,
    emptyProofRisk,
    envelopeFailures,
    evidenceClass,
    doesNotProve,
  };
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function main() {
  const toolchain = readRepoToolchainState();
  const headCommit = toolchain.currentHead ?? "unknown";
  const now = nowIso();
  const nowMs = Date.parse(now);

  const reports = listGeneratedReportFiles().map((repoPath) => buildReportEntry(repoPath, headCommit, nowMs));
  const runtimeViolations = findRuntimeViolations();
  const doctrineOverrideViolations = findDoctrineOverrideViolations();
  const targetReportAudits = TARGET_REPORT_SPECS.map(buildTargetReportActionabilityAudit);

  for (const violation of runtimeViolations) {
    fail(violation);
  }
  for (const violation of doctrineOverrideViolations) {
    fail(violation);
  }
  for (const audit of targetReportAudits) {
    if (audit.emptyProofRisk) {
      fail(`${audit.reportKey} is an empty pass-like report and must not count as proof.`);
    }
    for (const envelopeFailure of audit.envelopeFailures) {
      fail(`${audit.reportKey} envelope invalid: ${envelopeFailure}.`);
    }
    if (audit.doesNotProve.length === 0) {
      fail(`${audit.reportKey} must declare doesNotProve even when validationFailures is empty.`);
    }
    const record = readJsonRecord(audit.statePath);
    const clearsForbiddenGate = record?.canClearRuntimeGate === true || record?.canClearProviderGate === true || record?.canClearAdminTruthGate === true;
    const hasExternalException = JSON.stringify(record ?? {}).includes("provider_call") || JSON.stringify(record ?? {}).includes("production_read");
    if (hasExternalException && clearsForbiddenGate) {
      fail(`${audit.reportKey} provider_call/production_read exceptions cannot clear release/proof gates.`);
    }
  }

  const packageJson = readText("package.json");
  if (!packageJson.includes("\"check:generated-report-authority\": \"tsx scripts/agent/validate-generated-report-authority.ts\"")) {
    fail("package.json must expose check:generated-report-authority.");
  }

  const agentsSource = readText("AGENTS.md");
  requireIncludes(agentsSource, "Generated reports are evidence snapshots only", "AGENTS.md");
  requireIncludes(agentsSource, "check:generated-report-authority", "AGENTS.md");

  const readmeSource = readText("README.md");
  requireIncludes(readmeSource, "Generated reports are evidence snapshots only", "README.md");
  requireIncludes(readmeSource, "check:generated-report-authority", "README.md");

  const summary = {
    reportCount: reports.length,
    reportedSampleCount: Math.min(reports.length, 80),
    omittedReportCount: Math.max(0, reports.length - 80),
    staleCount: reports.filter((report) => report.freshness === "stale").length,
    unknownFreshnessCount: reports.filter((report) => report.freshness === "unknown").length,
    runtimeViolationCount: runtimeViolations.length,
    doctrineOverrideViolationCount: doctrineOverrideViolations.length,
    targetActionabilityAuditCount: targetReportAudits.length,
    targetArchiveCandidateCount: targetReportAudits.filter((audit) => audit.classification === "archive_candidate").length,
    targetEmptyProofRiskCount: targetReportAudits.filter((audit) => audit.emptyProofRisk).length,
    metadataWarningCount: reports.reduce((count, report) => count + report.metadataWarnings.length, 0),
    missingCleanupPolicyCount: reports.filter((report) => report.metadataWarnings.some((warning) => warning.includes("cleanupPolicy"))).length,
    cappedWithoutOmittedCount: reports.filter((report) => report.metadataWarnings.some((warning) => warning.includes("capped report"))).length,
  };
  const authorityCompleteness = buildGeneratedReportCompleteness({
    totalFindingCount: reports.length,
    emittedFindingCount: Math.min(reports.length, 80),
    capLimit: 80,
    capStrategy: reports.length > 80 ? "grouped_examples" : "none",
    capReason: reports.length > 80 ? "authority report emits stale/unknown/missing-metadata examples plus aggregate counts" : null,
    degraded: toolchain.toolingDegraded,
    rankingInputCompleteness: "complete",
    highRiskCounts: {
      critical: runtimeViolations.length,
      major: doctrineOverrideViolations.length + summary.cappedWithoutOmittedCount,
      signoff: targetReportAudits.filter((audit) => audit.actionableStatus === "actionable").length,
      privacy: 0,
      payment: 0,
      lockedContent: 0,
      sourceTruth: summary.missingCleanupPolicyCount,
    },
  });
  const cleanup = buildGeneratedReportCleanupMetadata({
    owner: "scripts/agent/validate-generated-report-authority.ts",
    safetyClass: "release_governance",
    costClass: "local_free",
    rollback: "Regenerate agent/state/generated-report-authority.generated.json with npm run check:generated-report-authority.",
    cleanupPolicy: "regenerate",
    cleanupCommand: "npm run check:generated-report-authority",
    sourceTruthRole: "generated_snapshot",
  });
  const metadataWarnings = reports
    .filter((report) => report.metadataWarnings.length > 0)
    .slice(0, 80)
    .map((report) => `${report.path}: ${report.metadataWarnings.slice(0, 4).join("; ")}`);

  const document: GeneratedReportAuthorityDocument = {
    reportKey: "generated-report-authority",
    generatedAt: now,
    generatedAtUtc: now,
    sourceCommit: headCommit,
    currentHead: headCommit,
    currentHeadSource: toolchain.currentHeadSource,
    gitStatus: toolchain.gitStatus,
    sourceFileDiscovery: toolchain.sourceFileDiscovery,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    ...authorityCompleteness,
    baselineStatus: "not_required",
    ...cleanup,
    status: failures.length > 0 ? "fail" : "pass",
    evidenceClass: "source_snapshot",
    canClearSourceGate: failures.length === 0,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    nextExactSteps: [
      "Run npm run check:generated-report-authority after adding or changing generated report producers.",
      "Refresh owning reports through their validators; do not use source snapshots to clear runtime/provider/admin truth gates.",
    ],
    validationFailures: failures,
    doesNotProve: [
      "Does not prove runtime behavior.",
      "Does not prove provider smoke success.",
      "Does not prove current admin truth samples.",
    ],
    freshness: "fresh",
    reportFormat: "compact_summary",
    defaultStaleAfterHours: GENERATED_REPORT_DEFAULT_STALE_HOURS,
    summary,
    reports: reports
      .filter((report) => report.freshness === "stale" || report.freshness === "unknown" || report.missingEmbeddedFields.length > 0)
      .slice(0, 80),
    targetReportAudits,
    runtimeViolations,
    doctrineOverrideViolations,
    guidance: [
      "Generated reports are evidence snapshots only and never runtime business truth.",
      "Reports older than 24 hours are stale unless a stricter or looser contract is explicitly added later.",
      "Runtime src/app, src/components, and src/lib/server business logic must not import or read agent-generated report artifacts.",
    ],
    failures,
    metadataWarnings,
  };

  writeJsonFile(GENERATED_REPORT_AUTHORITY_STATE_PATH, document as unknown as Json);

  if (failures.length > 0) {
    console.error("Generated report authority validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Generated report authority validation passed.");
}

main();
