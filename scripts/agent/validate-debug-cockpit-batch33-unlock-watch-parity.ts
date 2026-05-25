import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const report = JSON.parse(read("agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json") || "{}");

expect(report.unlockTelemetryCountAfter >= 0 && report.serverUnlockTelemetryStatus === "source_ready_future_events", "unlock transactions exist but server unlock telemetry path missing.");
expect(report.unlockTelemetryCountAfter >= 0 && report.remainingGaps?.length > 0, "unlock telemetry count remains 0 without explicit blocker.");
expect(report.unlockMismatchReasonAfter && report.unlockMismatchReasonAfter !== "unknown", "unlock transaction/rollup mismatch lacks reason.");
expect(report.viewerStartStatus === "source_ready_future_events_with_historical_gap", "viewer start remains 0 without instrumentation gap.");
expect(report.watchCaptureStatusAfter === "fail", "replay recovery rate over threshold can pass.");
expect(report.watchTimeUsesPageOpenTime === false, "watch time can use page-open time.");
expect(report.contentProtectionChanged === false, "content protection/access rules changed.");
expect(report.gumdropMathChanged === false, "GumDrop math changed.");
expect(Array.isArray(report.scoreDimensions) && report.scoreDimensions.length >= 5, "score dimensions missing.");
expect(Array.isArray(report.dirtyClassifications) && report.dirtyClassifications.every((entry: { classification: string }) => entry.classification !== "unsafe_unknown"), "dirty files unclassified.");
expect(Array.isArray(report.openPrClassifications) && report.openPrClassifications.length === 0, "open PRs unclassified.");

if (failures.length) {
  console.error("debug-cockpit-batch33-unlock-watch-parity failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("debug-cockpit-batch33-unlock-watch-parity: pass");
