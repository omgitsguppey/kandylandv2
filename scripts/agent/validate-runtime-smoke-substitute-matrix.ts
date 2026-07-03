import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildRuntimeSmokeSubstituteMatrix,
  validateRuntimeSmokeSubstituteMatrix,
  type RuntimeSmokeSubstituteInput,
  type RuntimeSmokeSubstituteMatrixReport,
} from "../../src/lib/runtime/runtime-smoke-substitute-matrix";

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/runtime-smoke-substitute-matrix.generated.json";
const DOC_PATH = "docs/agent-truth/runtime-smoke-substitute-matrix.md";

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): Record<string, unknown> | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function evidenceNumber(parsed: Record<string, unknown> | null, key: string) {
  const evidence = Array.isArray(parsed?.evidence) ? parsed.evidence : [];
  for (const entry of evidence) {
    const match = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}=(\\d+(?:\\.\\d+)?)$`, "u").exec(String(entry));
    if (match) return Number(match[1]);
  }
  return undefined;
}

function readTelemetryClosure(): RuntimeSmokeSubstituteInput["telemetryClosure"] {
  const parsed = readJson("agent/state/final-telemetry-closure-lock.generated.json");
  const entries = Array.isArray(parsed?.laneStatus) ? parsed.laneStatus : [];
  const lanes = Object.fromEntries(entries.map((entry) => {
    const lane = record(entry);
    return [String(lane.id), String(lane.status ?? "missing")];
  }));
  return { lanes };
}

function readDebugRuntimeEvidence(): RuntimeSmokeSubstituteInput["debugRuntimeEvidence"] {
  const parsed = readJson("agent/state/debug-runtime-evidence.generated.json");
  return {
    status: stringValue(parsed?.status),
    sourceBackedRuntimeConfidence: numberValue(parsed?.sourceBackedRuntimeConfidence),
    deployedRuntimeSmokeCleared: booleanValue(parsed?.deployedRuntimeSmokeCleared),
  };
}

function readSourceBackedRuntimeConfidence(): RuntimeSmokeSubstituteInput["sourceBackedRuntimeConfidence"] {
  const parsed = readJson("agent/state/source-backed-runtime-confidence.generated.json");
  return {
    status: stringValue(parsed?.status),
    runtimeConfidenceScore: numberValue(parsed?.runtimeConfidenceScore),
    deployedSmokePresent: booleanValue(parsed?.deployedSmokePresent),
  };
}

function readRealUsageConfidenceCalibration(): RuntimeSmokeSubstituteInput["realUsageConfidenceCalibration"] {
  const parsed = readJson("agent/state/real-usage-confidence-calibration.generated.json");
  const formalGateImpact = record(parsed?.formalGateImpact);
  return {
    status: stringValue(parsed?.status),
    runtimeHealthCredit: numberValue(parsed?.runtimeHealthCredit),
    verifiedByActivity: evidenceNumber(parsed, "activityVerification.verifiedByActivity"),
    formalGateImpact: {
      clearsDeployedRuntime: booleanValue(formalGateImpact.clearsDeployedRuntime),
      clearsFormalProvider: booleanValue(formalGateImpact.clearsFormalProvider),
    },
  };
}

function readRealUsageConfidence(): RuntimeSmokeSubstituteInput["realUsageConfidence"] {
  const parsed = readJson("agent/state/real-usage-confidence.generated.json");
  return {
    status: stringValue(parsed?.status),
    confidenceScore: numberValue(parsed?.confidenceScore),
    observedSignals: numberValue(parsed?.observedSignals),
  };
}

function readBehaviorMath(): RuntimeSmokeSubstituteInput["behaviorMath"] {
  const parsed = readJson("agent/state/behavior-math-verification.generated.json");
  return {
    status: stringValue(parsed?.status) ?? stringValue(parsed?.overallStatus),
    overallScore: numberValue(parsed?.overallScore),
  };
}

function readAdminTruthSample(): RuntimeSmokeSubstituteInput["adminTruthSample"] {
  const parsed = readJson("agent/state/admin-truth-source-sample.generated.json");
  return {
    status: stringValue(parsed?.status) ?? stringValue(parsed?.overallStatus),
    passed: booleanValue(parsed?.passed),
  };
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function scoreIntegrationPresent() {
  const core = readFileSync(join(ROOT, "src/lib/agent-score/core.ts"), "utf8");
  const scorer = readFileSync(join(ROOT, "scripts/agent/score-public-beta-readiness.ts"), "utf8");
  return core.includes("runtimeSmokeSubstituteMatrixEvidence")
    && core.includes("runtimeSmokeSubstituteMatrixCredit")
    && scorer.includes("RUNTIME_SMOKE_SUBSTITUTE_MATRIX_PATH");
}

function renderDoc(report: RuntimeSmokeSubstituteMatrixReport) {
  return [
    "# Runtime Smoke Substitute Matrix",
    "",
    "Status: source-only deployed route substitute matrix. It reduces optional checks to rows that cannot be truthfully sourced, but it does not clear deployed route evidence.",
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Runtime health credit: ${report.matrixRuntimeHealthCredit}`,
    `- Runtime/provider activity credit: ${report.matrixRuntimeProviderActivityCredit}`,
    `- Observed real-usage signals: ${report.realUsageObservedSignals}`,
    `- Evidence completeness credit: ${report.matrixEvidenceCompletenessCredit}`,
    `- Source-proven rows: ${report.currentProofSummary.sourceProvenRows}`,
    `- Telemetry-proven rows: ${report.currentProofSummary.telemetryProvenRows}`,
    `- Debug-proven rows: ${report.currentProofSummary.debugProvenRows}`,
    `- Deployed route evidence rows: ${report.currentProofSummary.formalRuntimeRequiredRows}`,
    `- Deployed runtime gate cleared: ${report.formalGateImpact.clearsDeployedRuntime}`,
    "",
    "## Rows",
    "",
    ...Object.values(report.rows).map((row) =>
      `- ${row.id}: proof=${row.currentProofLevel}; types=${row.proofTypes.join(",")}; formalRuntime=${row.requiresFormalRuntime}; score=${row.scoreImpactEstimate}; next=${row.nextAction}`),
    "",
    "## Evidence Lanes",
    "",
    "- Deployed route evidence remains required.",
    "- Provider-backed site activity remains separate.",
    "- Visual/device evidence is optional diagnostic unless a source row requests it.",
    "",
    "## Next Action",
    "",
    report.nextAction,
    "",
  ].join("\n");
}

