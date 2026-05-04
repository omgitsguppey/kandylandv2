import { fileExists, getPackageScripts, readJsonFile } from "./shared";
import type { TelemetryIdentifiedParityReport } from "./score-telemetry-identified-parity";

const REPORT_PATH = "agent/state/telemetry-identified-parity.generated.json";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  assert(fileExists(REPORT_PATH), `Missing ${REPORT_PATH}. Run npm run score:telemetry-identified-parity first.`);
  const scripts = getPackageScripts("package.json");
  assert(scripts["score:telemetry-identified-parity"], "package.json is missing score:telemetry-identified-parity");
  assert(scripts["check:telemetry-identified-parity"], "package.json is missing check:telemetry-identified-parity");

  const report = readJsonFile<TelemetryIdentifiedParityReport>(REPORT_PATH);
  assert(Array.isArray(report.domainScores) && report.domainScores.length === 7, "Telemetry parity report must include seven domain scores.");
  assert(!report.missingExpectedEvents.includes("identity_linked"), "identity_linked is missing from expected event coverage.");
  assert(!report.criticalFail, "Telemetry identified parity has a critical failure.");

  const actorTarget = report.domainScores.find((domain) => domain.key === "actor_target");
  const serverTruth = report.domainScores.find((domain) => domain.key === "server_truth");
  const identity = report.domainScores.find((domain) => domain.key === "identity_linking");
  assert(actorTarget?.score === actorTarget?.weight, "Actor/target separation is incomplete.");
  assert(serverTruth?.score === serverTruth?.weight, "Server truth priority is incomplete.");
  assert(identity?.score === identity?.weight, "Identity linking is incomplete.");

  console.log(`Telemetry identified parity validated: ${report.overallScore}/100`);
}

main();
