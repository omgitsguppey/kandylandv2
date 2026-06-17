import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type SourceStatus =
  | "checked_clean"
  | "source_ready"
  | "source_ready_missing_generated_artifact"
  | "missing"
  | "empty_without_source"
  | "stale"
  | "failed";

export type DebugRuntimeValidatorResult = {
  command: string;
  status: "pass" | "stale_snapshot" | "missing_expected";
  artifactPath: string;
  detail?: string;
};

export type DebugRuntimeEvidenceReport = {
  generatedAtUtc: string;
  reportKey: "debug-runtime-evidence";
  currentHead: string;
  sourceCommit: string;
  status: "source_ready_debug_runtime_evidence" | "partial_debug_runtime_evidence" | "failed";
  passed: boolean;
  debugPanelSourceSnapshotStatus: SourceStatus;
  routeDiagnosticsStatus: SourceStatus;
  runtimeWarningStoreStatus: SourceStatus;
  telemetryAdminDebugTruthStatus: SourceStatus;
  adminDebugControlTowerStatus: SourceStatus;
  precatchRuntimeIssueScanStatus: SourceStatus;
  errorDictionaryMappingStatus: SourceStatus;
  criticalRuntimeIssueCount: number;
  unresolvedWarningCount: number;
  unknownEvidenceCount: number;
  sourceBackedRuntimeConfidence: number;
  launchGateImpact: "does_not_clear_deployed_runtime_smoke";
  formalProviderSmokeCleared: false;
  deployedRuntimeSmokeCleared: false;
  formalEvidenceImpact: "source_debug_runtime_evidence_only";
  doesNotClear: string[];
  validatorResults: DebugRuntimeValidatorResult[];
  evidence: string[];
  nextAction: string;
  summary: {
    debugRuntimeEvidenceStatus: string;
    checkedSources: number;
    criticalRuntimeIssueCount: number;
    unresolvedWarningCount: number;
    unknownEvidenceCount: number;
    formalRuntimeSmokeStillRequired: boolean;
  };
};

type BuildInputs = Omit<DebugRuntimeEvidenceReport, "reportKey" | "sourceCommit" | "status" | "passed" | "launchGateImpact" | "formalProviderSmokeCleared" | "deployedRuntimeSmokeCleared" | "formalEvidenceImpact" | "doesNotClear" | "evidence" | "nextAction" | "summary">;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/debug-runtime-evidence.generated.json";
const DOC_PATH = "docs/agent-truth/debug-runtime-evidence.md";
const FORMAL_GATES_NOT_CLEARED = ["deployed_runtime_smoke", "provider_smoke", "manual_screenshot", "admin_truth_sample"];

function currentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function readJson(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, any>;
  } catch {
    return null;
  }
}

