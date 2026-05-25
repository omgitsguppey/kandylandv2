import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const contract = read("src/lib/analytics/viewer-start-telemetry-contract.ts");
const watchRoute = read("src/app/api/viewer/watch-session/route.ts");
const catalog = read("src/lib/telemetry-catalog.ts");
const normalizer = read("src/lib/behavioral/normalize-event-fact.ts");
const report = read("agent/state/viewer-start-telemetry-repair.generated.json");

expect(contract.includes('CANONICAL_VIEWER_START_EVENT_NAME = "watch_session_started"'), "viewer start canonical event missing.");
expect(catalog.includes('eventName: "watch_session_started"'), "viewer start event missing from catalog.");
expect(normalizer.includes("watch_session_started"), "viewer start event missing from normalizer.");
expect(watchRoute.includes("transactionResult.accepted && parsedBody.sessionSequence === 1"), "viewer start can emit on skeleton/repeated flush instead of accepted first exposure.");
expect(watchRoute.includes("buildViewerStartTelemetryEvent"), "watch sessions can exist without viewer start policy.");
expect(watchRoute.includes(".catch(() => null)") || watchRoute.includes("ignored"), "telemetry failure can block viewer.");
expect(contract.includes("entitlement_state") && contract.includes("drop_id") && contract.includes("watch_session_id"), "viewer start lacks entitlement/drop/session identity.");
expect(report.includes('"sourcePatchApplied": true'), "viewer start repair report missing source patch confirmation.");

if (failures.length) {
  console.error("viewer-start-telemetry-repair failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("viewer-start-telemetry-repair: pass");
