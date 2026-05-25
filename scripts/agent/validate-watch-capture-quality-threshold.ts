import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const helper = read("src/lib/analytics/watch-capture-quality-contract.ts");
const validation = read("src/lib/server/admin-analytics-historical-validation.ts");
const watchSession = read("src/lib/viewer-watch-session.ts");
const report = read("agent/state/watch-capture-quality-threshold.generated.json");

expect(helper.includes("replayRecoveryRate > 25") && helper.includes("replayRecoveryRate > 10"), "replay recovery thresholds missing.");
expect(helper.includes("replay_recovery_rate_high"), "67.5% replay recovery can pass.");
expect(validation.includes("replayRecoveryRate"), "replay recovery hidden as healthy.");
expect(watchSession.includes("totalVisibleSeconds") && watchSession.includes("idleDurationSeconds"), "watch time can use page-open time.");
expect(helper.includes("missingCloseoutRate"), "closeout missing not tracked.");
expect(report.includes('"replayRecoveryRate": 67.5') && report.includes('"state": "fail"'), "watch capture report does not fail current replay recovery rate.");

if (failures.length) {
  console.error("watch-capture-quality-threshold failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("watch-capture-quality-threshold: pass");