function readText(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function currentArtifact(relativePath: string, head: string) {
  const parsed = readJson(relativePath);
  if (!parsed) return false;
  return parsed.currentHead === head || parsed.sourceCommit === head;
}

function artifactStatus(relativePath: string, command: string, head: string): DebugRuntimeValidatorResult {
  if (!existsSync(join(ROOT, relativePath))) {
    return {
      command,
      status: "missing_expected",
      artifactPath: relativePath,
      detail: "Expected artifact is missing; run the owning local validator to refresh this source snapshot.",
    };
  }
  return currentArtifact(relativePath, head)
    ? { command, status: "pass", artifactPath: relativePath, detail: "Artifact is current for the latest code version." }
    : {
      command,
      status: "stale_snapshot",
      artifactPath: relativePath,
      detail: "Artifact is a stale source snapshot; rerun the owning local validator before using it as current evidence.",
    };
}

function countCheckedSources(inputs: BuildInputs) {
  return [
    inputs.debugPanelSourceSnapshotStatus,
    inputs.routeDiagnosticsStatus,
    inputs.runtimeWarningStoreStatus,
    inputs.telemetryAdminDebugTruthStatus,
    inputs.adminDebugControlTowerStatus,
    inputs.precatchRuntimeIssueScanStatus,
    inputs.errorDictionaryMappingStatus,
  ].filter((status) => ["checked_clean", "source_ready", "source_ready_missing_generated_artifact"].includes(status)).length;
}

export function buildDebugRuntimeEvidenceReport(inputs: BuildInputs): DebugRuntimeEvidenceReport {
  const checkedSources = countCheckedSources(inputs);
  const hasCritical = inputs.criticalRuntimeIssueCount > 0;
  const passed = checkedSources > 0
    && inputs.runtimeWarningStoreStatus !== "empty_without_source"
    && inputs.validatorResults.length > 0
    && inputs.validatorResults.every((result) => result.status === "pass")
    && !hasCritical;
  const status = passed
    ? "source_ready_debug_runtime_evidence"
    : checkedSources > 0
      ? "partial_debug_runtime_evidence"
      : "failed";
  const evidence = [
    `debugPanelSourceSnapshotStatus=${inputs.debugPanelSourceSnapshotStatus}`,
    `routeDiagnosticsStatus=${inputs.routeDiagnosticsStatus}`,
    `runtimeWarningStoreStatus=${inputs.runtimeWarningStoreStatus}`,
    `telemetryAdminDebugTruthStatus=${inputs.telemetryAdminDebugTruthStatus}`,
    `adminDebugControlTowerStatus=${inputs.adminDebugControlTowerStatus}`,
    `precatchRuntimeIssueScanStatus=${inputs.precatchRuntimeIssueScanStatus}`,
    `errorDictionaryMappingStatus=${inputs.errorDictionaryMappingStatus}`,
    `criticalRuntimeIssueCount=${inputs.criticalRuntimeIssueCount}`,
    `unresolvedWarningCount=${inputs.unresolvedWarningCount}`,
    `unknownEvidenceCount=${inputs.unknownEvidenceCount}`,
    `sourceBackedRuntimeConfidence=${inputs.sourceBackedRuntimeConfidence}`,
    "launchGateImpact=does_not_clear_deployed_runtime_smoke",
    "formalProviderSmokeCleared=false",
    "deployedRuntimeSmokeCleared=false",
  ];

  return {
    ...inputs,
    reportKey: "debug-runtime-evidence",
    sourceCommit: inputs.currentHead,
    status,
    passed,
    launchGateImpact: "does_not_clear_deployed_runtime_smoke",
    formalProviderSmokeCleared: false,
    deployedRuntimeSmokeCleared: false,
    formalEvidenceImpact: "source_debug_runtime_evidence_only",
    doesNotClear: FORMAL_GATES_NOT_CLEARED,
    evidence,
    nextAction: "Use this as source-backed debug/runtime evidence only; attach deployed runtime smoke before clearing runtime gates.",
    summary: {
      debugRuntimeEvidenceStatus: status,
      checkedSources,
      criticalRuntimeIssueCount: inputs.criticalRuntimeIssueCount,
      unresolvedWarningCount: inputs.unresolvedWarningCount,
      unknownEvidenceCount: inputs.unknownEvidenceCount,
      formalRuntimeSmokeStillRequired: true,
    },
  };
}

export function validateDebugRuntimeEvidenceReport(report: DebugRuntimeEvidenceReport) {
  const failures: string[] = [];
  if (report.reportKey !== "debug-runtime-evidence") failures.push("reportKey must be debug-runtime-evidence.");
  if (!report.currentHead || report.sourceCommit !== report.currentHead) failures.push("artifact must be tied to the latest code version.");
  if (report.launchGateImpact !== "does_not_clear_deployed_runtime_smoke") failures.push("debug runtime evidence must not clear deployed runtime smoke.");
  if (report.formalProviderSmokeCleared !== false) failures.push("debug runtime evidence must not clear provider smoke.");
  if (report.deployedRuntimeSmokeCleared !== false) failures.push("debug runtime evidence must not clear deployed runtime smoke.");
  if (!report.doesNotClear.includes("deployed_runtime_smoke")) failures.push("doesNotClear must include deployed_runtime_smoke.");
  if (!report.doesNotClear.includes("provider_smoke")) failures.push("doesNotClear must include provider_smoke.");
  if (report.runtimeWarningStoreStatus === "empty_without_source") failures.push("debug/runtime evidence is empty without checked source backing.");
  if (!Array.isArray(report.validatorResults) || report.validatorResults.length === 0) failures.push("debug runtime evidence has no validator results.");
  if (report.passed && report.validatorResults.some((result) => result.status !== "pass")) {
    failures.push("debug runtime evidence cannot pass with stale or missing validator snapshots.");
  }
  if (report.status === "source_ready_debug_runtime_evidence" && report.validatorResults.some((result) => result.status !== "pass")) {
    failures.push("source-ready debug runtime evidence requires current validator snapshots.");
  }
  if (report.criticalRuntimeIssueCount > 0 && report.passed) failures.push("critical runtime issues cannot pass debug runtime evidence.");
  if (report.status === "source_ready_debug_runtime_evidence" && report.summary.checkedSources === 0) failures.push("source-ready debug evidence needs checked sources.");
  return failures;
}

function statusFromArtifact(relativePath: string, head: string): SourceStatus {
  if (!existsSync(join(ROOT, relativePath))) return "missing";
  return currentArtifact(relativePath, head) ? "checked_clean" : "stale";
}

function sourceFileStatus(relativePath: string, expectedTokens: string[]): SourceStatus {
  const source = readText(relativePath);
  if (!source) return "missing";
  return expectedTokens.every((token) => source.includes(token)) ? "source_ready" : "failed";
}

function buildFromRepo(head: string) {
  const betaScore = readJson("agent/state/public-beta-score.generated.json");
  const telemetryAdmin = readJson("agent/state/telemetry-admin-debug-truth.generated.json");
  const telemetrySummary = telemetryAdmin?.summary ?? {};
  const sourceRuntime = readJson("agent/state/source-backed-runtime-confidence.generated.json");
  const evidenceCaps = Array.isArray(betaScore?.evidenceCapsApplied) ? betaScore.evidenceCapsApplied : [];
  const unknownEvidenceCount = evidenceCaps.filter((entry: string) => /Unknown evidence/iu.test(String(entry))).length;
  const unresolvedWarningCount = Number(telemetrySummary.runtimeUnproven ?? 0)
    + Number(telemetrySummary.unavailable ?? 0)
    + Number(telemetrySummary.configMissing ?? 0);

  return buildDebugRuntimeEvidenceReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    debugPanelSourceSnapshotStatus: statusFromArtifact("agent/state/debug-panel-output-triage.generated.json", head),
    routeDiagnosticsStatus: sourceFileStatus("src/lib/server/route-diagnostics.ts", ["RouteDiagnosticInput", "recordRouteDiagnostic"]),
    runtimeWarningStoreStatus: sourceFileStatus("src/lib/debug-evidence-contract.ts", ["runtimeWarnings", "DebugEvidenceAuditSummary"]),
    telemetryAdminDebugTruthStatus: statusFromArtifact("agent/state/telemetry-admin-debug-truth.generated.json", head),
    adminDebugControlTowerStatus: sourceFileStatus("src/lib/admin-debug-control-tower.ts", ["buildAdminDebugControlTowerModel", "truthState"]),
    precatchRuntimeIssueScanStatus: existsSync(join(ROOT, "scripts/agent/precatch-runtime-issues.ts")) ? "source_ready" : "missing",
    errorDictionaryMappingStatus: sourceFileStatus("src/lib/errors/error-dictionary.ts", ["HumanError", "internal"]),
    criticalRuntimeIssueCount: Number(telemetrySummary.p0Count ?? 0),
    unresolvedWarningCount,
    unknownEvidenceCount,
    sourceBackedRuntimeConfidence: Number(sourceRuntime?.runtimeConfidenceScore ?? 0),
    validatorResults: [
      artifactStatus("agent/state/debug-panel-output-triage.generated.json", "npm run check:debug-panel-output-triage", head),
      artifactStatus("agent/state/telemetry-admin-debug-truth.generated.json", "npm run check:telemetry-admin-debug-truth", head),
    ],
  });
}

