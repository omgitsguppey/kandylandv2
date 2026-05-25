import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const validation = read("src/lib/server/admin-analytics-historical-validation.ts");
const test = read("tests/unit/unlock-watch-validation-semantics.spec.ts");
const report = read("agent/state/unlock-watch-validation-semantics.generated.json");

expect(validation.includes("classifyUnlockTelemetryCoverage") && validation.includes("required_sample_missing"), "unlock telemetry 0 can pass with unlock transactions.");
expect(validation.includes("classifyViewerStartCoverage") && validation.includes("viewer_start_missing"), "viewer start 0 can pass with watch sessions.");
expect(validation.includes("classifyWatchCaptureQuality") && validation.includes("replay_recovery_rate_high"), "high replay recovery count hidden.");
expect(validation.includes("unlockWatchParity.unlockAccessTruth.technicalEvidence"), "unlock transaction/rollup mismatch lacks reason.");
expect(test.includes("passAllowed: false"), "passAllowed true while blockers exist.");
expect(report.includes('"status": "fail"'), "validation semantics report missing fail state.");

if (failures.length) {
  console.error("unlock-watch-validation-semantics failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("unlock-watch-validation-semantics: pass");
