import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  REQUIRED_TELEMETRY_TRIGGER_FAMILIES,
  buildTelemetryTriggerTestMatrixReport,
  classifyTelemetryTriggerTestDirtyFile,
  evaluateTelemetryTriggerTestMatrix,
  type TelemetryTriggerTestMatrixReport,
} from "@/lib/testing/telemetry-trigger-test-matrix";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/telemetry-trigger-test-matrix.generated.json";
const DOC_PATH = "docs/agent-truth/telemetry-trigger-test-matrix.md";
const VALIDATOR_PATH = "scripts/agent/validate-telemetry-trigger-test-matrix.ts";
const PACKAGE_SCRIPT = "check:telemetry-trigger-test-matrix";

type OldTestLogicClassification = TelemetryTriggerTestMatrixReport["oldTestLogicClassification"][number];

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(read(path)) as T;
  } catch {
    return null;
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function trackedFiles() {
  return run("git", ["ls-files", "tests", "scripts", "src", "agent", "docs"])
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function classifyOldTestLogic(): OldTestLogicClassification[] {
  return trackedFiles().flatMap<OldTestLogicClassification>((path) => {
    if (!existsSync(join(ROOT, path))) return [];
    if (!/^(scripts|tests)\//u.test(path)) return [];
    if (
      path === VALIDATOR_PATH
      || path === DOC_PATH
      || path === "tests/unit/telemetry-trigger-test-matrix.spec.ts"
      || path === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts"
      || path === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts"
      || path === "scripts/agent/validate-future-activity-signal-reclassification.ts"
      || path === "tests/unit/future-activity-signal-reclassification.spec.ts"
    ) return [];
    const source = read(path);
    const normalized = path.toLowerCase();
    if (/duplicate_validator|duplicate.*telemetry.*validator|stale.*telemetry.*validator/iu.test(source) && !normalized.includes("telemetry-trigger-test-matrix")) {
      return [{ path, classification: "duplicate_validator" as const }];
    }
    if (/stale_validator|obsolete.*telemetry.*validator/iu.test(source) && !normalized.includes("settings-debug-validator-authority")) {
      return [{ path, classification: "stale_validator" as const }];
    }
    if (/waiting on activity|source_ready_waiting_for_activity/iu.test(source) && /telemetry|metrics|activity|trigger/iu.test(path)) {
      return [{ path, classification: "source_only_validator" as const }];
    }
    return [];
  });
}

function validatorAuthorityPresent() {
  const authority = readJson<{
    validators?: Record<string, { packageScripts?: string[]; status?: string }>;
    packageScripts?: Record<string, { validators?: string[]; status?: string }>;
  }>("agent/context/validator-authority.json");
  return Boolean(
    authority?.validators?.[VALIDATOR_PATH]?.packageScripts?.includes(PACKAGE_SCRIPT)
    && authority?.packageScripts?.[PACKAGE_SCRIPT]?.validators?.includes(VALIDATOR_PATH),
  );
}

function packageScriptPresent() {
  const packageJson = readJson<{ scripts?: Record<string, string> }>("package.json");
  return packageJson?.scripts?.[PACKAGE_SCRIPT] === `tsx ${VALIDATOR_PATH}`;
}

function renderDoc(report: ReturnType<typeof buildTelemetryTriggerTestMatrixReport>) {
  const familyRows = Object.entries(report.coverageByFamily).map(([family, coverage]) =>
    `- ${family}: covered=${coverage.covered}; missing=${coverage.missingCoverageReason ?? "none"}`,
  );
  const triggerRows = report.rows.map((row) =>
    `- ${row.triggerId}: ${row.sourceSurface} -> ${row.eventName} -> ${row.expectedPersonMetric.metricId} -> ${row.expectedDebugLane} -> ${row.expectedScoreDimension}; status=${row.currentStatus}`,
  );
  const scoreRows = Object.entries(report.scoreImpactByDimension).map(([dimension, impact]) =>
    `- ${dimension}: before=${impact.before}; after=${impact.after}; ${impact.reason}`,
  );
  const oldRows = report.oldTestLogicClassification.map((entry) => `- ${entry.path}: ${entry.classification}`);
  const dirtyRows = report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`);
  return [
    "# Telemetry Trigger Test Matrix",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    "",
    "## Contract",
    "",
    "- Important triggers must have deterministic source-only tests from action/event producer through event envelope, feature activity, person metric hydration, debug lane, and score input.",
    "- These tests do not read production, mutate live or legacy data, fake runtime/provider proof, or clear formal provider/runtime/admin gates.",
    "- Future real activity can remain collecting, but deterministic source paths must not say waiting-on-activity when the bridge can be tested locally.",
    "",
    "## Debug Lane",
    "",
    `- Total triggers: ${report.debugLane.totalTriggers}`,
    `- Covered triggers: ${report.debugLane.coveredTriggers}`,
    `- Missing trigger tests: ${report.debugLane.missingTriggerTests}`,
    `- UI-only tests: ${report.debugLane.uiOnlyTests}`,
    `- Waiting-on-activity deterministic gaps: ${report.debugLane.waitingOnActivityDeterministicGaps}`,
    "",
    "## Family Coverage",
    "",
    ...familyRows,
    "",
    "## Trigger Rows",
    "",
    ...triggerRows,
    "",
    "## Score Impact",
    "",
    ...scoreRows,
    "",
    "## Old Test Logic Classification",
    "",
    ...(oldRows.length ? oldRows : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const dirty = changedFiles();
  const oldTestLogicClassification = classifyOldTestLogic();
  const report = buildTelemetryTriggerTestMatrixReport({
    generatedAtUtc,
    currentHead,
    dirtyFiles: dirty,
    oldTestLogicClassification,
  });
  const evaluations = evaluateTelemetryTriggerTestMatrix({ generatedAtUtc });
  const failures = [...report.validationFailures];

  for (const family of REQUIRED_TELEMETRY_TRIGGER_FAMILIES) {
    if (!report.coverageByFamily[family]?.covered) {
      failures.push(`${family} lacks important trigger test coverage.`);
    }
  }
  for (const entry of evaluations) {
    if (!entry.pathVerified) failures.push(`${entry.row.triggerId} does not prove UI/action to event/metric/debug/score path.`);
    if (entry.row.currentStatus === "ui_only_test") failures.push(`${entry.row.triggerId} only checks UI.`);
    if (entry.waitingOnActivity.scoreDrag) failures.push(`${entry.row.triggerId} still reports waiting-on-activity despite deterministic source path.`);
  }
  if (!packageScriptPresent()) failures.push("package script check:telemetry-trigger-test-matrix is missing.");
  if (!validatorAuthorityPresent()) failures.push("validator authority missing.");
  if (!read("src/lib/debug/debug-panel-tracking-summary.ts").includes("testing_coverage")) failures.push("debug panel lacks Testing coverage lane.");
  if (!read("scripts/agent/score-public-beta-readiness.ts").includes("source_ready_telemetry_trigger_test_matrix")) failures.push("score dimension impact missing telemetry trigger test matrix evidence.");
  if (oldTestLogicClassification.some((entry) => entry.classification === "duplicate_validator" || entry.classification === "stale_validator")) {
    failures.push("duplicate stale validator remains active.");
  }
  if (dirty.map((path) => classifyTelemetryTriggerTestDirtyFile(path)).includes("unsafe_unknown")) {
    failures.push("dirty files unclassified.");
  }
  if (!/^[0-9a-f]{40}$/iu.test(currentHead)) failures.push("current Git head is missing or is not a full commit SHA.");

  const output = {
    ...report,
    sourceCommit: currentHead,
    status: failures.length > 0 ? "fail" as const : "pass" as const,
    passed: failures.length === 0,
    canClearSourceGate: failures.length === 0,
    validation: {
      ...report.validation,
      duplicateStaleValidatorActive: oldTestLogicClassification.some((entry) => entry.classification === "duplicate_validator" || entry.classification === "stale_validator"),
      validatorAuthorityMissing: !validatorAuthorityPresent(),
    },
    validationFailures: [...new Set(failures)],
  };

  write(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  write(DOC_PATH, renderDoc(output));

  if (output.validationFailures.length > 0) {
    console.error(`Telemetry trigger test matrix validation failed:\n${output.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`Telemetry trigger test matrix validation passed: covered=${output.debugLane.coveredTriggers}/${output.debugLane.totalTriggers}, missing=${output.debugLane.missingTriggerTests}, waitingGaps=${output.debugLane.waitingOnActivityDeterministicGaps}.`);
}

main();