function renderDoc(report: DebugRuntimeEvidenceReport) {
  const validators = report.validatorResults
    .map((result) => `| ${result.command} | ${result.status} | ${result.artifactPath} | ${result.detail ?? ""} |`)
    .join("\n");
  return `# Debug Runtime Evidence

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Status: \`${report.status}\`
- Passed: ${report.passed}
- Checked sources: ${report.summary.checkedSources}
- Critical runtime issues: ${report.criticalRuntimeIssueCount}
- Unresolved warnings: ${report.unresolvedWarningCount}
- Unknown evidence count: ${report.unknownEvidenceCount}
- Source-backed runtime confidence: ${report.sourceBackedRuntimeConfidence}
- Launch gate impact: \`${report.launchGateImpact}\`

## Source Status

- Debug panel source snapshot: ${report.debugPanelSourceSnapshotStatus}
- Route diagnostics: ${report.routeDiagnosticsStatus}
- Runtime warning store: ${report.runtimeWarningStoreStatus}
- Telemetry admin debug truth: ${report.telemetryAdminDebugTruthStatus}
- Admin Debug Control Tower: ${report.adminDebugControlTowerStatus}
- Pre-catch runtime issue scan: ${report.precatchRuntimeIssueScanStatus}
- Error dictionary mapping: ${report.errorDictionaryMappingStatus}

## Validators

| Command | Status | Artifact | Detail |
| --- | --- | --- | --- |
${validators}

## Evidence Boundary

This is source-backed debug/runtime evidence. It does not clear deployed runtime smoke, provider smoke, manual screenshot evidence, or admin truth sample evidence.
`;
}

function main() {
  const head = currentHead();
  const report = buildFromRepo(head);
  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report), "utf8");

  const failures = validateDebugRuntimeEvidenceReport(report);
  if (failures.length > 0) {
    console.error("Debug runtime evidence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Debug runtime evidence passed: status=${report.status} warnings=${report.unresolvedWarningCount}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
