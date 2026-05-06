import { readFileSync } from "node:fs";

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
  const analyticsHistoricalValidation = readFileSync("src/lib/server/admin-analytics-historical-validation.ts", "utf8");
  const analyticsHistoricalRoute = readFileSync("src/app/api/admin/analytics/historical/route.ts", "utf8");
  assert(Array.isArray(report.domainScores) && report.domainScores.length === 7, "Telemetry parity report must include seven domain scores.");
  assert(!report.missingExpectedEvents.includes("identity_linked"), "identity_linked is missing from expected event coverage.");
  assert(!report.criticalFail, "Telemetry identified parity has a critical failure.");

  const actorTarget = report.domainScores.find((domain) => domain.key === "actor_target");
  const serverTruth = report.domainScores.find((domain) => domain.key === "server_truth");
  const identity = report.domainScores.find((domain) => domain.key === "identity_linking");
  assert(actorTarget?.score === actorTarget?.weight, "Actor/target separation is incomplete.");
  assert(serverTruth?.score === serverTruth?.weight, "Server truth priority is incomplete.");
  assert(identity?.score === identity?.weight, "Identity linking is incomplete.");
  assert(analyticsHistoricalValidation.includes("eventSource"), "Telemetry parity validation must expose eventSource.");
  assert(analyticsHistoricalValidation.includes("sampleSource"), "Telemetry parity validation must expose sampleSource.");
  assert(analyticsHistoricalValidation.includes("required_sample_missing"), "Telemetry parity validation must block pass when authenticated events have no canonical samples.");
  assert(analyticsHistoricalRoute.includes("analytics_event_facts"), "Telemetry parity validation must read canonical samples from analytics_event_facts.");
  assert(analyticsHistoricalRoute.includes("analytics_rollups_daily.authenticatedEvents"), "Telemetry parity validation must identify the authenticated canonical event source.");

  console.log(`Telemetry identified parity validated: ${report.overallScore}/100`);
}

main();
