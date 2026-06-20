import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildRealUsageConfidenceCalibration,
  validateRealUsageConfidenceCalibration,
  type RealUsageConfidenceCalibrationInput,
  type RealUsageConfidenceCalibrationReport,
} from "../../src/lib/analytics/real-usage-confidence-calibration";
import type { TelemetryLaneId } from "../../src/lib/analytics/telemetry-dependency-graph";

const ROOT = process.cwd();
const ARTIFACT_PATH = "agent/state/real-usage-confidence-calibration.generated.json";
const DOC_PATH = "docs/agent-truth/real-usage-confidence-calibration.md";

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

function readBehaviorMath(): RealUsageConfidenceCalibrationInput["behaviorMath"] {
  const parsed = readJson("agent/state/behavior-math-verification.generated.json");
  const report = record(parsed?.report);
  const summary = record(report.summary);
  const debugOutput = record(report.debugOutput);
  const recovery = record(parsed?.recovery);
  const recoverySummary = record(recovery.summary);
  return {
    overallScore: numberValue(parsed?.overallScore),
    summary: {
      disabledEventsExcluded: numberValue(summary.disabledEventsExcluded),
      legacyUnknownExcluded: numberValue(summary.legacyUnknownExcluded),
      duplicateEventsDeduped: numberValue(summary.duplicateEventsDeduped),
      linkedGuestEventsAttributedToUsers: numberValue(summary.linkedGuestEventsAttributedToUsers),
    },
    debugOutput: {
      perUserConfidence: record(debugOutput.perUserConfidence) as Record<string, string>,
      disabledTrackingHandling: stringValue(debugOutput.disabledTrackingHandling),
      legacyRecoveryReadiness: stringValue(debugOutput.legacyRecoveryReadiness),
      watchTimeTruth: stringValue(debugOutput.watchTimeTruth),
    },
    recovery: {
      startDate: stringValue(recovery.startDate),
      mode: stringValue(recovery.mode),
      readsProduction: booleanValue(recovery.readsProduction),
      mutationsAllowed: booleanValue(recovery.mutationsAllowed),
      summary: {
        exact: numberValue(recoverySummary.exact),
        probable: numberValue(recoverySummary.probable),
        weak: numberValue(recoverySummary.weak),
        unknown: numberValue(recoverySummary.unknown),
      },
    },
  };
}

function readRealUsageConfidence(): RealUsageConfidenceCalibrationInput["realUsageConfidence"] {
  const parsed = readJson("agent/state/real-usage-confidence.generated.json");
  const gateImpact = record(parsed?.formalGateImpact);
  const signalRecords = record(parsed?.signals);
  const signals = Object.fromEntries(Object.entries(signalRecords).map(([id, value]) => {
    const signal = record(value);
    return [id, {
      status: stringValue(signal.status),
      operatorConfirmed: booleanValue(signal.operatorConfirmed),
      confidenceContribution: numberValue(signal.confidenceContribution),
      sourcePath: stringValue(signal.sourcePath),
      telemetryLaneId: stringValue(signal.telemetryLaneId) as TelemetryLaneId | undefined,
      evidence: Array.isArray(signal.evidence) ? signal.evidence.map((entry) => String(entry)) : [],
    }];
  }));
  return {
    confidenceScore: numberValue(parsed?.confidenceScore),
    formalGateImpact: {
      clearsFormalProvider: booleanValue(gateImpact.clearsFormalProvider),
      clearsDeployedRuntime: booleanValue(gateImpact.clearsDeployedRuntime),
    },
    signals,
  };
}

function readOperatorRevenueSmoke(): RealUsageConfidenceCalibrationInput["operatorRevenueSmoke"] {
  const parsed = readJson("agent/state/operator-revenue-smoke.generated.json");
  const summary = record(parsed?.summary);
  return {
    amountUsdConfirmed: numberValue(summary.amountUsdConfirmed),
    confirmationSource: stringValue(summary.confirmationSource),
    formalProviderSmokePassed: booleanValue(summary.formalProviderSmokePassed),
    providerArtifactAttached: booleanValue(summary.providerArtifactAttached),
  };
}