const head = git(["rev-parse", "HEAD"]);
const report = buildRuntimeSmokeSubstituteMatrix({
  currentHead: head,
  generatedAtUtc: new Date().toISOString(),
  debugRuntimeEvidence: readDebugRuntimeEvidence(),
  sourceBackedRuntimeConfidence: readSourceBackedRuntimeConfidence(),
  realUsageConfidence: readRealUsageConfidence(),
  realUsageConfidenceCalibration: readRealUsageConfidenceCalibration(),
  behaviorMath: readBehaviorMath(),
  adminTruthSample: readAdminTruthSample(),
  telemetryClosure: readTelemetryClosure(),
});
const failures = validateRuntimeSmokeSubstituteMatrix(report);
if (!scoreIntegrationPresent()) {
  failures.push("score report ignores runtime smoke substitute matrix.");
}

const output = { ...report, validationFailures: failures };
write(ARTIFACT_PATH, `${JSON.stringify(output, null, 2)}\n`);
write(DOC_PATH, renderDoc(output));

if (failures.length > 0) {
  console.error(`Runtime smoke substitute matrix failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Runtime smoke substitute matrix OK: sourceMatrixCredit=${report.matrixRuntimeHealthCredit}, runtimeProviderActivityCredit=${report.matrixRuntimeProviderActivityCredit}, formalRuntimeRows=${report.currentProofSummary.formalRuntimeRequiredRows}.`,
);
