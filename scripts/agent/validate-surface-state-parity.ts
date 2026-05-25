import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import {
  SURFACE_STATE_IDS,
  validateSurfaceStateRegistry,
} from "@/lib/parity/surface-state-contract";
import {
  SURFACE_STATE_REGISTRY,
  buildSurfaceStateParityReport,
  classifyRawSurfaceStateCopy,
} from "@/lib/parity/surface-state-resolver";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/surface-state-parity.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/surface-state-parity.md");

const RAW_COPY_PATTERN = /Internal server error|Something went wrong|Oops|Uh oh|Loading\.\.\.|^Loading$|^Empty$|^No data$/gmu;
const SOURCE_SCAN_ROOTS = ["src/app", "src/components"];
const SOURCE_SCAN_EXCLUDE = /(?:^|\/)(api|__|%5F%5F)(?:\/|$)|\.test\.|\.spec\./u;

function commandOutput(command: string) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function dirtyFiles() {
  const tracked = commandOutput("git diff --name-only")
    .split(/\r?\n/u)
    .filter(Boolean);
  const untracked = commandOutput("git ls-files --others --exclude-standard")
    .split(/\r?\n/u)
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked])];
}

function trackedUiFiles() {
  return commandOutput(`git ls-files ${SOURCE_SCAN_ROOTS.join(" ")}`)
    .split(/\r?\n/u)
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter((entry) => entry && !SOURCE_SCAN_EXCLUDE.test(entry));
}

function scanRawStateCopy() {
  const findings: string[] = [];
  for (const file of trackedUiFiles()) {
    const fullPath = path.join(ROOT, file);
    if (!existsSync(fullPath)) continue;
    const source = readFileSync(fullPath, "utf8");
    for (const match of source.matchAll(RAW_COPY_PATTERN)) {
      const text = match[0];
      const classification = classifyRawSurfaceStateCopy(text);
      if (classification === "approved_surface_state_copy") continue;
      findings.push(`${file}: ${classification}: ${text}`);
    }
  }
  return findings;
}

function validateTelemetryNames() {
  return SURFACE_STATE_REGISTRY.flatMap((surface) =>
    Object.values(surface.states).flatMap((state) => {
      const failures: string[] = [];
      if (!state.telemetryEventName.startsWith(`${surface.surfaceId}_surface_`)) {
        failures.push(`${surface.surfaceId}.${state.state} telemetry does not use surface telemetry registry.`);
      }
      if ((state.state === "error" || state.state === "permission_denied" || state.state === "not_configured") && state.cta.action === "none") {
        failures.push(`${surface.surfaceId}.${state.state} lacks next action.`);
      }
      return failures;
    }),
  );
}

function buildMarkdown(report: ReturnType<typeof buildSurfaceStateParityReport>) {
  const rows = SURFACE_STATE_REGISTRY.map((surface) =>
    `| ${surface.surfaceId} | ${surface.featureId} | ${Object.keys(surface.states).length} | ${surface.states.error.telemetryEventName} | ${surface.states.error.cta.label} |`,
  ).join("\n");

  return `# Surface State Parity

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Major surfaces registered: ${report.majorSurfacesRegistered}
- State kinds: ${report.stateKinds.join(", ")}
- Production reads performed: ${report.productionReadsPerformed}
- Provider calls performed: ${report.providerCallsPerformed}

## Contract

Every major surface declares loading, empty, ready, degraded, error, permission-denied, not-configured, locked, unavailable, and stale states. Each state includes user copy, CTA, telemetry event, debug severity, retry policy, role visibility, and source truth.

| Surface | Feature | States | Error telemetry | Error CTA |
| --- | --- | ---: | --- | --- |
${rows}

## Debug Lane

The debug lane is **${report.debugLane.label}**.

- Raw error copy findings: ${report.debugLane.rawErrorCopyFindings.length}
- Endless loading risks: ${report.debugLane.endlessLoadingRisks.length}
- Missing CTA findings: ${report.debugLane.missingCtaFindings.length}

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`;
}

const generatedAtUtc = new Date().toISOString();
const currentHead = commandOutput("git rev-parse HEAD") || undefined;
const rawErrorCopyFindings = scanRawStateCopy();
const report = buildSurfaceStateParityReport({
  generatedAtUtc,
  currentHead,
  dirtyFiles: dirtyFiles(),
  rawErrorCopyFindings,
});

const failures = [
  ...report.validationFailures,
  ...validateSurfaceStateRegistry(SURFACE_STATE_REGISTRY),
  ...validateTelemetryNames(),
];

if (SURFACE_STATE_REGISTRY.length !== SURFACE_PARITY_REGISTRY.length) {
  failures.push("Surface state registry does not match surface parity registry size.");
}
for (const surface of SURFACE_STATE_REGISTRY) {
  if (Object.keys(surface.states).length !== SURFACE_STATE_IDS.length) {
    failures.push(`${surface.surfaceId} does not have the full state contract.`);
  }
}

const finalReport = {
  ...report,
  status: failures.length > 0 ? "fail" as const : "pass" as const,
  validationFailures: [...new Set(failures)],
};

mkdirSync(path.dirname(STATE_PATH), { recursive: true });
mkdirSync(path.dirname(DOC_PATH), { recursive: true });
writeFileSync(STATE_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
writeFileSync(DOC_PATH, buildMarkdown(finalReport));

if (finalReport.status !== "pass") {
  console.error(JSON.stringify(finalReport.validationFailures, null, 2));
  process.exit(1);
}

console.log(`surface state parity pass: ${finalReport.majorSurfacesRegistered} surfaces, ${finalReport.stateKinds.length} states`);