function readTelemetryClosure(): RealUsageConfidenceCalibrationInput["telemetryClosure"] {
  const parsed = readJson("agent/state/final-telemetry-closure-lock.generated.json");
  const entries = Array.isArray(parsed?.laneStatus) ? parsed.laneStatus : [];
  const laneStatus = Object.fromEntries(entries.map((entry) => {
    const lane = record(entry);
    return [String(lane.id), String(lane.status ?? "missing")];
  })) as Partial<Record<TelemetryLaneId, string>>;
  return { laneStatus };
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function renderDoc(report: RealUsageConfidenceCalibrationReport) {
  return [
    "# Real Usage Confidence Calibration",
    "",
    "Status: source-only calibration for non-UI beta confidence. It does not read production data, mutate legacy records, call providers, or clear formal gates.",
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Calibrated confidence score: ${report.calibratedConfidenceScore}`,
    `- Runtime health credit: ${report.runtimeHealthCredit}`,
    `- Evidence completeness credit: ${report.evidenceCompletenessCredit}`,
    `- Operator-confirmed revenue context recognized: ${report.operatorConfirmedRevenueSmoke.recognized}`,
    `- Operator revenue source truth: ${report.operatorConfirmedRevenueSmoke.sourceTruth}`,
    `- Operator revenue source role: ${report.operatorConfirmedRevenueSmoke.sourceRole}`,
    `- Formal provider gate cleared: ${report.formalGateImpact.clearsFormalProvider}`,
    `- Deployed runtime gate cleared: ${report.formalGateImpact.clearsDeployedRuntime}`,
    "",
    "## Behavior Math Connection",
    "",
    `- Per-user confidence: ${report.behaviorMathConnection.perUserConfidence}`,
    `- Linked guest/user no double count: ${report.behaviorMathConnection.linkedGuestUserNoDoubleCount}`,
    `- Disabled tracking suppressed: ${report.behaviorMathConnection.disabledTrackingSuppressed}`,
    `- Unknown legacy excluded: ${report.behaviorMathConnection.unknownLegacyExcluded}`,
    `- March 1 recovery dry-run: ${report.behaviorMathConnection.legacyMarchFirstDryRun}`,
    `- Watch time source: ${report.behaviorMathConnection.watchTimeUsesRuntimeSource ? "watch_session_rollups_only" : "needs_review"}`,
    "",
    "## Per-Flow Confidence",
    "",
    ...Object.values(report.perFlowConfidence).map((flow) =>
      `- ${flow.flowId}: ${flow.confidenceClass}; score=${flow.confidenceScore}; observedCount=${flow.observedCount}; source=${flow.sourcePath}; next=${flow.nextAction}`),
    "",
    "## Limits",
    "",
    ...report.limitations.map((limit) => `- ${limit}`),
    "",
    "## Next Action",
    "",
    report.nextAction,
    "",
  ].join("\n");
}

const head = git(["rev-parse", "HEAD"]);
const report = buildRealUsageConfidenceCalibration({
  currentHead: head,
  generatedAtUtc: new Date().toISOString(),
  realUsageConfidence: readRealUsageConfidence(),
  behaviorMath: readBehaviorMath(),
  operatorRevenueSmoke: readOperatorRevenueSmoke(),
  telemetryClosure: readTelemetryClosure(),
});
const failures = validateRealUsageConfidenceCalibration(report);

write(ARTIFACT_PATH, `${JSON.stringify({ ...report, validationFailures: failures }, null, 2)}\n`);
write(DOC_PATH, renderDoc({ ...report, validationFailures: failures }));

if (failures.length > 0) {
  console.error(`Real usage confidence calibration failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Real usage confidence calibration OK: score=${report.calibratedConfidenceScore}, runtimeCredit=${report.runtimeHealthCredit}.`,
);
