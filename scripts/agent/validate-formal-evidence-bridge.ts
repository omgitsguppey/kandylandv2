import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFormalEvidenceBridgeReport,
  validateFormalEvidenceBridgeReport,
  type FormalEvidenceBridgeArtifact,
  type FormalEvidenceBridgeReport,
  type FormalEvidenceBridgeScoreDimensions,
} from "../../src/lib/agent-score/formal-evidence-bridge";

type JsonRecord = Record<string, unknown>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/formal-evidence-bridge.generated.json";
const DOC_PATH = "docs/agent-truth/formal-evidence-bridge.md";

function shell(command: string, args: string[], root = ROOT) {
  try {
    return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): JsonRecord | null {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function readHeadJson(path: string): JsonRecord | null {
  const raw = shell("git", ["show", `HEAD:${path}`]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function boolValue(value: unknown) {
  return value === true;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function evidenceFromRecord(value: JsonRecord | null): string[] {
  if (!value) return [];
  const explicit = Array.isArray(value.evidence) ? value.evidence.filter((entry): entry is string => typeof entry === "string") : [];
  const summary = record(value.summary);
  const summaryEvidence = Object.entries(summary).map(([key, entry]) => `${key}=${String(entry)}`);
  return [...explicit, ...summaryEvidence];
}

function artifact(path: string, fallbackStatus: string, fallbackDetail: string): FormalEvidenceBridgeArtifact | undefined {
  const parsed = readJson(path);
  if (!parsed) return undefined;
  const summary = record(parsed.summary);
  const providerSmoke = record(parsed.providerSmoke);
  const readinessImpact = record(parsed.readinessImpact);
  const status = stringValue(parsed.status)
    ?? stringValue(parsed.overallStatus)
    ?? stringValue(summary.revenueSmokeStatus)
    ?? stringValue(providerSmoke.status)
    ?? fallbackStatus;
  const passed = boolValue(parsed.passed)
    || boolValue(providerSmoke.passed)
    || boolValue(readinessImpact.providerSmokeGatePassed)
    || (status.includes("source_ready") && status !== "missing_formal_evidence");
  return {
    path,
    status,
    passed,
    detail: stringValue(parsed.detail)
      ?? stringValue(parsed.plainLanguageNote)
      ?? stringValue(summary.nextAction)
      ?? fallbackDetail,
    evidence: evidenceFromRecord(parsed),
    generatedAtUtc: stringValue(parsed.generatedAtUtc),
    currentHead: stringValue(parsed.currentHead),
    sourceCommit: stringValue(parsed.sourceCommit),
  };
}

function scoreDimensionsFromHead(): FormalEvidenceBridgeScoreDimensions {
  const beta = readHeadJson("agent/state/public-beta-score.generated.json") ?? readJson("agent/state/public-beta-score.generated.json");
  const dimensions = record(beta?.scoreDimensions);
  return {
    sourceHealth: numberValue(dimensions.sourceHealth, numberValue(beta?.sourceHealthScore)),
    runtimeHealth: numberValue(dimensions.runtimeHealth, numberValue(beta?.runtimeHealthScore)),
    evidenceCompleteness: numberValue(dimensions.evidenceCompleteness, numberValue(beta?.evidenceCompletenessScore)),
    freshness: numberValue(dimensions.freshness, numberValue(beta?.freshnessScore)),
    costRisk: numberValue(dimensions.costRisk, numberValue(beta?.costRiskScore)),
    regressionRisk: numberValue(dimensions.regressionRisk, numberValue(beta?.regressionRiskScore)),
    overallHealthScore: numberValue(dimensions.overallHealthScore, numberValue(beta?.healthScore)),
  };
}

function renderDoc(report: FormalEvidenceBridgeReport) {
  const gateRows = Object.entries(report.gates)
    .map(([gate, value]) => `| ${gate} | ${value.status} | ${value.evidenceCredit} | ${value.runtimeCredit} | ${value.formalGateCleared} | ${value.nextAction} |`)
    .join("\n");
  const scoreRows = Object.entries(report.scoreAfter)
    .map(([dimension, after]) => `| ${dimension} | ${report.scoreBefore[dimension as keyof FormalEvidenceBridgeScoreDimensions]} | ${after} |`)
    .join("\n");
  return `# Source Evidence Bridge

Generated: ${report.generatedAtUtc}

Current head: ${report.currentHead}

## Summary

- Provider-backed site activity lane cleared: ${report.formalGateStatus.providerSmoke.cleared}
- Deployed route activity lane cleared: ${report.formalGateStatus.deployedRuntimeSmoke.cleared}
- Admin production sample gate cleared: ${report.formalGateStatus.adminProductionSample.cleared}
- Operator revenue signal: ${report.operatorSignalStatus.status}
- Source gaps remaining: ${report.sourceGapsRemaining.join(", ") || "none"}

## Score Dimensions

| Dimension | Before | After |
| --- | ---: | ---: |
${scoreRows}

## Bridge Gates

| Gate | Status | Evidence credit | Runtime credit | Formal cleared | Next action |
| --- | --- | ---: | ---: | --- | --- |
${gateRows}

## Boundary

The bridge gives partial score/reporting credit for source-backed, operator-confirmed, admin-source, debug, and runtime-substitute evidence. It does not clear provider-backed site activity, deployed route activity, or admin source activity lanes without matching source records.

## Next Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function main() {
  const head = shell("git", ["rev-parse", "HEAD"]);
  const report = buildFormalEvidenceBridgeReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    scoreBefore: scoreDimensionsFromHead(),
    artifacts: {
      providerSmoke: artifact("agent/state/provider-smoke-evidence.generated.json", "missing_formal_evidence", "Formal provider smoke evidence is missing."),
      runtimeSmoke: artifact("agent/state/runtime-smoke-evidence.generated.json", "runtime_unverified", "Formal deployed runtime smoke evidence is missing."),
      adminSourceSample: artifact("agent/state/admin-truth-sample-evidence.generated.json", "missing_or_unknown", "Formal admin truth sample evidence is missing."),
      operatorRevenueSmoke: artifact("agent/state/operator-revenue-smoke.generated.json", "operator_confirmed_revenue_smoke", "Operator revenue signal is partial only."),
      sourceBackedRuntimeConfidence: artifact("agent/state/source-backed-runtime-confidence.generated.json", "missing_or_unknown", "Source-backed runtime confidence is missing."),
      realUsageConfidence: artifact("agent/state/real-usage-confidence.generated.json", "missing_or_unknown", "Real usage confidence is missing."),
      realUsageConfidenceCalibration: artifact("agent/state/real-usage-confidence-calibration.generated.json", "missing_or_unknown", "Real usage confidence calibration is missing."),
      runtimeSubstituteMatrix: artifact("agent/state/runtime-smoke-substitute-matrix.generated.json", "missing_or_unknown", "Runtime smoke substitute matrix is missing."),
      debugRuntimeEvidence: artifact("agent/state/debug-runtime-evidence.generated.json", "missing_or_unknown", "Debug runtime source evidence is missing."),
    },
  });
  const failures = validateFormalEvidenceBridgeReport(report);
  report.validationFailures = Array.from(new Set([...report.validationFailures, ...failures]));
  mkdirSync(join(ROOT, dirname(REPORT_PATH)), { recursive: true });
  mkdirSync(join(ROOT, dirname(DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, REPORT_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error("Formal evidence bridge validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Formal evidence bridge passed. evidence ${report.scoreBefore.evidenceCompleteness} -> ${report.scoreAfter.evidenceCompleteness}; runtime ${report.scoreBefore.runtimeHealth} -> ${report.scoreAfter.runtimeHealth}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
