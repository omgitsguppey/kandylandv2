import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const helper = read("src/lib/analytics/watch-session-fact-linker.ts");
const test = read("tests/unit/watch-session-fact-link-repair.spec.ts");
const report = read("agent/state/watch-session-fact-link-repair.generated.json");

expect(helper.includes("classifyWatchSessionFactLinks"), "watch sessions and session facts cannot link.");
expect(helper.includes("watch_session_fact_link_missing"), "missing link hidden.");
expect(helper.includes("exactCapturePromotedFromReplay: false"), "replay-recovered sessions marked exact.");
expect(helper.includes("duplicateWatchSessionIds"), "duplicate watch sessions possible.");
expect(test.includes("replayRecoveredSessionIds"), "replay recovery link behavior lacks test coverage.");
expect(report.includes('"missingLinkReason": "watch_session_fact_link_missing"'), "link repair report missing reason.");

if (failures.length) {
  console.error("watch-session-fact-link-repair failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("watch-session-fact-link-repair: pass");
